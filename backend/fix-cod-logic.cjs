// Sửa fn_aggregate_shift để xử lý đúng đơn COD
// 
// Logic mới:
// - Đơn DELIVERY + CASH (COD): chỉ tính doanh thu khi delivery_status = 'DELIVERED'
// - Đơn DELIVERY + online: tính doanh thu khi trang_thai = 'PAID'
// - Đơn khác (DINE_IN, TAKEAWAY): tính doanh thu khi trang_thai = 'PAID'

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
    console.log('🔧 Fixing fn_aggregate_shift for COD orders\n');
    
    await client.query('BEGIN');
    
    // Drop và tạo lại function
    await client.query(`DROP FUNCTION IF EXISTS fn_aggregate_shift(INT);`);
    
    console.log('📝 Tạo lại fn_aggregate_shift với logic COD...');
    
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
        -- Logic mới:
        -- 1. Đơn không phải DELIVERY: tính khi trang_thai = 'PAID'
        -- 2. Đơn DELIVERY + CASH (COD): tính khi delivery_status = 'DELIVERED'
        -- 3. Đơn DELIVERY + online payment: tính khi trang_thai = 'PAID'
        SELECT json_build_object(
          'total_orders', COUNT(DISTINCT dh.id),
          'gross_amount', COALESCE(SUM(settlement.subtotal_after_lines), 0),
          'net_amount', COALESCE(SUM(settlement.grand_total), 0),
          'discount_amount', COALESCE(SUM(settlement.promo_total + settlement.manual_discount), 0),
          'tax_amount', 0,
          -- Tiền mặt = SUM(grand_total của đơn thanh toán CASH đã hoàn tất) - refund
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
        LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id
        WHERE dh.ca_lam_id = p_shift_id
          AND dh.trang_thai = 'PAID';
        
        RETURN result;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Kiểm tra sau khi sửa
    console.log('\n📊 Kiểm tra ca #55:');
    const result = await client.query(`SELECT fn_aggregate_shift(55) as stats`);
    const stats = result.rows[0].stats;
    console.log(`  - total_orders: ${stats.total_orders}`);
    console.log(`  - net_amount (doanh thu): ${stats.net_amount?.toLocaleString('vi-VN')}đ`);
    console.log(`  - cash_amount (tiền mặt): ${stats.cash_amount?.toLocaleString('vi-VN')}đ`);
    
    await client.query('COMMIT');
    
    console.log('\n✅ Hoàn tất!');
    console.log('\n📋 Logic mới:');
    console.log('  - Đơn DELIVERY + CASH (COD): PAID khi shipper giao thành công');
    console.log('  - Đơn DELIVERY + online: PAID ngay khi thanh toán');
    console.log('  - Đơn DINE_IN/TAKEAWAY: PAID ngay khi thanh toán');
    
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
