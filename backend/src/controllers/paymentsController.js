// src/controllers/paymentsController.js
import { pool } from '../db.js';
import { asyncHandler } from '../middleware/error.js';
import { BadRequest } from '../utils/httpErrors.js';

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
}

export default new PaymentsController();

