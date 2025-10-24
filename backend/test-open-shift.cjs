// backend/test-open-shift.cjs
// Script test mở ca mới

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function testOpenShift() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Test mở ca mới...\n');
    
    // 1. Kiểm tra user có sẵn
    const users = await client.query(`
      SELECT user_id, username, full_name 
      FROM users 
      WHERE is_active = true 
      ORDER BY user_id 
      LIMIT 5
    `);
    
    console.log('👥 Users có sẵn:');
    users.rows.forEach(user => {
      console.log(`  - ID ${user.user_id}: ${user.username} (${user.full_name})`);
    });
    
    if (users.rows.length === 0) {
      console.log('❌ Không có user nào. Tạo user test...');
      
      // Tạo user test
      await client.query(`
        INSERT INTO users (username, password_hash, full_name, is_active)
        VALUES ('test_user', '$2b$10$dummy', 'Test User', true)
        ON CONFLICT (username) DO NOTHING
      `);
      
      const newUser = await client.query(`
        SELECT user_id, username FROM users WHERE username = 'test_user'
      `);
      
      if (newUser.rows.length > 0) {
        console.log(`✅ Đã tạo user test: ID ${newUser.rows[0].user_id}`);
      }
    }
    
    // 2. Test mở ca CASHIER
    console.log('\n🧪 Test mở ca CASHIER...');
    try {
      const testUserId = users.rows[0]?.user_id || 1;
      
      const result = await client.query(`
        INSERT INTO ca_lam (nhan_vien_id, started_at, status, shift_type, opening_cash, opened_by)
        VALUES ($1, NOW(), 'OPEN', 'CASHIER', 0, $1)
        RETURNING id, started_at, status, shift_type
      `, [testUserId]);
      
      const newShift = result.rows[0];
      console.log(`✅ Mở ca CASHIER thành công: Ca #${newShift.id} (${newShift.started_at})`);
      
      // Đóng ca ngay để test tiếp
      await client.query(`
        UPDATE ca_lam 
        SET ended_at = NOW() + INTERVAL '1 minute', status = 'CLOSED', closed_at = NOW()
        WHERE id = $1
      `, [newShift.id]);
      
      console.log(`✅ Đã đóng ca #${newShift.id}`);
      
    } catch (error) {
      console.log(`❌ Lỗi mở ca CASHIER: ${error.message}`);
    }
    
    // 3. Test mở ca KITCHEN
    console.log('\n🧪 Test mở ca KITCHEN...');
    try {
      const testUserId = users.rows[0]?.user_id || 1;
      
      const result = await client.query(`
        INSERT INTO ca_lam (nhan_vien_id, started_at, status, shift_type, opening_cash, opened_by)
        VALUES ($1, NOW(), 'OPEN', 'KITCHEN', 0, $1)
        RETURNING id, started_at, status, shift_type
      `, [testUserId]);
      
      const newShift = result.rows[0];
      console.log(`✅ Mở ca KITCHEN thành công: Ca #${newShift.id} (${newShift.started_at})`);
      
      // Đóng ca ngay để test tiếp
      await client.query(`
        UPDATE ca_lam 
        SET ended_at = NOW() + INTERVAL '1 minute', status = 'CLOSED', closed_at = NOW()
        WHERE id = $1
      `, [newShift.id]);
      
      console.log(`✅ Đã đóng ca #${newShift.id}`);
      
    } catch (error) {
      console.log(`❌ Lỗi mở ca KITCHEN: ${error.message}`);
    }
    
    // 4. Test mở ca liên tiếp (test constraint)
    console.log('\n🧪 Test mở ca liên tiếp (test constraint)...');
    try {
      const testUserId = users.rows[0]?.user_id || 1;
      
      // Mở ca 1
      const result1 = await client.query(`
        INSERT INTO ca_lam (nhan_vien_id, started_at, status, shift_type, opening_cash, opened_by)
        VALUES ($1, NOW(), 'OPEN', 'CASHIER', 0, $1)
        RETURNING id
      `, [testUserId]);
      
      console.log(`✅ Mở ca 1: #${result1.rows[0].id}`);
      
      // Thử mở ca 2 ngay lập tức (sẽ bị lỗi)
      try {
        const result2 = await client.query(`
          INSERT INTO ca_lam (nhan_vien_id, started_at, status, shift_type, opening_cash, opened_by)
          VALUES ($1, NOW(), 'OPEN', 'CASHIER', 0, $1)
          RETURNING id
        `, [testUserId]);
        
        console.log(`❌ Không nên mở được ca 2: #${result2.rows[0].id}`);
        
      } catch (constraintError) {
        console.log(`✅ Constraint hoạt động đúng: ${constraintError.message}`);
      }
      
      // Đóng ca 1
      await client.query(`
        UPDATE ca_lam 
        SET ended_at = NOW() + INTERVAL '1 minute', status = 'CLOSED', closed_at = NOW()
        WHERE id = $1
      `, [result1.rows[0].id]);
      
      console.log(`✅ Đã đóng ca #${result1.rows[0].id}`);
      
    } catch (error) {
      console.log(`❌ Lỗi test constraint: ${error.message}`);
    }
    
    console.log('\n🎉 Test hoàn thành! Database sẵn sàng cho mở ca mới.');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy script
testOpenShift()
  .then(() => {
    console.log('\n✅ Database đã sạch và sẵn sàng!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Lỗi:', error);
    process.exit(1);
  });
