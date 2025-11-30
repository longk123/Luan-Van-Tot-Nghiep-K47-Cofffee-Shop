// Fix fn_aggregate_shift CORRECT:
// 
// Với đơn DELIVERY thanh toán tiền mặt:
// - Khách trả cho shipper toàn bộ grand_total (bao gồm phí giao)
// - order_payment.amount chỉ lưu tiền hàng (không bao gồm phí giao) → SAI
// - Phải dùng grand_total cho đơn DELIVERY thanh toán cash
//
// Tiền mặt = SUM(grand_total của đơn thanh toán CASH) - refund

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
    console.log('🔧 Fixing fn_aggregate_shift CORRECT\n');
    
    // Phân tích ca #55
    console.log('📊 Phân tích ca #55:\n');
    
    // Tất cả đơn thanh toán bằng CASH
    const cashOrders = await client.query(`
      SELECT 
        dh.id,
        dh.order_type,
        settlement.grand_total
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.ca_lam_id = 55 
        AND dh.trang_thai = 'PAID'
        AND EXISTS (
          SELECT 1 FROM order_payment op 
          WHERE op.order_id = dh.id 
            AND op.method_code = 'CASH' 
            AND op.status = 'CAPTURED'
        )
    `);
    
    console.log('💵 Đơn thanh toán CASH:');
    let totalCashGrand = 0;
    cashOrders.rows.forEach(d => {
      console.log(`   #${d.id} (${d.order_type}): grand_total = ${parseInt(d.grand_total).toLocaleString('vi-VN')}đ`);
      totalCashGrand += parseInt(d.grand_total);
    });
    console.log(`   → Tổng: ${totalCashGrand.toLocaleString('vi-VN')}đ`);
    
    // Refund
    const refund = await client.query(`
      SELECT COALESCE(SUM(r.amount), 0)::INT AS total
      FROM order_payment_refund r
      JOIN order_payment p ON p.id = r.payment_id
      JOIN don_hang dh ON dh.id = p.order_id
      WHERE dh.ca_lam_id = 55
    `);
    console.log(`\n↩️ Refund: ${refund.rows[0].total.toLocaleString('vi-VN')}đ`);
    
    // Doanh thu
    const revenue = await client.query(`
      SELECT COALESCE(SUM(settlement.grand_total), 0)::INT as total
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.ca_lam_id = 55 AND dh.trang_thai = 'PAID'
    `);
    console.log(`\n📈 Doanh thu: ${revenue.rows[0].total.toLocaleString('vi-VN')}đ`);
    
    // Tiền mặt đúng = grand_total của đơn thanh toán CASH - refund
    const correctCash = totalCashGrand - refund.rows[0].total;
    console.log(`\n💰 Tiền mặt đúng: ${totalCashGrand.toLocaleString('vi-VN')} - ${refund.rows[0].total.toLocaleString('vi-VN')} = ${correctCash.toLocaleString('vi-VN')}đ`);
    console.log(`   Doanh thu >= Tiền mặt: ${revenue.rows[0].total >= correctCash ? '✅' : '❌'}`);
    
    await client.query('BEGIN');
    
    // Drop và tạo lại function
    await client.query(`DROP FUNCTION IF EXISTS fn_aggregate_shift(INT);`);
    
    console.log('\n📝 Tạo lại fn_aggregate_shift...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_aggregate_shift(p_shift_id INT)
      RETURNS JSON AS $$
      DECLARE
        result JSON;
        refund_total INT;
      BEGIN
        -- Tính tổng refund
        SELECT COALESCE(SUM(r.amount), 0)::INT INTO refund_total
        FROM order_payment_refund r
        JOIN order_payment p ON p.id = r.payment_id
        JOIN don_hang dh ON dh.id = p.order_id
        WHERE dh.ca_lam_id = p_shift_id;
        
        -- Tính doanh thu và tiền mặt
        SELECT json_build_object(
          'total_orders', COUNT(DISTINCT dh.id),
          'gross_amount', COALESCE(SUM(settlement.subtotal_after_lines), 0),
          'net_amount', COALESCE(SUM(settlement.grand_total), 0),
          'discount_amount', COALESCE(SUM(settlement.promo_total + settlement.manual_discount), 0),
          'tax_amount', 0,
          -- Tiền mặt = SUM(grand_total của đơn thanh toán CASH) - refund
          'cash_amount', GREATEST(0, COALESCE(SUM(
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM order_payment op 
                WHERE op.order_id = dh.id 
                  AND op.method_code = 'CASH' 
                  AND op.status = 'CAPTURED'
              ) THEN settlement.grand_total
              ELSE 0 
            END
          ), 0) - refund_total),
          -- Card = SUM(grand_total của đơn thanh toán CARD)
          'card_amount', COALESCE(SUM(
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM order_payment op 
                WHERE op.order_id = dh.id 
                  AND op.method_code = 'CARD' 
                  AND op.status = 'CAPTURED'
              ) THEN settlement.grand_total
              ELSE 0 
            END
          ), 0),
          -- Transfer = SUM(grand_total của đơn thanh toán TRANSFER)
          'transfer_amount', COALESCE(SUM(
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM order_payment op 
                WHERE op.order_id = dh.id 
                  AND op.method_code = 'TRANSFER' 
                  AND op.status = 'CAPTURED'
              ) THEN settlement.grand_total
              ELSE 0 
            END
          ), 0),
          -- Online = SUM(grand_total của đơn thanh toán online)
          'online_amount', COALESCE(SUM(
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM order_payment op 
                WHERE op.order_id = dh.id 
                  AND op.method_code IN ('PAYOS', 'MOMO', 'ZALOPAY') 
                  AND op.status = 'CAPTURED'
              ) THEN settlement.grand_total
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
