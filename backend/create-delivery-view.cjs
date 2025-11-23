// Tạo view cho đơn giao hàng chưa giao
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function create() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Creating v_delivery_pending view...\n');
    
    await client.query('BEGIN');
    
    // Drop view cũ nếu có
    await client.query(`DROP VIEW IF EXISTS v_delivery_pending CASCADE`);
    
    // Tạo view cho đơn DELIVERY chưa giao
    await client.query(`
      CREATE VIEW v_delivery_pending AS
      SELECT 
        dh.id,
        dh.trang_thai,
        dh.order_type,
        dh.opened_at,
        dh.closed_at,
        dh.delivered_at,
        dh.customer_account_id,
        -- Thông tin khách hàng (nếu có)
        ca.full_name AS khach_hang_ten,
        ca.phone AS khach_hang_phone,
        ca.email AS khach_hang_email,
        -- Phân biệt đơn đặt trước (từ Customer Portal) vs đơn tại quán
        CASE 
          WHEN dh.customer_account_id IS NOT NULL THEN true
          ELSE false
        END AS is_pre_order,
        -- Thông tin giao hàng
        di.delivery_address,
        di.delivery_phone,
        di.delivery_notes,
        di.delivery_fee,
        di.distance_km,
        di.latitude,
        di.longitude,
        di.estimated_time,
        di.delivery_status,
        di.shipper_id,
        shipper.full_name AS shipper_name,
        shipper.username AS shipper_username,
        settlement.grand_total,
        json_agg(
          json_build_object(
            'id', ct.id,
            'mon_ten', COALESCE(ct.ten_mon_snapshot, m.ten),
            'bien_the_ten', btm.ten_bien_the,
            'so_luong', ct.so_luong,
            'trang_thai_che_bien', ct.trang_thai_che_bien,
            'ghi_chu', ct.ghi_chu
          ) ORDER BY ct.id
        ) FILTER (WHERE ct.id IS NOT NULL) AS items
      FROM don_hang dh
      LEFT JOIN don_hang_chi_tiet ct ON ct.don_hang_id = dh.id
      LEFT JOIN mon m ON m.id = ct.mon_id
      LEFT JOIN mon_bien_the btm ON btm.id = ct.bien_the_id
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      LEFT JOIN customer_accounts ca ON ca.id = dh.customer_account_id
      LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id
      LEFT JOIN users shipper ON shipper.user_id = di.shipper_id
      WHERE dh.order_type = 'DELIVERY'
        AND dh.trang_thai IN ('OPEN', 'PAID')
        AND (dh.delivered_at IS NULL OR di.actual_delivered_at IS NULL)
      GROUP BY dh.id, dh.trang_thai, dh.order_type, dh.opened_at, dh.closed_at, dh.delivered_at,
               dh.customer_account_id, ca.full_name, ca.phone, ca.email,
               di.delivery_address, di.delivery_phone, di.delivery_notes, di.delivery_fee,
               di.distance_km, di.latitude, di.longitude, di.estimated_time, 
               di.delivery_status, di.shipper_id, shipper.full_name, shipper.username,
               settlement.grand_total
      ORDER BY dh.opened_at;
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ View created successfully!\n');
    console.log('📝 View: v_delivery_pending');
    console.log('📝 Condition: order_type = DELIVERY AND delivered_at IS NULL');
    console.log('📝 Now use: SELECT * FROM v_delivery_pending');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

create();

