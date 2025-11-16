const { pool } = require('./src/db.js');

async function test() {
  try {
    // Lấy thông tin ca 54
    const ca = await pool.query('SELECT nhan_vien_id, started_at, closed_at FROM ca_lam WHERE id = 54');
    const caData = ca.rows[0];
    console.log('Ca 54:', caData);
    
    // Query cũ: tính theo maker_id và thời gian
    const oldQuery = await pool.query(`
      SELECT COUNT(*) as total
      FROM don_hang_chi_tiet
      WHERE maker_id = $1
        AND trang_thai_che_bien = 'DONE'
        AND started_at >= $2
        AND (started_at < $3 OR $3 IS NULL)
    `, [caData.nhan_vien_id, caData.started_at, caData.closed_at]);
    console.log('Query cũ (maker_id + thời gian):', oldQuery.rows[0].total);
    
    // Query mới: tính theo ca_lam_id
    const newQuery = await pool.query(`
      SELECT COUNT(*) as total
      FROM don_hang_chi_tiet ct
      INNER JOIN don_hang dh ON dh.id = ct.don_hang_id
      WHERE dh.ca_lam_id = 54
        AND ct.trang_thai_che_bien = 'DONE'
    `);
    console.log('Query mới (ca_lam_id):', newQuery.rows[0].total);
    
    // Kiểm tra món DONE của nhân viên này trong khoảng thời gian
    const detailQuery = await pool.query(`
      SELECT ct.id, ct.trang_thai_che_bien, ct.maker_id, ct.started_at, dh.ca_lam_id, dh.id as don_hang_id
      FROM don_hang_chi_tiet ct
      LEFT JOIN don_hang dh ON dh.id = ct.don_hang_id
      WHERE ct.maker_id = $1
        AND ct.trang_thai_che_bien = 'DONE'
        AND ct.started_at >= $2
        AND (ct.started_at < $3 OR $3 IS NULL)
      LIMIT 10
    `, [caData.nhan_vien_id, caData.started_at, caData.closed_at]);
    console.log('Chi tiết món DONE:', JSON.stringify(detailQuery.rows, null, 2));
    
    // Món CANCELLED
    const cancelledQuery = await pool.query(`
      SELECT COUNT(*) as total
      FROM don_hang_chi_tiet ct
      INNER JOIN don_hang dh ON dh.id = ct.don_hang_id
      WHERE dh.ca_lam_id = 54
        AND ct.trang_thai_che_bien = 'CANCELLED'
    `);
    console.log('Món CANCELLED:', cancelledQuery.rows[0].total);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

test();

