// Migration: Sửa view v_invoice_header
// Thu ngân = người sở hữu ca THANH TOÁN (order_payment.ca_lam_id), không phải ca tạo đơn
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Sửa view v_invoice_header: Thu ngân = người sở hữu ca thanh toán\n');
    
    // Kiểm tra trước khi sửa
    const before = await client.query(`
      SELECT order_id, nguoi_tao_don, thu_ngan 
      FROM v_invoice_header 
      WHERE order_id = 286
    `);
    console.log('📋 Trước khi sửa (đơn #286):');
    console.log(before.rows[0]);
    
    await client.query('BEGIN');
    
    // Drop view cũ
    console.log('\n🗑️ Drop view cũ...');
    await client.query(`DROP VIEW IF EXISTS v_invoice_header CASCADE`);
    
    // Tạo lại view với logic mới:
    // Thu ngân = người sở hữu ca THANH TOÁN (từ order_payment.ca_lam_id)
    console.log('📋 Tạo lại view v_invoice_header...');
    await client.query(`
      CREATE VIEW v_invoice_header AS
      SELECT
        dh.id                 AS order_id,
        dh.order_type,
        dh.trang_thai         AS order_status,
        dh.opened_at,
        dh.closed_at,
        dh.ban_id,
        CASE
          WHEN dh.order_type='TAKEAWAY' THEN 'Mang đi'
          WHEN dh.order_type='DELIVERY' THEN 'Giao hàng'
          WHEN dh.ban_id IS NOT NULL    THEN 'Bàn '||dh.ban_id::text
          ELSE 'Không xác định'
        END                  AS ban_label,
        kv.ten               AS khu_vuc,
        -- Người tạo đơn (từ don_hang.nhan_vien_id)
        u_creator.full_name  AS nguoi_tao_don,
        u_creator.username   AS nguoi_tao_don_username,
        -- Thu ngân: Ưu tiên lấy từ ca thanh toán (order_payment.ca_lam_id)
        -- 1. order_payment.created_by (người bấm nút thanh toán)
        -- 2. ca_payment.nhan_vien_id (người sở hữu ca thanh toán)
        -- 3. ca_order.nhan_vien_id (người sở hữu ca tạo đơn)
        -- 4. don_hang.nhan_vien_id (người tạo đơn - fallback cuối)
        COALESCE(
          u_payer.full_name,
          u_payment_ca_owner.full_name,
          u_order_ca_owner.full_name,
          u_creator.full_name
        )                   AS thu_ngan,
        COALESCE(
          u_payer.username,
          u_payment_ca_owner.username,
          u_order_ca_owner.username,
          u_creator.username
        )                   AS thu_ngan_username,
        dh.ca_lam_id         AS ca_lam_id,
        ca_order.started_at  AS ca_bat_dau,
        ca_order.nhan_vien_id AS ca_nhan_vien_id
      FROM don_hang dh
      LEFT JOIN ban b ON b.id = dh.ban_id
      LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
      -- Người tạo đơn
      LEFT JOIN users u_creator ON u_creator.user_id = dh.nhan_vien_id
      -- Ca tạo đơn
      LEFT JOIN ca_lam ca_order ON ca_order.id = dh.ca_lam_id
      LEFT JOIN users u_order_ca_owner ON u_order_ca_owner.user_id = ca_order.nhan_vien_id
      -- Payment đầu tiên (lấy created_by và ca_lam_id của payment)
      LEFT JOIN LATERAL (
        SELECT created_by, ca_lam_id
        FROM order_payment
        WHERE order_id = dh.id
        ORDER BY 
          CASE WHEN status = 'CAPTURED' THEN 0 ELSE 1 END,
          created_at ASC
        LIMIT 1
      ) first_payment ON true
      -- Người thanh toán (từ order_payment.created_by)
      LEFT JOIN users u_payer ON u_payer.user_id = first_payment.created_by
      -- Ca thanh toán (từ order_payment.ca_lam_id)
      LEFT JOIN ca_lam ca_payment ON ca_payment.id = first_payment.ca_lam_id
      LEFT JOIN users u_payment_ca_owner ON u_payment_ca_owner.user_id = ca_payment.nhan_vien_id
    `);
    
    console.log('✅ Đã tạo view mới');
    
    // Kiểm tra sau khi sửa
    const after = await client.query(`
      SELECT order_id, nguoi_tao_don, thu_ngan 
      FROM v_invoice_header 
      WHERE order_id = 286
    `);
    console.log('\n📋 Sau khi sửa (đơn #286):');
    console.log(after.rows[0]);
    
    await client.query('COMMIT');
    console.log('\n✅ Migration hoàn tất!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
