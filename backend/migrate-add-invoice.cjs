// migrate-add-invoice.cjs
// Migration: Thêm hệ thống in hóa đơn/xuất PDF
// Date: 2025-10-22

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Bắt đầu migration: Hệ thống in hóa đơn...');
    
    await client.query('BEGIN');
    
    // 1. View: Lines + addons (cho mọi trạng thái, không chỉ OPEN)
    console.log('📊 Tạo view v_order_items_with_addons (all orders)...');
    await client.query(`
      CREATE OR REPLACE VIEW v_order_items_with_addons AS
      WITH base AS (
        SELECT
          o.id AS order_id,
          d.id AS line_id,
          d.mon_id,
          m.ten AS ten_mon,
          d.bien_the_id,
          mbt.ten_bien_the,
          d.so_luong,
          d.don_gia,
          COALESCE(d.giam_gia,0) AS giam_gia,
          (d.so_luong*d.don_gia - COALESCE(d.giam_gia,0)) AS base_line_total,
          d.ghi_chu,
          d.trang_thai_che_bien
        FROM don_hang o
        JOIN don_hang_chi_tiet d ON d.don_hang_id=o.id
        LEFT JOIN mon m ON m.id=d.mon_id
        LEFT JOIN mon_bien_the mbt ON mbt.id=d.bien_the_id
      ),
      tops AS (
        SELECT line_id, COALESCE(SUM(tien_topping_line),0)::INT AS topping_total
        FROM v_line_option_amount_pricing
        GROUP BY line_id
      ),
      opts AS (
        SELECT
          d.id AS line_id,
          jsonb_agg(
            jsonb_build_object(
              'ma',  tc.ma,
              'ten', tc.ten,
              'loai', tc.loai,
              'don_vi', tc.don_vi,
              'muc', COALESCE(m.ten,NULL),
              'he_so', o.he_so,
              'so_luong', o.so_luong
            )
            ORDER BY tc.ma
          ) FILTER (WHERE o.id IS NOT NULL) AS options
        FROM don_hang_chi_tiet d
        LEFT JOIN don_hang_chi_tiet_tuy_chon o ON o.line_id=d.id
        LEFT JOIN tuy_chon_mon tc ON tc.id=o.tuy_chon_id
        LEFT JOIN tuy_chon_muc m ON m.id=o.muc_id
        GROUP BY d.id
      )
      SELECT
        b.*,
        COALESCE(t.topping_total,0) AS topping_total,
        (b.base_line_total + COALESCE(t.topping_total,0))::INT AS line_total_with_addons,
        o.options
      FROM base b
      LEFT JOIN tops t ON t.line_id=b.line_id
      LEFT JOIN opts o ON o.line_id=b.line_id
      ORDER BY b.line_id
    `);
    
    // 2. View: Header hóa đơn
    console.log('📋 Tạo view v_invoice_header...');
    await client.query(`
      CREATE OR REPLACE VIEW v_invoice_header AS
      SELECT
        dh.id                 AS order_id,
        dh.order_type,
        dh.trang_thai         AS order_status,
        dh.opened_at,
        dh.closed_at,
        dh.ban_id,
        CASE
          WHEN dh.order_type='TAKEAWAY' THEN 'Mang đi'
          WHEN dh.ban_id IS NOT NULL    THEN 'Bàn '||dh.ban_id::text
          ELSE 'Không xác định'
        END                  AS ban_label,
        kv.ten               AS khu_vuc,
        u.full_name          AS thu_ngan,
        ca.id                AS ca_lam_id,
        ca.started_at        AS ca_bat_dau
      FROM don_hang dh
      LEFT JOIN ban b ON b.id = dh.ban_id
      LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
      LEFT JOIN users u ON u.user_id = dh.nhan_vien_id
      LEFT JOIN ca_lam ca ON ca.id = dh.ca_lam_id
    `);
    
    // 3. View: Dòng hàng hóa đơn
    console.log('📝 Tạo view v_invoice_lines...');
    await client.query(`
      CREATE OR REPLACE VIEW v_invoice_lines AS
      SELECT
        l.order_id,
        l.line_id,
        l.ten_mon,
        l.ten_bien_the,
        l.so_luong,
        l.don_gia,
        l.giam_gia,
        l.base_line_total,
        l.topping_total,
        l.line_total_with_addons,
        l.ghi_chu,
        l.options
      FROM v_order_items_with_addons l
    `);
    
    // 4. View: Khuyến mãi
    console.log('🎁 Tạo view v_invoice_promotions...');
    await client.query(`
      CREATE OR REPLACE VIEW v_invoice_promotions AS
      SELECT
        dhkm.don_hang_id AS order_id,
        dhkm.khuyen_mai_id AS promo_id,
        km.ma,
        km.ten,
        km.loai,
        km.gia_tri,
        km.max_giam,
        dhkm.so_tien_giam
      FROM don_hang_khuyen_mai dhkm
      JOIN khuyen_mai km ON km.id = dhkm.khuyen_mai_id
    `);
    
    // 5. View: Thanh toán
    console.log('💳 Tạo view v_invoice_payments...');
    await client.query(`
      CREATE OR REPLACE VIEW v_invoice_payments AS
      SELECT
        p.order_id,
        p.id            AS payment_id,
        p.method_code,
        pm.name         AS method_name,
        p.status,
        p.amount,
        p.amount_tendered,
        p.change_given,
        p.currency,
        p.tx_ref,
        p.note,
        p.created_at
      FROM order_payment p
      LEFT JOIN payment_method pm ON pm.code = p.method_code
      ORDER BY p.id
    `);
    
    // 6. Sequence và bảng log in hóa đơn (tùy chọn)
    console.log('🔢 Tạo sequence và bảng log in hóa đơn...');
    await client.query(`CREATE SEQUENCE IF NOT EXISTS seq_invoice_no START 1001`);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS hoa_don_print_log (
        id           SERIAL PRIMARY KEY,
        order_id     INT NOT NULL REFERENCES don_hang(id) ON DELETE CASCADE,
        invoice_no   BIGINT NOT NULL DEFAULT nextval('seq_invoice_no'),
        printed_by   INT REFERENCES users(user_id),
        printed_at   TIMESTAMPTZ DEFAULT now(),
        copy_no      INT DEFAULT 1,
        note         TEXT
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hdlog_order ON hoa_don_print_log(order_id)
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Migration hoàn tất!');
    console.log('');
    console.log('📋 Đã tạo:');
    console.log('  - View: v_order_items_with_addons (all orders)');
    console.log('  - View: v_invoice_header');
    console.log('  - View: v_invoice_lines');
    console.log('  - View: v_invoice_promotions');
    console.log('  - View: v_invoice_payments');
    console.log('  - Sequence: seq_invoice_no');
    console.log('  - Table: hoa_don_print_log');
    console.log('');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});

