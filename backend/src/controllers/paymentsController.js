// src/controllers/paymentsController.js
import { pool } from '../db.js';
import { asyncHandler } from '../middleware/error.js';
import { BadRequest } from '../utils/httpErrors.js';
import { createPayOrder, verifyWebhookSignature } from '../lib/payosClient.js';
import { bus } from '../utils/eventBus.js';

async function assertOrderExists(client, orderId) {
  const { rows } = await client.query(
    `SELECT id, trang_thai FROM don_hang WHERE id=$1`,
    [orderId]
  );
  if (rows.length === 0) {
    throw new BadRequest("Đơn hàng không tồn tại");
  }
  return rows[0];
}

/**
 * Helper: Đóng đơn hàng khi thanh toán đủ
 * Cập nhật ca_lam_id từ payment cuối để đơn tính vào ca của người thanh toán
 */
async function closeOrderIfPaid(client, orderId) {
  // Lấy settlement
  const settlementResult = await client.query(
    `SELECT * FROM v_order_settlement WHERE order_id = $1`,
    [orderId]
  );
  const settlement = settlementResult.rows[0];
  
  if (!settlement || settlement.amount_due > 0) {
    return false; // Chưa thanh toán đủ
  }
  
  // Lấy thông tin order
  const orderInfo = await client.query(
    `SELECT order_type, trang_thai FROM don_hang WHERE id = $1`,
    [orderId]
  );
  
  // Nếu đã PAID rồi thì không làm gì
  if (orderInfo.rows[0]?.trang_thai === 'PAID') {
    return true;
  }
  
  // Lấy ca_lam_id từ payment cuối cùng (người thanh toán)
  const lastPayment = await client.query(
    `SELECT ca_lam_id, method_code FROM order_payment 
     WHERE order_id = $1 AND ca_lam_id IS NOT NULL 
     ORDER BY id DESC LIMIT 1`,
    [orderId]
  );
  const payerShiftId = lastPayment.rows[0]?.ca_lam_id || null;
  const paymentMethod = lastPayment.rows[0]?.method_code || 'CASH';
  
  // ✅ TẠO payment_transaction TRƯỚC KHI đánh dấu PAID
  // Kiểm tra xem đã có payment_transaction chưa
  const existingTxn = await client.query(
    `SELECT id FROM payment_transaction WHERE order_id = $1`,
    [orderId]
  );
  
  if (existingTxn.rows.length === 0) {
    // Tạo payment_transaction nếu chưa có
    const refCode = `ORD${orderId}-${Date.now()}`;
    await client.query(
      `INSERT INTO payment_transaction (
        order_id, 
        payment_method_code, 
        ref_code, 
        amount, 
        status, 
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, 'PAID', NOW(), NOW())`,
      [orderId, paymentMethod, refCode, settlement.grand_total]
    );
  }
  
  // Đánh dấu đơn là PAID
  if (orderInfo.rows[0]?.order_type === 'DINE_IN') {
    await client.query(
      `UPDATE don_hang SET trang_thai = 'PAID', closed_at = NOW(), ca_lam_id = COALESCE($2, ca_lam_id) WHERE id = $1`,
      [orderId, payerShiftId]
    );
  } else {
    await client.query(
      `UPDATE don_hang SET trang_thai = 'PAID', ca_lam_id = COALESCE($2, ca_lam_id) WHERE id = $1`,
      [orderId, payerShiftId]
    );
  }
  
  return true;
}

