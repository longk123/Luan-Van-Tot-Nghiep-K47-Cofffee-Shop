const { pool } = require('./src/db.js');

async function createView() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop view nếu đã tồn tại
    await client.query('DROP VIEW IF EXISTS v_kitchen_cancelled_items CASCADE;');

    // Tạo view mới
    const createViewSQL = `
      CREATE OR REPLACE VIEW v_kitchen_cancelled_items AS
      SELECT 
        ct.id AS line_id,
        ct.don_hang_id,
        ct.mon_id,
        ct.bien_the_id,
        ct.so_luong,
        ct.ghi_chu,
        ct.trang_thai_che_bien,
        ct.maker_id,
        ct.created_at AS cancelled_at,
        ct.started_at,
        ct.finished_at,
        -- Thông tin món
        m.ten AS mon_ten,
        m.ma AS mon_ma,
        btm.ten_bien_the AS bien_the_ten,
        -- Thông tin đơn hàng
        dh.ca_lam_id,
        dh.order_type,
        dh.ban_id,
        dh.trang_thai AS don_hang_trang_thai,
        dh.opened_at AS don_hang_opened_at,
        -- Thông tin bàn
        b.ten_ban,
        b.khu_vuc_id,
        kv.ten AS khu_vuc_ten,
        -- Thông tin nhân viên hủy
        u.user_id AS maker_user_id,
        u.full_name AS maker_full_name,
        u.username AS maker_username,
        u.email AS maker_email,
        -- Thông tin ca làm
        ca.id AS ca_lam_id_full,
        ca.nhan_vien_id AS ca_nhan_vien_id,
        ca.started_at AS ca_started_at,
        ca.closed_at AS ca_closed_at,
        ca.shift_type AS ca_shift_type,
        -- Kiểm tra xem có phải hủy bởi pha chế không
        CASE 
          WHEN ct.maker_id IS NOT NULL THEN true
          WHEN ct.ghi_chu LIKE '%[Hủy bởi pha chế]%' THEN true
          ELSE false
        END AS is_kitchen_cancelled
      FROM don_hang_chi_tiet ct
      INNER JOIN don_hang dh ON dh.id = ct.don_hang_id
      LEFT JOIN mon m ON m.id = ct.mon_id
      LEFT JOIN mon_bien_the btm ON btm.id = ct.bien_the_id
      LEFT JOIN ban b ON b.id = dh.ban_id
      LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
      LEFT JOIN users u ON u.user_id = ct.maker_id
      LEFT JOIN ca_lam ca ON ca.id = dh.ca_lam_id
      WHERE ct.trang_thai_che_bien = 'CANCELLED'
        AND (
          -- Có maker_id (được hủy bởi pha chế)
          ct.maker_id IS NOT NULL
          -- HOẶC có ghi_chu chứa "[Hủy bởi pha chế]"
          OR ct.ghi_chu LIKE '%[Hủy bởi pha chế]%'
        )
      ORDER BY ct.created_at DESC;
    `;

    await client.query(createViewSQL);

    // Tạo comment cho view
    await client.query(`
      COMMENT ON VIEW v_kitchen_cancelled_items IS 
      'View hiển thị các món bị hủy do pha chế. Bao gồm các món có maker_id được set hoặc có ghi_chu chứa "[Hủy bởi pha chế]"';
    `);

    await client.query('COMMIT');
    console.log('✅ Đã tạo view v_kitchen_cancelled_items thành công!');

    // Test view
    const testResult = await client.query('SELECT COUNT(*) as total FROM v_kitchen_cancelled_items');
    console.log(`📊 Tổng số món bị hủy bởi pha chế: ${testResult.rows[0].total}`);

    // Hiển thị một vài mẫu
    const sampleResult = await client.query(`
      SELECT 
        line_id,
        mon_ten,
        maker_full_name,
        maker_username,
        cancelled_at,
        ca_lam_id,
        is_kitchen_cancelled
      FROM v_kitchen_cancelled_items
      ORDER BY cancelled_at DESC
      LIMIT 5
    `);
    console.log('\n📋 Mẫu dữ liệu (5 món gần nhất):');
    console.log(JSON.stringify(sampleResult.rows, null, 2));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi khi tạo view:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createView();

