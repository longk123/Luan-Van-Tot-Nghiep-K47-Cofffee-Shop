// Migration: Cập nhật view v_invoice_header
// - Nếu không có created_by trong payment → lấy người sở hữu ca
// - Luôn có cả nguoi_tao_don và thu_ngan

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
    console.log('🚀 Cập nhật view v_invoice_header để lấy đúng người thanh toán...\n');
    
    await client.query('BEGIN');
    
    // Drop view cũ trước
    console.log('🗑️ Drop view cũ...');
    await client.query(`DROP VIEW IF EXISTS v_invoice_header CASCADE`);
    
    // Tạo lại view với logic mới:
    // thu_ngan = order_payment.created_by → ca_lam.nhan_vien_id → don_hang.nhan_vien_id
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
        -- Người tạo đơn (nhan_vien_id)
        u_creator.full_name  AS nguoi_tao_don,
        u_creator.username   AS nguoi_tao_don_username,
        -- Người thanh toán: 
        -- 1. Từ order_payment.created_by (ưu tiên)
        -- 2. Từ ca_lam.nhan_vien_id (fallback cho đơn cũ)
        -- 3. Từ don_hang.nhan_vien_id (fallback cuối)
        COALESCE(
          u_payer.full_name,
          u_shift_owner.full_name,
          u_creator.full_name
        )                   AS thu_ngan,
        COALESCE(
          u_payer.username,
          u_shift_owner.username,
          u_creator.username
        )                   AS thu_ngan_username,
        ca.id                AS ca_lam_id,
        ca.started_at        AS ca_bat_dau,
        ca.nhan_vien_id      AS ca_nhan_vien_id
      FROM don_hang dh
      LEFT JOIN ban b ON b.id = dh.ban_id
      LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
      -- JOIN với users để lấy người tạo đơn
      LEFT JOIN users u_creator ON u_creator.user_id = dh.nhan_vien_id
      -- JOIN với order_payment để lấy người thanh toán (lấy payment đầu tiên có created_by)
      LEFT JOIN LATERAL (
        SELECT created_by
        FROM order_payment
        WHERE order_id = dh.id
          AND created_by IS NOT NULL
        ORDER BY 
          CASE WHEN status = 'CAPTURED' THEN 0 ELSE 1 END,
          created_at ASC
        LIMIT 1
      ) first_payment ON true
      LEFT JOIN users u_payer ON u_payer.user_id = first_payment.created_by
      -- JOIN với ca_lam để lấy người sở hữu ca (fallback)
      LEFT JOIN ca_lam ca ON ca.id = dh.ca_lam_id
      LEFT JOIN users u_shift_owner ON u_shift_owner.user_id = ca.nhan_vien_id
    `);
    
    console.log('✅ Đã cập nhật view v_invoice_header');
    
    // Kiểm tra đơn #286
    const result = await client.query(`
      SELECT order_id, nguoi_tao_don, thu_ngan 
      FROM v_invoice_header 
      WHERE order_id = 286
    `);
    console.log('\n📋 Kiểm tra đơn #286:');
    console.log(result.rows[0]);
    
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