class PaymentsController {
  // GET /api/v1/payments/methods
  listPaymentMethods = asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT code, name, active FROM payment_method WHERE active=TRUE ORDER BY name`
    );
    res.json({ success: true, data: rows });
  });

  // GET /api/v1/pos/orders/:orderId/payments
  listOrderPayments = asyncHandler(async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    
    // Get payments
    const { rows: payments } = await pool.query(
      `SELECT id, method_code, status, amount, amount_tendered, change_given, 
              currency, tx_ref, note, created_at, created_by
       FROM order_payment 
       WHERE order_id=$1 
       ORDER BY id`,
      [orderId]
    );
    
    // Get refunds for each payment
    for (const payment of payments) {
      const { rows: refunds } = await pool.query(
        `SELECT id, amount, reason, created_at, created_by
         FROM order_payment_refund
         WHERE payment_id=$1
         ORDER BY id`,
        [payment.id]
      );
      
      payment.refunds = refunds;
      payment.total_refunded = refunds.reduce((sum, r) => sum + (r.amount || 0), 0);
    }
    
    res.json({ success: true, data: payments });
  });

  // POST /api/v1/pos/orders/:orderId/payments
  createPayment = asyncHandler(async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const { 
      method_code, 
      amount, 
      amount_tendered, 
      tx_ref, 
      note, 
      created_by, 
      ca_lam_id 
    } = req.body || {};

    if (!method_code) {
      throw new BadRequest("Thiếu method_code");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      await assertOrderExists(client, orderId);

      // Lấy amount_due
      const { rows: dueR } = await client.query(
        `SELECT amount_due, grand_total FROM v_order_settlement WHERE order_id=$1`,
        [orderId]
      );
      const amount_due = dueR[0]?.amount_due ?? 0;

      // Validation cho non-cash
      if (method_code !== 'CASH') {
        if (amount == null || amount <= 0) {
          throw new BadRequest("amount bắt buộc và > 0 với non-cash");
        }
        if (amount > amount_due) {
          throw new BadRequest("Số tiền vượt quá số còn phải trả");
        }
      }

      // Insert payment
      const ins = await client.query(
        `INSERT INTO order_payment(
          order_id, method_code, amount, amount_tendered, change_given, 
          tx_ref, note, created_by, ca_lam_id
        )
        VALUES ($1,$2,$3,$4,DEFAULT,$5,$6,$7,$8)
        RETURNING *`,
        [
          orderId, 
          method_code, 
          amount ?? 0, 
          amount_tendered ?? null, 
          tx_ref ?? null, 
          note ?? null, 
          created_by ?? null, 
          ca_lam_id ?? null
        ]
      );

      const payment = ins.rows[0];

      // Lấy settlement và payments mới
      const [settle, payments] = await Promise.all([
        client.query(`SELECT * FROM v_order_settlement WHERE order_id=$1`, [orderId]),
        client.query(`SELECT * FROM order_payment WHERE order_id=$1 ORDER BY id`, [orderId])
      ]);

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        data: {
          payment,
          settlement: settle.rows[0],
          payments: payments.rows
        }
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });

  // POST /api/v1/pos/orders/:orderId/payments/:paymentId/void
  voidPayment = asyncHandler(async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const paymentId = parseInt(req.params.paymentId);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      await assertOrderExists(client, orderId);

      const upd = await client.query(
        `UPDATE order_payment 
         SET status='VOIDED' 
         WHERE id=$1 AND order_id=$2 AND status='CAPTURED' 
         RETURNING id`,
        [paymentId, orderId]
      );

      if (upd.rowCount === 0) {
        throw new BadRequest("Không thể void (không tồn tại hoặc trạng thái không phù hợp)");
      }

      const [settle, payments] = await Promise.all([
        client.query(`SELECT * FROM v_order_settlement WHERE order_id=$1`, [orderId]),
        client.query(`SELECT * FROM order_payment WHERE order_id=$1 ORDER BY id`, [orderId])
      ]);

      await client.query("COMMIT");

      res.json({
        success: true,
        data: {
          voided: paymentId,
          settlement: settle.rows[0],
          payments: payments.rows
        }
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });

  // POST /api/v1/pos/orders/:orderId/payments/:paymentId/refund
  refundPayment = asyncHandler(async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const paymentId = parseInt(req.params.paymentId);
    const { amount, reason, created_by } = req.body || {};

    if (!amount || amount <= 0) {
      throw new BadRequest("amount phải > 0");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      await assertOrderExists(client, orderId);

      // Kiểm tra payment
      const pay = await client.query(
        `SELECT id, amount, status FROM order_payment WHERE id=$1 AND order_id=$2`,
        [paymentId, orderId]
      );

      if (pay.rowCount === 0) {
        throw new BadRequest("Payment không tồn tại");
      }

      if (pay.rows[0].status !== 'CAPTURED') {
        throw new BadRequest("Chỉ refund từ payment CAPTURED");
      }

      // Kiểm tra đã refund bao nhiêu rồi
      const refunded = await client.query(
        `SELECT COALESCE(SUM(amount),0)::INT AS refunded 
         FROM order_payment_refund 
         WHERE payment_id=$1`,
        [paymentId]
      );

      const remain = (pay.rows[0].amount ?? 0) - (refunded.rows[0].refunded ?? 0);
      if (amount > remain) {
        throw new BadRequest("Số tiền refund vượt quá phần còn lại");
      }

      // Insert refund
      await client.query(
        `INSERT INTO order_payment_refund(payment_id, amount, reason, created_by) 
         VALUES ($1,$2,$3,$4)`,
        [paymentId, amount, reason ?? null, created_by ?? null]
      );

      const [settle, payments] = await Promise.all([
        client.query(`SELECT * FROM v_order_settlement WHERE order_id=$1`, [orderId]),
        client.query(`SELECT * FROM order_payment WHERE order_id=$1 ORDER BY id`, [orderId])
      ]);

      await client.query("COMMIT");

      res.json({
        success: true,
        data: {
          refunded: amount,
          settlement: settle.rows[0],
          payments: payments.rows
        }
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });

  // GET /api/v1/pos/orders/:orderId/settlement
  getOrderSettlement = asyncHandler(async (req, res) => {
    const orderId = parseInt(req.params.orderId);

    const [sett, pays] = await Promise.all([
      pool.query(`SELECT * FROM v_order_settlement WHERE order_id=$1`, [orderId]),
      pool.query(`SELECT * FROM order_payment WHERE order_id=$1 ORDER BY id`, [orderId])
    ]);

    res.json({
      success: true,
      data: {
        settlement: sett.rows[0],
        payments: pays.rows
      }
    });
  });

  // === PAYOS PAYMENT GATEWAY ===

  // POST /api/v1/payments/payos/create
  createPayOSPayment = asyncHandler(async (req, res) => {
    const { orderId, amount } = req.body || {};
    
    if (!orderId || !amount) {
      throw new BadRequest('Thiếu orderId hoặc amount');
    }

    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new BadRequest('Số tiền không hợp lệ');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Kiểm tra order tồn tại
      const orderResult = await client.query(
        `SELECT id, trang_thai FROM don_hang WHERE id=$1`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new BadRequest('Đơn hàng không tồn tại');
      }

      // Tạo mã tham chiếu unique (tránh trùng khi click nhanh)
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const randomNum = Math.floor(Math.random() * 999); // Thêm random 0-999
      const refCode = `${timestamp}${random}`;
      const orderCode = timestamp * 1000 + randomNum; // Unique hơn: timestamp + random

      // Lưu transaction vào DB (kèm gateway_order_code)
      const insertResult = await client.query(
        `INSERT INTO payment_transaction (
          order_id, payment_method_code, ref_code, amount, currency, status, gateway_order_code
        ) VALUES ($1, $2, $3, $4, 'VND', 'PENDING', $5)
        RETURNING *`,
        [orderId, 'PAYOS', refCode, amountNum, orderCode.toString()]
      );

      const transaction = insertResult.rows[0];

      // Tạo payment request với PayOS SDK
      const returnUrl = `${process.env.APP_BASE_URL || 'http://localhost:5000'}/payment-success?ref=${refCode}`;
      const cancelUrl = `${process.env.APP_BASE_URL || 'http://localhost:5000'}/payment-cancel?ref=${refCode}`;

      const payosResponse = await createPayOrder({
        amount: amountNum,
        orderCode: orderCode,
        description: `Thanh toan don hang #${orderId}`,
        returnUrl,
        cancelUrl
      });

      if (!payosResponse.success) {
        throw new BadRequest(`PayOS Error: ${payosResponse.error}`);
      }

      // Cập nhật transaction với thông tin từ PayOS
      await client.query(
        `UPDATE payment_transaction 
         SET gateway_payload = $1, updated_at = now()
         WHERE id = $2`,
        [JSON.stringify(payosResponse.rawResponse), transaction.id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        data: {
          transactionId: transaction.id,
          refCode,
          orderCode,
          checkoutUrl: payosResponse.checkoutUrl,
          qrUrl: payosResponse.qrUrl,
          amount: amountNum
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  // POST /api/v1/payments/payos/webhook
  payOSWebhook = asyncHandler(async (req, res) => {
    try {
      const webhookData = req.body;
      
      console.log('📦 PayOS Webhook received:', webhookData);

      // Verify webhook data bằng SDK
      const verifiedData = verifyWebhookSignature(webhookData);
      
      if (!verifiedData) {
        console.warn('⚠️ PayOS Webhook: Invalid signature');
        return res.status(403).json({ 
          success: false, 
          error: 'Invalid signature' 
        });
      }

      console.log('✅ PayOS Webhook: Valid signature', verifiedData);

      // SDK đã verify và return data
      const { orderCode, amount, reference, code, description } = verifiedData;

      // Tìm transaction theo orderCode (timestamp)
      const txnResult = await pool.query(
        `SELECT * FROM payment_transaction 
         WHERE ref_code LIKE $1 || '%'
         ORDER BY created_at DESC
         LIMIT 1`,
        [orderCode.toString()]
      );

      if (txnResult.rows.length === 0) {
        console.warn('⚠️ PayOS Webhook: Transaction not found', { orderCode });
        return res.status(200).json({ 
          success: true, 
          message: 'Transaction not found' 
        });
      }

      const transaction = txnResult.rows[0];

      // Kiểm tra idempotency
      if (transaction.status === 'PAID') {
        console.log('ℹ️ PayOS Webhook: Already processed', { 
          refCode: transaction.ref_code 
        });
        return res.json({ success: true, message: 'Already processed' });
      }

      // Kiểm tra số tiền
      if (Number(amount) !== Number(transaction.amount)) {
        console.warn('⚠️ PayOS Webhook: Amount mismatch', {
          expected: transaction.amount,
          received: amount
        });
        
        // Vẫn lưu payload để debug
        await pool.query(
          `UPDATE payment_transaction 
           SET gateway_payload = $1, updated_at = now()
           WHERE id = $2`,
          [JSON.stringify(webhookData), transaction.id]
        );
        
        return res.status(400).json({ 
          success: false, 
          error: 'Amount mismatch' 
        });
      }

      // Xác định trạng thái
      const isPaid = code === '00' || verifiedData.status === 'PAID';
      const newStatus = isPaid ? 'PAID' : 'FAILED';

      console.log(`💰 PayOS Webhook: Payment ${newStatus}`, {
        refCode: transaction.ref_code,
        amount,
        reference
      });

      // Cập nhật trong transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Cập nhật payment_transaction
        await client.query(
          `UPDATE payment_transaction 
           SET gateway_txn_id = $1, 
               status = $2, 
               gateway_payload = $3, 
               updated_at = now()
           WHERE id = $4`,
          [reference || orderCode.toString(), newStatus, JSON.stringify(webhookData), transaction.id]
        );

        if (isPaid) {
          // Tạo order_payment record
          await client.query(
            `INSERT INTO order_payment (
              order_id, method_code, status, amount, tx_ref, created_at
            ) VALUES ($1, $2, $3, $4, $5, now())`,
            [
              transaction.order_id,
              'PAYOS',
              'CAPTURED',
              transaction.amount,
              reference || orderCode.toString()
            ]
          );

          // Kiểm tra và đóng đơn nếu đã thanh toán đủ
          await closeOrderIfPaid(client, transaction.order_id);
        }

        await client.query('COMMIT');

        // Emit SSE event để update UI realtime
        bus.emit('change', {
          type: 'PAYMENT_UPDATE',
          orderId: transaction.order_id,
          refCode: transaction.ref_code,
          status: newStatus,
          amount: transaction.amount
        });

        res.json({ 
          success: true, 
          message: 'Webhook processed successfully' 
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ PayOS Webhook Error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // GET /api/v1/payments/payos/status/:refCode
  checkPayOSStatus = asyncHandler(async (req, res) => {
    const { refCode } = req.params;

    // Tìm transaction trong DB
    const result = await pool.query(
      `SELECT * FROM payment_transaction WHERE ref_code = $1`,
      [refCode]
    );

    if (result.rows.length === 0) {
      throw new BadRequest('Transaction không tồn tại');
    }

    const transaction = result.rows[0];

    // GỌI PAYOS API để lấy status mới nhất (QUAN TRỌNG!)
    const { getPaymentStatus } = await import('../lib/payosClient.js');
    
    // Dùng gateway_order_code đã lưu trong DB (chính xác 100%)
    const orderCode = transaction.gateway_order_code;
    
    if (orderCode) {
      console.log('🔍 Checking PayOS API for orderCode:', orderCode, '(from DB)');
      
      const payosStatus = await getPaymentStatus(orderCode);
      
      if (payosStatus.success && payosStatus.data) {
        console.log('📊 PayOS API status:', payosStatus.data.status);
        
        // Nếu PayOS trả PAID nhưng DB vẫn PENDING → Update DB
        if (payosStatus.data.status === 'PAID' && transaction.status !== 'PAID') {
          console.log('⚡ Updating transaction status to PAID from polling');
          
          // Update DB (giống webhook)
          const client = await pool.connect();
          try {
            await client.query('BEGIN');

            await client.query(
              `UPDATE payment_transaction 
               SET status = 'PAID', 
                   gateway_payload = $1,
                   updated_at = now()
               WHERE id = $2`,
              [JSON.stringify(payosStatus.data), transaction.id]
            );

            // Tạo order_payment
            await client.query(
              `INSERT INTO order_payment (
                order_id, method_code, status, amount, tx_ref, created_at
              ) VALUES ($1, $2, $3, $4, $5, now())`,
              [transaction.order_id, 'ONLINE', 'CAPTURED', transaction.amount, refCode]
            );

            // Kiểm tra và đóng đơn nếu đã thanh toán đủ
            await closeOrderIfPaid(client, transaction.order_id);

            await client.query('COMMIT');

            // Emit SSE
            bus.emit('change', {
              type: 'PAYMENT_UPDATE',
              orderId: transaction.order_id,
              refCode: transaction.ref_code,
              status: 'PAID',
              amount: transaction.amount
            });

            // Trả về status mới
            return res.json({
              success: true,
              data: {
                refCode: transaction.ref_code,
                status: 'PAID',
                amount: transaction.amount,
                orderId: transaction.order_id,
                updatedFromPayOS: true
              }
            });
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            client.release();
          }
        }
        
        // Trả về status từ PayOS
        return res.json({
          success: true,
          data: {
            refCode: transaction.ref_code,
            status: payosStatus.data.status,
            amount: transaction.amount,
            orderId: transaction.order_id,
            fromPayOS: true
          }
        });
      }
    }

    // Fallback: Trả về status từ DB
    res.json({
      success: true,
      data: {
        refCode: transaction.ref_code,
        status: transaction.status,
        amount: transaction.amount,
        orderId: transaction.order_id,
        createdAt: transaction.created_at,
        updatedAt: transaction.updated_at
      }
    });
  });

  // POST /api/v1/payments/payos/process-return/:orderCode
  // Xử lý return URL từ PayOS (khi webhook chưa đến hoặc không dùng ngrok)
  processPayOSReturn = asyncHandler(async (req, res) => {
    const orderCodeParam = req.params.orderCode;
    const { code, status, paymentLinkId } = req.body || {};

    console.log('📥 Processing PayOS return URL:', { orderCodeParam, code, status, paymentLinkId });

    // Tìm transaction theo orderCode
    const txnResult = await pool.query(
      `SELECT pt.*, dh.id as order_id 
       FROM payment_transaction pt
       LEFT JOIN don_hang dh ON pt.order_id = dh.id
       WHERE pt.ref_code LIKE $1 || '%'
       ORDER BY pt.created_at DESC
       LIMIT 1`,
      [orderCodeParam.toString()]
    );

    if (txnResult.rows.length === 0) {
      console.warn('⚠️ Transaction not found for orderCode:', orderCodeParam);
      return res.status(200).json({ 
        success: true, 
        message: 'Transaction not found' 
      });
    }

    const transaction = txnResult.rows[0];

    // Kiểm tra đã paid chưa
    if (transaction.status === 'PAID') {
      return res.json({ success: true, message: 'Already paid' });
    }

    // Chỉ xử lý khi code === '00' và status === 'PAID'
    if (code !== '00' || status !== 'PAID') {
      return res.json({ success: true, message: 'Payment not completed' });
    }

    // Update DB giống như webhook
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Cập nhật payment_transaction
      await client.query(
        `UPDATE payment_transaction 
         SET gateway_txn_id = $1, 
             status = 'PAID', 
             gateway_payload = $2, 
             updated_at = now()
         WHERE id = $3`,
        [paymentLinkId || orderCodeParam.toString(), JSON.stringify(req.body), transaction.id]
      );

      // Tạo order_payment record
      await client.query(
        `INSERT INTO order_payment (
          order_id, method_code, status, amount, tx_ref, created_at
        ) VALUES ($1, $2, $3, $4, $5, now())`,
        [
          transaction.order_id,
          'ONLINE',
          'CAPTURED',
          transaction.amount,
          paymentLinkId || orderCodeParam.toString()
        ]
      );

      // Kiểm tra và đóng đơn nếu đã thanh toán đủ
      await closeOrderIfPaid(client, transaction.order_id);

      await client.query('COMMIT');

      // Emit SSE event
      bus.emit('change', {
        type: 'PAYMENT_UPDATE',
        orderId: transaction.order_id,
        refCode: transaction.ref_code,
        status: 'PAID',
        amount: transaction.amount
      });

      console.log('✅ Payment processed from return URL');

      res.json({ 
        success: true, 
        message: 'Payment processed successfully' 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  // POST /api/v1/payments/payos/simulate-success/:refCode
  // DEMO ONLY: Giả lập webhook thành công để test UI
  simulatePayOSSuccess = asyncHandler(async (req, res) => {
    const { refCode } = req.params;

    const txnResult = await pool.query(
      `SELECT * FROM payment_transaction WHERE ref_code = $1`,
      [refCode]
    );

    if (txnResult.rows.length === 0) {
      throw new BadRequest('Transaction không tồn tại');
    }

    const transaction = txnResult.rows[0];

    if (transaction.status === 'PAID') {
      return res.json({ success: true, message: 'Already paid' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Cập nhật payment_transaction
      await client.query(
        `UPDATE payment_transaction 
         SET gateway_txn_id = $1, 
             status = 'PAID', 
             gateway_payload = $2, 
             updated_at = now()
         WHERE id = $3`,
        [`DEMO-${refCode}`, JSON.stringify({ demo: true, simulated: true }), transaction.id]
      );

      // Tạo order_payment record
      await client.query(
        `INSERT INTO order_payment (
          order_id, method_code, status, amount, tx_ref, created_at
        ) VALUES ($1, $2, $3, $4, $5, now())`,
        [
          transaction.order_id,
          'ONLINE',
          'CAPTURED',
          transaction.amount,
          `DEMO-${refCode}`
        ]
      );

      // Kiểm tra và đóng đơn nếu đã thanh toán đủ
      await closeOrderIfPaid(client, transaction.order_id);

      await client.query('COMMIT');

      // Emit SSE event để update UI realtime
      bus.emit('change', {
        type: 'PAYMENT_UPDATE',
        orderId: transaction.order_id,
        refCode: transaction.ref_code,
        status: 'PAID',
        amount: transaction.amount
      });

      res.json({ 
        success: true, 
        message: 'Payment simulated successfully' 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
}

export default new PaymentsController();

