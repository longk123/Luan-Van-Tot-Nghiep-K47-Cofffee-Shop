// Migration: Thêm role WAITER (Phục vụ/Giao hàng)
// Run: node backend/migrate-add-waiter-role.cjs

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
    console.log('🚀 Bắt đầu migration: Thêm role WAITER...\n');
    await client.query('BEGIN');

    // 1. Thêm role WAITER
    console.log('📝 1. Thêm role WAITER vào bảng roles...');
    const roleResult = await client.query(`
      INSERT INTO roles (role_name, description)
      VALUES ('WAITER', 'Nhân viên phục vụ và giao hàng - Có thể phục vụ tại quán và đi giao hàng')
      ON CONFLICT (role_name) DO UPDATE SET
        description = EXCLUDED.description
      RETURNING role_id, role_name
    `);
    
    if (roleResult.rows.length > 0) {
      console.log(`   ✅ Đã thêm/cập nhật role: ${roleResult.rows[0].role_name} (ID: ${roleResult.rows[0].role_id})`);
    } else {
      const existingRole = await client.query(`SELECT role_id, role_name FROM roles WHERE role_name = 'WAITER'`);
      if (existingRole.rows.length > 0) {
        console.log(`   ✅ Role WAITER đã tồn tại (ID: ${existingRole.rows[0].role_id})`);
      }
    }

    // 2. (Optional) Tạo user mẫu với role WAITER
    console.log('\n📝 2. Tạo user mẫu với role WAITER (nếu chưa có)...');
    
    // Kiểm tra xem đã có user với role WAITER chưa
    const existingWaiter = await client.query(`
      SELECT u.user_id, u.username
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.user_id
      JOIN roles r ON r.role_id = ur.role_id
      WHERE r.role_name = 'WAITER'
      LIMIT 1
    `);
    
    if (existingWaiter.rows.length === 0) {
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('waiter123', 10);
      
      const userResult = await client.query(`
        INSERT INTO users (username, password_hash, full_name, is_active)
        VALUES ('waiter01', $1, 'Nhân viên Phục vụ 01', TRUE)
        ON CONFLICT (username) DO NOTHING
        RETURNING user_id, username
      `, [passwordHash]);
      
      if (userResult.rows.length > 0) {
        const userId = userResult.rows[0].user_id;
        const waiterRoleId = roleResult.rows[0]?.role_id || (await client.query(`SELECT role_id FROM roles WHERE role_name = 'WAITER'`)).rows[0].role_id;
        
        await client.query(`
          INSERT INTO user_roles (user_id, role_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [userId, waiterRoleId]);
        
        console.log(`   ✅ Đã tạo user mẫu: waiter01 (ID: ${userId})`);
        console.log(`   ✅ Mật khẩu: waiter123`);
      } else {
        console.log('   ℹ️ User waiter01 đã tồn tại, chỉ cần gán role...');
        const existingUser = await client.query(`SELECT user_id FROM users WHERE username = 'waiter01'`);
        if (existingUser.rows.length > 0) {
          const userId = existingUser.rows[0].user_id;
          const waiterRoleId = roleResult.rows[0]?.role_id || (await client.query(`SELECT role_id FROM roles WHERE role_name = 'WAITER'`)).rows[0].role_id;
          
          await client.query(`
            INSERT INTO user_roles (user_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `, [userId, waiterRoleId]);
          
          console.log(`   ✅ Đã gán role WAITER cho user waiter01`);
        }
      }
    } else {
      console.log(`   ✅ Đã có user với role WAITER: ${existingWaiter.rows[0].username}`);
    }

    // 3. Thêm cột shipper_id vào don_hang_delivery_info (nếu chưa có)
    console.log('\n📝 3. Thêm cột shipper_id vào don_hang_delivery_info...');
    await client.query(`
      ALTER TABLE don_hang_delivery_info
      ADD COLUMN IF NOT EXISTS shipper_id INT REFERENCES users(user_id)
    `);
    console.log('   ✅ Đã thêm cột shipper_id (nếu chưa có)');

    // 4. Thêm cột delivery_status (nếu chưa có)
    console.log('\n📝 4. Thêm cột delivery_status vào don_hang_delivery_info...');
    await client.query(`
      ALTER TABLE don_hang_delivery_info
      ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'PENDING'
    `);
    
    // Thêm constraint nếu chưa có
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_delivery_status'
        ) THEN
          ALTER TABLE don_hang_delivery_info
          ADD CONSTRAINT chk_delivery_status
          CHECK (delivery_status IN ('PENDING', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'));
        END IF;
      END$$;
    `);
    console.log('   ✅ Đã thêm cột delivery_status với constraint');

    // 5. Tạo index cho shipper_id
    console.log('\n📝 5. Tạo index cho shipper_id...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_delivery_info_shipper_id
      ON don_hang_delivery_info(shipper_id)
    `);
    console.log('   ✅ Đã tạo index cho shipper_id');

    await client.query('COMMIT');
    
    console.log('\n✅ Migration hoàn tất!');
    console.log('\n📋 Tóm tắt:');
    console.log('   ✅ Role WAITER đã được thêm vào hệ thống');
    console.log('   ✅ User mẫu: waiter01 / waiter123');
    console.log('   ✅ Cột shipper_id và delivery_status đã được thêm');
    console.log('\n🎯 Bước tiếp theo:');
    console.log('   1. Tạo thêm user với role WAITER nếu cần');
    console.log('   2. Implement UI phân công đơn cho nhân viên phục vụ');
    console.log('   3. Implement tracking trạng thái giao hàng');
    
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

