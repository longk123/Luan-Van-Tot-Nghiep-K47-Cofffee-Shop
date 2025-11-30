// Fix fn_aggregate_shift: COD KHÔNG phải là doanh thu
// COD chỉ tính vào cash_amount (tiền mặt), không tính vào net_amount (doanh thu)
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
    console.log('🔧 Fixing fn_aggregate_shift: COD không phải doanh thu...\n');
    
    await client.query('BEGIN');
    
    // 1. Kiểm tra doanh thu hiện tại của ca #55
    console.log('📊 Trước khi sửa:');
    const before = await client.query(`SELECT fn_aggregate_shift(55) as stats`);
    const beforeStats = before.rows[0].stats;
    console.log(`  - net_amount (doanh thu): ${beforeStats.net_amount?.toLocaleString('vi-VN')}đ`);
    console.log(`  - cash_amount: ${beforeStats.cash_amount?.toLocaleString('vi-VN')}đ`);
    
    // 2. Drop function cũ
    await client.query(`DROP FUNCTION IF EXISTS fn_aggregate_shift(INT);`);
    
    // 3. Tạo lại function
    console.log('\n📝 Tạo lại fn_aggregate_shift (COD chỉ tính vào cash, không tính vào revenue)...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_aggregate_shift(p_shift_id INT)
      RETURNS JSON AS $$
      DECLARE
        result JSON;
        cod_total INT;
      BEGIN
        -- Tính COD từ wallet_transactions
        SELECT COALESCE(SUM(wt.amount), 0)::INT INTO cod_total
        FROM wallet_transactions wt
        WHERE wt.shift_id = p_shift_id
          AND wt.type = 'SETTLE';
        
        -- Tính doanh thu từ đơn hàng
        SELECT json_build_object(
          'total_orders', COUNT(DISTINCT dh.id),
          'gross_amount', COALESCE(SUM(settlement.subtotal_after_lines), 0),
          'net_amount', COALESCE(SUM(settlement.grand_total), 0),  -- ✅ KHÔNG cộng COD
          'discount_amount', COALESCE(SUM(settlement.promo_total + settlement.manual_discount), 0),
          'tax_amount', 0,
          'cash_amount', COALESCE(SUM(
            CASE 
              -- Ưu tiên: Lấy từ order_payment (hệ thống mới)
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
              -- Fallback: Lấy từ payment_transaction (hệ thống cũ)
              WHEN EXISTS (
                SELECT 1 FROM payment_transaction pt 
                WHERE pt.order_id = dh.id 
                  AND pt.payment_method_code = 'CASH' 
                  AND pt.status = 'PAID'
              ) THEN (
                SELECT COALESCE(SUM(pt.amount), 0)
                FROM payment_transaction pt
                WHERE pt.order_id = dh.id
                  AND pt.payment_method_code = 'CASH'
                  AND pt.status = 'PAID'
              )
              ELSE 0 
            END
          ), 0) + cod_total,  -- ✅ COD chỉ cộng vào cash_amount
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
              WHEN EXISTS (
                SELECT 1 FROM payment_transaction pt 
                WHERE pt.order_id = dh.id 
                  AND pt.payment_method_code = 'CARD' 
                  AND pt.status = 'PAID'
              ) THEN (
                SELECT COALESCE(SUM(pt.amount), 0)
                FROM payment_transaction pt
                WHERE pt.order_id = dh.id
                  AND pt.payment_method_code = 'CARD'
                  AND pt.status = 'PAID'
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
              WHEN EXISTS (
                SELECT 1 FROM payment_transaction pt 
                WHERE pt.order_id = dh.id 
                  AND pt.payment_method_code = 'TRANSFER' 
                  AND pt.status = 'PAID'
              ) THEN (
                SELECT COALESCE(SUM(pt.amount), 0)
                FROM payment_transaction pt
                WHERE pt.order_id = dh.id
                  AND pt.payment_method_code = 'TRANSFER'
                  AND pt.status = 'PAID'
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
              WHEN EXISTS (
                SELECT 1 FROM payment_transaction pt 
                WHERE pt.order_id = dh.id 
                  AND pt.payment_method_code IN ('PAYOS', 'MOMO', 'ZALOPAY') 
                  AND pt.status = 'PAID'
              ) THEN (
                SELECT COALESCE(SUM(pt.amount), 0)
                FROM payment_transaction pt
                WHERE pt.order_id = dh.id
                  AND pt.payment_method_code IN ('PAYOS', 'MOMO', 'ZALOPAY')
                  AND pt.status = 'PAID'
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
    
    // 4. Kiểm tra doanh thu sau khi sửa
    console.log('\n📊 Sau khi sửa:');
    const after = await client.query(`SELECT fn_aggregate_shift(55) as stats`);
    const afterStats = after.rows[0].stats;
    console.log(`  - net_amount (doanh thu): ${afterStats.net_amount?.toLocaleString('vi-VN')}đ`);
    console.log(`  - cash_amount: ${afterStats.cash_amount?.toLocaleString('vi-VN')}đ`);
    
    // 5. Kiểm tra COD
    const cod = await client.query(`
      SELECT COALESCE(SUM(amount), 0)::INT as total_cod
      FROM wallet_transactions
      WHERE shift_id = 55 AND type = 'SETTLE'
    `);
    console.log(`  - COD: ${cod.rows[0].total_cod?.toLocaleString('vi-VN')}đ`);
    
    console.log('\n📈 Phân tích:');
    console.log(`  - Doanh thu từ đơn (net_amount): ${afterStats.net_amount?.toLocaleString('vi-VN')}đ`);
    console.log(`  - COD shipper nộp (không phải doanh thu): ${cod.rows[0].total_cod?.toLocaleString('vi-VN')}đ`);
    console.log(`  - Tiền mặt thực tế (cash_amount): ${afterStats.cash_amount?.toLocaleString('vi-VN')}đ`);
    console.log(`  → cash_amount = doanh thu tiền mặt + COD ✅`);
    
    // 6. Cập nhật lại ca_lam
    console.log('\n🔄 Cập nhật lại ca_lam #55...');
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
    console.log('\n📝 Tóm tắt:');
    console.log(`  - Doanh thu (net_amount): ${beforeStats.net_amount?.toLocaleString('vi-VN')}đ → ${afterStats.net_amount?.toLocaleString('vi-VN')}đ`);
    console.log(`  - Giảm: ${(beforeStats.net_amount - afterStats.net_amount)?.toLocaleString('vi-VN')}đ (COD bị loại bỏ)`);
    
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
