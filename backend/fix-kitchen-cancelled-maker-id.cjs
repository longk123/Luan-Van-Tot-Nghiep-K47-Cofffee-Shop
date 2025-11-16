const { pool } = require('./src/db.js');

async function fixMakerId() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Tìm các món CANCELLED có ghi_chu "[Hủy bởi pha chế]" nhưng maker_id = NULL
    const { rows: items } = await client.query(`
      SELECT 
        ct.id,
        ct.don_hang_id,
        ct.ghi_chu,
        ct.created_at,
        dh.ca_lam_id,
        ca.nhan_vien_id
      FROM don_hang_chi_tiet ct
      INNER JOIN don_hang dh ON dh.id = ct.don_hang_id
      LEFT JOIN ca_lam ca ON ca.id = dh.ca_lam_id
      WHERE ct.trang_thai_che_bien = 'CANCELLED'
        AND ct.maker_id IS NULL
        AND ct.ghi_chu LIKE '%[Hủy bởi pha chế]%'
      ORDER BY ct.created_at DESC
    `);

    console.log(`📋 Tìm thấy ${items.length} món CANCELLED có ghi_chu "[Hủy bởi pha chế]" nhưng maker_id = NULL`);

    if (items.length === 0) {
      console.log('✅ Không có món nào cần sửa');
      await client.query('COMMIT');
      return;
    }

    // Cập nhật maker_id dựa trên ca_lam_id
    let updatedCount = 0;
    for (const item of items) {
      if (item.ca_lam_id && item.nhan_vien_id) {
        await client.query(
          `UPDATE don_hang_chi_tiet 
           SET maker_id = $1 
           WHERE id = $2`,
          [item.nhan_vien_id, item.id]
        );
        updatedCount++;
        console.log(`  ✅ Đã cập nhật món #${item.id}: maker_id = ${item.nhan_vien_id} (từ ca #${item.ca_lam_id})`);
      } else {
        console.log(`  ⚠️  Món #${item.id}: Không có ca_lam_id hoặc nhan_vien_id, bỏ qua`);
      }
    }

    await client.query('COMMIT');
    console.log(`\n✅ Đã cập nhật ${updatedCount}/${items.length} món`);

    // Kiểm tra lại
    const checkResult = await client.query(`
      SELECT COUNT(*) as total
      FROM don_hang_chi_tiet
      WHERE trang_thai_che_bien = 'CANCELLED'
        AND maker_id IS NULL
        AND ghi_chu LIKE '%[Hủy bởi pha chế]%'
    `);
    console.log(`\n📊 Số món CANCELLED còn lại có maker_id = NULL: ${checkResult.rows[0].total}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixMakerId();

