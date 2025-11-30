import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  database: 'coffee_shop',
  user: 'postgres',
  password: '123456',
  port: 5432
});

console.log('\n📊 KIỂM TRA DỮ LIỆU KITCHEN\n');

try {
  // Check shift_type cho kitchen users
  let r = await pool.query(`
    SELECT cl.id, cl.shift_type, u.username 
    FROM ca_lam cl 
    JOIN users u ON cl.nhan_vien_id = u.user_id 
    JOIN user_roles ur ON u.user_id = ur.user_id
    JOIN roles ro ON ur.role_id = ro.role_id
    WHERE cl.status = 'OPEN' AND ro.role_name = 'kitchen' AND cl.shift_type != 'KITCHEN'
  `);
  console.log(r.rows.length === 0 ? '✅ Kitchen shift_type = KITCHEN' : '❌ Kitchen shift_type sai: ' + JSON.stringify(r.rows));
  
  // Check có items trong queue không  
  r = await pool.query(`SELECT trang_thai_che_bien, COUNT(*) as count FROM don_hang_chi_tiet GROUP BY trang_thai_che_bien ORDER BY count DESC`);
  console.log('✅ Trạng thái món:');
  r.rows.forEach(row => console.log(`   ${row.trang_thai_che_bien}: ${row.count}`));
  
  // Check orders in queue with valid status
  r = await pool.query(`SELECT COUNT(*) as count FROM don_hang_chi_tiet WHERE trang_thai_che_bien IN ('QUEUED', 'MAKING')`);
  console.log(`✅ Món đang chờ/đang làm: ${r.rows[0].count}`);
  
  console.log('\n✅ KIỂM TRA HOÀN TẤT\n');
} catch (err) {
  console.log('❌ Lỗi:', err.message);
} finally {
  await pool.end();
}
