// Fix fn_aggregate_shift FINAL:
// - Doanh thu = tổng grand_total (đã bao gồm phí giao hàng)
// - Tiền mặt = tiền thanh toán cash từ order_payment - refund
// - COD KHÔNG cộng vào cash_amount (vì COD đã nằm trong doanh thu của đơn DELIVERY)
// 
// Giải thích:
// - Đơn DELIVERY 68.000đ = tiền hàng 60.000đ + phí giao 8.000đ
// - order_payment.amount = 60.000đ (chỉ lưu tiền thanh toán, không lưu phí giao)
// - COD = tiền shipper thu hộ và nộp lại
// - Nếu đơn DELIVERY thanh toán cash → amount = 60.000đ, COD = 68.000đ (bao gồm phí giao)
// 
// Kết luận: COD bao gồm cả phí giao, nên COD = doanh thu thực của đơn DELIVERY
// → Tiền mặt từ đơn DELIVERY = COD (không cộng thêm order_payment.amount)

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || '123456')
});

async function fix() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing fn_aggregate_shift FINAL\n');
    
    // Phân tích trước khi sửa
    console.log('📊 Phân tích ca #55:\n');
    
    // Đơn DELIVERY với COD
    const delivery = await client.query(`
      SELECT 
        dh.id,
        settlement.grand_total,
        (SELECT COALESCE(SUM(amount), 0) FROM order_payment WHERE order_id = dh.id AND method_code = 'CASH') as cash_paid
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.ca_lam_id = 55 AND dh.order_type = 'DELIVERY' AND dh.trang_thai = 'PAID'
    `);
    console.log('🚚 Đơn DELIVERY:');
    let totalDeliveryGrand = 0, totalDeliveryCash = 0;
    delivery.rows.forEach(d => {
      console.log(`   #${d.id}: grand=${d.grand_total}, cash_paid=${d.cash_paid}`);
      totalDeliveryGrand += parseInt(d.grand_total);
      totalDeliveryCash += parseInt(d.cash_paid);
    });
    console.log(`   → Total: grand=${totalDeliveryGrand}, cash=${totalDeliveryCash}`);
    
    // COD
    const cod = await client.query(`
      SELECT COALESCE(SUM(amount), 0)::INT as total FROM wallet_transactions WHERE shift_id = 55 AND type = 'SETTLE'
    `);
    console.log(`\n📦 COD settle: ${cod.rows[0].total.toLocaleString('vi-VN')}đ`);
    
    // Đơn không phải DELIVERY
    const nonDelivery = await client.query(`
      SELECT 
        dh.id,
        dh.order_type,
        settlement.grand_total,
        (SELECT COALESCE(SUM(amount), 0) FROM order_payment WHERE order_id = dh.id AND method_code = 'CASH') as cash_paid
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.ca_lam_id = 55 AND dh.order_type != 'DELIVERY' AND dh.trang_thai = 'PAID'
    `);
    console.log('\n☕ Đơn DINE_IN/TAKEAWAY:');
    let totalNonDeliveryGrand = 0, totalNonDeliveryCash = 0;
    nonDelivery.rows.forEach(d => {
      console.log(`   #${d.id} (${d.order_type}): grand=${d.grand_total}, cash=${d.cash_paid}`);
      totalNonDeliveryGrand += parseInt(d.grand_total);
      totalNonDeliveryCash += parseInt(d.cash_paid);
    });
    console.log(`   → Total: grand=${totalNonDeliveryGrand}, cash=${totalNonDeliveryCash}`);
    
    // Refund
    const refund = await client.query(`
      SELECT COALESCE(SUM(r.amount), 0)::INT AS total
      FROM order_payment_refund r
      JOIN order_payment p ON p.id = r.payment_id
      JOIN don_hang dh ON dh.id = p.order_id
      WHERE dh.ca_lam_id = 55
    `);
    console.log(`\n↩️ Refund: ${refund.rows[0].total.toLocaleString('vi-VN')}đ`);
    
    // Tính toán đúng
    const totalRevenue = totalDeliveryGrand + totalNonDeliveryGrand;
    // Tiền mặt = cash từ đơn không DELIVERY + COD - refund
    // (vì COD đã bao gồm cả tiền DELIVERY)
    const totalCash = totalNonDeliveryCash + cod.rows[0].total - refund.rows[0].total;
    
    console.log('\n📈 KẾT QUẢ ĐÚNG:');
    console.log(`   Doanh thu: ${totalRevenue.toLocaleString('vi-VN')}đ`);
    console.log(`   Tiền mặt: ${totalCash.toLocaleString('vi-VN')}đ`);
    console.log(`   → Doanh thu >= Tiền mặt: ${totalRevenue >= totalCash ? '✅' : '❌'}`);
    
    await client.query('BEGIN');
    
    // Drop và tạo lại function
    await client.query(`DROP FUNCTION IF EXISTS fn_aggregate_shift(INT);`);
    
    console.log('\n📝 Tạo lại fn_aggregate_shift...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_aggregate_shift(p_shift_id INT)
      RETURNS JSON AS $$
      DECLARE
        result JSON;
        cod_total INT;
        refund_total INT;
        cash_non_delivery INT;
      BEGIN
        -- Tính COD từ wallet_transactions (tiền shipper nộp lại - đã bao gồm cả phí giao)
        SELECT COALESCE(SUM(wt.amount), 0)::INT INTO cod_total
        FROM wallet_transactions wt
        WHERE wt.shift_id = p_shift_id
          AND wt.type = 'SETTLE';
        
        -- Tính tổng refund
        SELECT COALESCE(SUM(r.amount), 0)::INT INTO refund_total
        FROM order_payment_refund r
        JOIN order_payment p ON p.id = r.payment_id
        JOIN don_hang dh ON dh.id = p.order_id
        WHERE dh.ca_lam_id = p_shift_id;
        
        -- Tính tiền mặt từ đơn KHÔNG PHẢI DELIVERY (vì đơn DELIVERY dùng COD)
        SELECT COALESCE(SUM(
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM order_payment op 
              WHERE op.order_id = dh.id 
                AND op.method_code = 'CASH' 
                AND op.status = 'CAPTURED'
            ) THEN (
              SELECT COALESCE(SUM(op.amount), 0)
              FROM order_payment op
              WHERE op.order_id = dh.id
                AND op.method_code = 'CASH'
                AND op.status = 'CAPTURED'
            )
            ELSE 0 
          END
        ), 0)::INT INTO cash_non_delivery
        FROM don_hang dh
        WHERE dh.ca_lam_id = p_shift_id
          AND dh.trang_thai = 'PAID'
          AND dh.order_type != 'DELIVERY';
        
        -- Tính doanh thu và các phương thức thanh toán
        SELECT json_build_object(
          'total_orders', COUNT(DISTINCT dh.id),
          'gross_amount', COALESCE(SUM(settlement.subtotal_after_lines), 0),
          'net_amount', COALESCE(SUM(settlement.grand_total), 0),
          'discount_amount', COALESCE(SUM(settlement.promo_total + settlement.manual_discount), 0),
          'tax_amount', 0,
          -- Tiền mặt = cash từ đơn không DELIVERY + COD - refund
          'cash_amount', GREATEST(0, cash_non_delivery + cod_total - refund_total),
          'card_amount', COALESCE(SUM(
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM order_payment op 
                WHERE op.order_id = dh.id 
                  AND op.method_code = 'CARD' 
                  AND op.status = 'CAPTURED'
              ) THEN (
                SELECT COALESCE(SUM(op.amount), 0)
                FROM order_payment op
                WHERE op.order_id = dh.id
                  AND op.method_code = 'CARD'
                  AND op.status = 'CAPTURED'
              )
              ELSE 0 
            END
          ), 0),
          'transfer_amount', COALESCE(SUM(
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM order_payment op 
                WHERE op.order_id = dh.id 
                  AND op.method_code = 'TRANSFER' 
                  AND op.status = 'CAPTURED'
              ) THEN (
                SELECT COALESCE(SUM(op.amount), 0)
                FROM order_payment op
                WHERE op.order_id = dh.id
                  AND op.method_code = 'TRANSFER'
                  AND op.status = 'CAPTURED'
              )
              ELSE 0 
            END
          ), 0),
          'online_amount', COALESCE(SUM(
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM order_payment op 
                WHERE op.order_id = dh.id 
                  AND op.method_code IN ('PAYOS', 'MOMO', 'ZALOPAY') 
                  AND op.status = 'CAPTURED'
              ) THEN (
                SELECT COALESCE(SUM(op.amount), 0)
                FROM order_payment op
                WHERE op.order_id = dh.id
                  AND op.method_code IN ('PAYOS', 'MOMO', 'ZALOPAY')
                  AND op.status = 'CAPTURED'
              )
              ELSE 0 
            END
          ), 0)
        ) INTO result
        FROM don_hang dh
        LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
        WHERE dh.ca_lam_id = p_shift_id
          AND dh.trang_thai = 'PAID';
        
        RETURN result;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Kiểm tra sau khi sửa
    console.log('\n📊 Sau khi sửa (ca #55):');
    const after = await client.query(`SELECT fn_aggregate_shift(55) as stats`);
    const afterStats = after.rows[0].stats;
    console.log(`  - net_amount (doanh thu): ${afterStats.net_amount?.toLocaleString('vi-VN')}đ`);
    console.log(`  - cash_amount (tiền mặt): ${afterStats.cash_amount?.toLocaleString('vi-VN')}đ`);
    
    if (afterStats.net_amount >= afterStats.cash_amount) {
      console.log(`  ✅ Doanh thu >= Tiền mặt`);
    } else {
      console.log(`  ❌ Doanh thu < Tiền mặt - CÒN SAI!`);
    }
    
    // Cập nhật ca_lam #55
    await client.query(`
      UPDATE ca_lam
      SET 
        net_amount = $1,
        gross_amount = $2,
        discount_amount = $3,
        cash_amount = $4,
        card_amount = $5,
        transfer_amount = $6,
        online_amount = $7,
        total_orders = $8
      WHERE id = 55
    `, [
      afterStats.net_amount,
      afterStats.gross_amount,
      afterStats.discount_amount,
      afterStats.cash_amount,
      afterStats.card_amount,
      afterStats.transfer_amount,
      afterStats.online_amount,
      afterStats.total_orders
    ]);
    
    await client.query('COMMIT');
    
    console.log('\n✅ Hoàn tất!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();
