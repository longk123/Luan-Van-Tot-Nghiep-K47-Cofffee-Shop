// backend/debug-shift-type.cjs
// Script debug shift_type

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function debugShiftType() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debug shift_type...\n');
    
    // 1. Kiểm tra ca hiện tại
    const currentShifts = await client.query(`
      SELECT 
        id,
        nhan_vien_id,
        shift_type,
        status,
        started_at,
        ended_at
      FROM ca_lam 
      WHERE status = 'OPEN'
      ORDER BY started_at DESC
    `);
    
    console.log('📊 Ca OPEN hiện tại:');
    currentShifts.rows.forEach(shift => {
      console.log(`  - Ca #${shift.id}: shift_type = "${shift.shift_type}", status = "${shift.status}"`);
    });
    
    // 2. Kiểm tra user roles
    const userRoles = await client.query(`
      SELECT 
        u.user_id,
        u.username,
        u.full_name,
        array_agg(r.role_name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.user_id
      LEFT JOIN roles r ON r.role_id = ur.role_id
      WHERE u.is_active = true
      GROUP BY u.user_id, u.username, u.full_name
      ORDER BY u.user_id
    `);
    
    console.log('\n👥 Users và roles:');
    userRoles.rows.forEach(user => {
      const roles = user.roles.filter(r => r !== null);
      console.log(`  - ${user.username} (${user.full_name}): [${roles.join(', ') || 'No roles'}]`);
    });
    
    // 3. Test tạo ca mới với shift_type
    console.log('\n🧪 Test tạo ca mới...');
    
    // Tìm user kitchen
    const kitchenUser = await client.query(`
      SELECT u.user_id, u.username
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.user_id
      JOIN roles r ON r.role_id = ur.role_id
      WHERE r.role_name = 'kitchen'
      LIMIT 1
    `);
    
    if (kitchenUser.rows.length > 0) {
      const userId = kitchenUser.rows[0].user_id;
      console.log(`  - Tìm thấy user kitchen: ${kitchenUser.rows[0].username} (ID: ${userId})`);
      
      // Đóng ca cũ nếu có
      await client.query(`
        UPDATE ca_lam 
        SET ended_at = NOW() + INTERVAL '1 minute', status = 'CLOSED', closed_at = NOW()
        WHERE nhan_vien_id = $1 AND status = 'OPEN'
      `, [userId]);
      
      // Tạo ca mới với shift_type = KITCHEN
      const newShift = await client.query(`
        INSERT INTO ca_lam (nhan_vien_id, started_at, status, shift_type, opening_cash, opened_by)
        VALUES ($1, NOW(), 'OPEN', 'KITCHEN', 0, $1)
        RETURNING id, shift_type, status
      `, [userId]);
      
      console.log(`  ✅ Đã tạo ca mới: #${newShift.rows[0].id}, shift_type = "${newShift.rows[0].shift_type}"`);
      
      // Kiểm tra lại
      const checkShift = await client.query(`
        SELECT id, shift_type, status, started_at
        FROM ca_lam 
        WHERE id = $1
      `, [newShift.rows[0].id]);
      
      console.log(`  📋 Ca vừa tạo:`, checkShift.rows[0]);
      
    } else {
      console.log('  ❌ Không tìm thấy user kitchen');
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy script
debugShiftType()
  .then(() => {
    console.log('\n🎉 Hoàn thành debug!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Lỗi:', error);
    process.exit(1);
  });
