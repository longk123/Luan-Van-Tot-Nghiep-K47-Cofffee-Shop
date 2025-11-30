// Migration: Cập nhật view hóa đơn để hiển thị cả người tạo đơn và người thanh toán
// Ngày tạo: 2025-01-XX
// Mô tả: Khi Waiter tạo đơn, cần hiển thị cả người tạo đơn (Waiter) và người thanh toán (Cashier)

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Cập nhật view v_invoice_header để hiển thị cả người tạo đơn và người thanh toán...\n');
    
    await client.query('BEGIN');
    
    // Drop view cũ trước (để tránh lỗi thay đổi tên cột)
    console.log('🗑️ Drop view cũ...');
    await client.query(`DROP VIEW IF EXISTS v_invoice_header CASCADE`);
    
    // Tạo lại view v_invoice_header với các cột mới
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
        -- Người thanh toán (từ payment đầu tiên, hoặc người tạo đơn nếu chưa thanh toán)
        COALESCE(
          u_payer.full_name,
          u_creator.full_name
        )                   AS thu_ngan,
        COALESCE(
          u_payer.username,
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
      -- JOIN với order_payment để lấy người thanh toán (lấy payment đầu tiên)
      -- Lấy payment có status = 'CAPTURED' hoặc payment đầu tiên nếu không có CAPTURED
      LEFT JOIN LATERAL (
        SELECT created_by
        FROM order_payment
        WHERE order_id = dh.id
        ORDER BY 
          CASE WHEN status = 'CAPTURED' THEN 0 ELSE 1 END,
          created_at ASC
        LIMIT 1
      ) first_payment ON true
      LEFT JOIN users u_payer ON u_payer.user_id = first_payment.created_by
      LEFT JOIN ca_lam ca ON ca.id = dh.ca_lam_id
    `);
    
    console.log('✅ Đã cập nhật view v_invoice_header');
    
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

migrate().catch(console.error);

