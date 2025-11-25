// backend/create-test-accounts.cjs
// Script tạo đầy đủ các tài khoản test cho tất cả roles

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
});

async function createTestAccounts() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Bắt đầu tạo tài khoản test...\n');
    await client.query('BEGIN');

    // Danh sách tài khoản cần tạo
    const testAccounts = [
      {
        username: 'admin',
        password: '123456',
        full_name: 'Quản trị viên',
        email: 'admin@coffee.com',
        roles: ['admin']
      },
      {
        username: 'manager01',
        password: 'manager123',
        full_name: 'Quản lý 01',
        email: 'manager01@coffee.com',
        roles: ['manager']
      },
      {
        username: 'cashier01',
        password: 'cashier123',
        full_name: 'Thu Ngân 01',
        email: 'cashier01@coffee.com',
        roles: ['cashier']
      },
      {
        username: 'kitchen01',
        password: 'kitchen123',
        full_name: 'Pha chế 01',
        email: 'kitchen01@coffee.com',
        roles: ['kitchen']
      },
      {
        username: 'waiter01',
        password: 'waiter123',
        full_name: 'Phục vụ 01',
        email: 'waiter01@coffee.com',
        roles: ['waiter']
      }
    ];

    // Lấy tất cả roles từ database
    const rolesResult = await client.query(`
      SELECT role_id, role_name FROM roles
    `);
    const rolesMap = {};
    rolesResult.rows.forEach(role => {
      rolesMap[role.role_name] = role.role_id;
    });

    console.log('📋 Danh sách roles có sẵn:');
    Object.keys(rolesMap).forEach(roleName => {
      console.log(`   - ${roleName} (ID: ${rolesMap[roleName]})`);
    });
    console.log('');

    // Tạo từng tài khoản
    for (const account of testAccounts) {
      console.log(`👤 Đang xử lý: ${account.username}...`);

      // Kiểm tra user đã tồn tại chưa
      const existingUser = await client.query(`
        SELECT user_id FROM users WHERE username = $1
      `, [account.username]);

      let userId;

      if (existingUser.rows.length > 0) {
        // User đã tồn tại, cập nhật password
        userId = existingUser.rows[0].user_id;
        const passwordHash = await bcrypt.hash(account.password, 10);
        
        await client.query(`
          UPDATE users 
          SET 
            password_hash = $1,
            full_name = $2,
            email = $3,
            is_active = true
          WHERE user_id = $4
        `, [passwordHash, account.full_name, account.email, userId]);
        
        console.log(`   ✅ Đã cập nhật user: ${account.username}`);
      } else {
        // Tạo user mới
        const passwordHash = await bcrypt.hash(account.password, 10);
        
        const result = await client.query(`
          INSERT INTO users (username, password_hash, full_name, email, is_active, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING user_id
        `, [account.username, passwordHash, account.full_name, account.email, true]);
        
        userId = result.rows[0].user_id;
        console.log(`   ✅ Đã tạo user mới: ${account.username} (ID: ${userId})`);
      }

      // Xóa tất cả roles cũ
      await client.query(`
        DELETE FROM user_roles WHERE user_id = $1
      `, [userId]);

      // Gán roles mới
      for (const roleName of account.roles) {
        const roleId = rolesMap[roleName];
        
        if (!roleId) {
          console.log(`   ⚠️  Cảnh báo: Role "${roleName}" không tồn tại trong database!`);
          continue;
        }

        await client.query(`
          INSERT INTO user_roles (user_id, role_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id, role_id) DO NOTHING
        `, [userId, roleId]);
        
        console.log(`   ✅ Đã gán role: ${roleName}`);
      }
    }

    await client.query('COMMIT');
    
    console.log('\n🎉 Hoàn tất tạo tài khoản test!\n');
    console.log('📋 Danh sách tài khoản:');
    console.log('');
    console.log('👑 Admin:');
    console.log('   Username: admin');
    console.log('   Password: 123456');
    console.log('   Quyền: Tất cả quyền');
    console.log('');
    console.log('👔 Manager:');
    console.log('   Username: manager01');
    console.log('   Password: manager123');
    console.log('   Quyền: Quản lý (reports, menu, tables, shifts)');
    console.log('');
    console.log('💳 Cashier:');
    console.log('   Username: cashier01');
    console.log('   Password: cashier123');
    console.log('   Quyền: Thu ngân (POS, payments)');
    console.log('');
    console.log('👨‍🍳 Kitchen:');
    console.log('   Username: kitchen01');
    console.log('   Password: kitchen123');
    console.log('   Quyền: Bếp/Pha chế (Kitchen Display)');
    console.log('');
    console.log('🍽️  Waiter (Phục vụ):');
    console.log('   Username: waiter01');
    console.log('   Password: waiter123');
    console.log('   Quyền: Phục vụ (tạo đơn tại bàn, mang đi)');
    console.log('');
    console.log('⚠️  Lưu ý: Tất cả mật khẩu chỉ dùng cho môi trường test!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi khi tạo tài khoản test:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy script
createTestAccounts()
  .then(() => {
    console.log('\n✅ Script hoàn thành!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Lỗi:', error);
    process.exit(1);
  });

