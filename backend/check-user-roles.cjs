// backend/check-user-roles.cjs
// Script kiểm tra roles của users

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function checkUserRoles() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Kiểm tra users và roles...\n');
    
    // 1. Kiểm tra tất cả users
    const users = await client.query(`
      SELECT user_id, username, full_name, is_active
      FROM users 
      ORDER BY user_id
    `);
    
    console.log('👥 Tất cả users:');
    users.rows.forEach(user => {
      console.log(`  - ID ${user.user_id}: ${user.username} (${user.full_name}) - Active: ${user.is_active}`);
    });
    
    // 2. Kiểm tra roles
    const roles = await client.query(`
      SELECT role_id, role_name, description
      FROM roles 
      ORDER BY role_id
    `);
    
    console.log('\n🎭 Tất cả roles:');
    roles.rows.forEach(role => {
      console.log(`  - ID ${role.role_id}: ${role.role_name} (${role.description || 'No description'})`);
    });
    
    // 3. Kiểm tra user_roles
    const userRoles = await client.query(`
      SELECT 
        ur.user_id,
        u.username,
        ur.role_id,
        r.role_name
      FROM user_roles ur
      JOIN users u ON u.user_id = ur.user_id
      JOIN roles r ON r.role_id = ur.role_id
      ORDER BY ur.user_id, ur.role_id
    `);
    
    console.log('\n🔗 User-Role assignments:');
    if (userRoles.rows.length === 0) {
      console.log('  ❌ Không có user nào được gán role!');
    } else {
      userRoles.rows.forEach(ur => {
        console.log(`  - User ${ur.username} (ID: ${ur.user_id}) → Role: ${ur.role_name} (ID: ${ur.role_id})`);
      });
    }
    
    // 4. Tạo user pha chế nếu chưa có
    console.log('\n🔧 Tạo user pha chế nếu cần...');
    
    // Kiểm tra xem có user pha chế không
    const kitchenUsers = await client.query(`
      SELECT u.user_id, u.username
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.user_id
      JOIN roles r ON r.role_id = ur.role_id
      WHERE r.role_name = 'kitchen'
    `);
    
    if (kitchenUsers.rows.length === 0) {
      console.log('  📝 Tạo user pha chế...');
      
      // Tạo user
      const newUser = await client.query(`
        INSERT INTO users (username, password_hash, full_name, is_active)
        VALUES ('kitchen01', '$2b$10$dummy', 'Pha chế 01', true)
        ON CONFLICT (username) DO NOTHING
        RETURNING user_id, username
      `);
      
      if (newUser.rows.length > 0) {
        const userId = newUser.rows[0].user_id;
        console.log(`    ✅ Đã tạo user: ${newUser.rows[0].username} (ID: ${userId})`);
        
        // Gán role kitchen
        const kitchenRole = await client.query(`SELECT role_id FROM roles WHERE role_name = 'kitchen'`);
        if (kitchenRole.rows.length > 0) {
          await client.query(`
            INSERT INTO user_roles (user_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, role_id) DO NOTHING
          `, [userId, kitchenRole.rows[0].role_id]);
          
          console.log(`    ✅ Đã gán role 'kitchen' cho user ${userId}`);
        } else {
          console.log('    ❌ Không tìm thấy role "kitchen"');
        }
      } else {
        console.log('    ℹ️ User "kitchen01" đã tồn tại');
      }
    } else {
      console.log('  ✅ Đã có user pha chế:', kitchenUsers.rows.map(u => u.username).join(', '));
    }
    
    // 5. Kiểm tra lại sau khi tạo
    console.log('\n🔍 Kiểm tra lại sau khi tạo...');
    const finalCheck = await client.query(`
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
    
    console.log('👥 Users với roles:');
    finalCheck.rows.forEach(user => {
      const roles = user.roles.filter(r => r !== null);
      console.log(`  - ${user.username} (${user.full_name}): [${roles.join(', ') || 'No roles'}]`);
    });
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy script
checkUserRoles()
  .then(() => {
    console.log('\n🎉 Hoàn thành!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Lỗi:', error);
    process.exit(1);
  });
