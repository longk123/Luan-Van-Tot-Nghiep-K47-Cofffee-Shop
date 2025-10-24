// backend/fix-constraint.cjs
// Script sửa constraint no_overlap_per_user

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function fixConstraint() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Sửa constraint no_overlap_per_user...\n');
    
    // 1. Xóa constraint cũ
    console.log('🗑️ Xóa constraint cũ...');
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'no_overlap_per_user'
            AND conrelid = 'ca_lam'::regclass
        ) THEN
          ALTER TABLE ca_lam DROP CONSTRAINT no_overlap_per_user;
          RAISE NOTICE 'Đã xóa constraint no_overlap_per_user';
        ELSE
          RAISE NOTICE 'Constraint no_overlap_per_user không tồn tại';
        END IF;
      END$$;
    `);
    
    // 2. Tạo constraint mới - chỉ chặn ca OPEN chồng lấp
    console.log('🔒 Tạo constraint mới...');
    await client.query(`
      ALTER TABLE ca_lam
        ADD CONSTRAINT no_overlap_per_user 
        EXCLUDE USING gist (
          nhan_vien_id WITH =,
          tstzrange(started_at, COALESCE(ended_at, 'infinity')) WITH &&
        )
        WHERE (status = 'OPEN')
    `);
    
    console.log('✅ Đã tạo constraint mới - chỉ chặn ca OPEN chồng lấp');
    
    // 3. Test constraint mới
    console.log('\n🧪 Test constraint mới...');
    
    const testUserId = 1;
    
    // Test 1: Mở ca OPEN
    console.log('Test 1: Mở ca OPEN...');
    try {
      const result1 = await client.query(`
        INSERT INTO ca_lam (nhan_vien_id, started_at, status, shift_type, opening_cash, opened_by)
        VALUES ($1, NOW(), 'OPEN', 'CASHIER', 0, $1)
        RETURNING id
      `, [testUserId]);
      
      console.log(`✅ Mở ca OPEN thành công: #${result1.rows[0].id}`);
      
      // Test 2: Thử mở ca OPEN thứ 2 (sẽ bị lỗi)
      console.log('Test 2: Thử mở ca OPEN thứ 2...');
      try {
        const result2 = await client.query(`
          INSERT INTO ca_lam (nhan_vien_id, started_at, status, shift_type, opening_cash, opened_by)
          VALUES ($1, NOW(), 'OPEN', 'CASHIER', 0, $1)
          RETURNING id
        `, [testUserId]);
        
        console.log(`❌ Không nên mở được ca thứ 2: #${result2.rows[0].id}`);
        
      } catch (constraintError) {
        console.log(`✅ Constraint hoạt động đúng: ${constraintError.message}`);
      }
      
      // Test 3: Đóng ca và mở ca mới
      console.log('Test 3: Đóng ca và mở ca mới...');
      await client.query(`
        UPDATE ca_lam 
        SET ended_at = NOW() + INTERVAL '1 minute', status = 'CLOSED', closed_at = NOW()
        WHERE id = $1
      `, [result1.rows[0].id]);
      
      console.log(`✅ Đã đóng ca #${result1.rows[0].id}`);
      
      // Mở ca mới sau khi đóng
      const result3 = await client.query(`
        INSERT INTO ca_lam (nhan_vien_id, started_at, status, shift_type, opening_cash, opened_by)
        VALUES ($1, NOW(), 'OPEN', 'KITCHEN', 0, $1)
        RETURNING id
      `, [testUserId]);
      
      console.log(`✅ Mở ca mới thành công: #${result3.rows[0].id}`);
      
      // Đóng ca test
      await client.query(`
        UPDATE ca_lam 
        SET ended_at = NOW() + INTERVAL '1 minute', status = 'CLOSED', closed_at = NOW()
        WHERE id = $1
      `, [result3.rows[0].id]);
      
      console.log(`✅ Đã đóng ca test #${result3.rows[0].id}`);
      
    } catch (error) {
      console.log(`❌ Lỗi test: ${error.message}`);
    }
    
    console.log('\n🎉 Constraint đã được sửa! Bây giờ có thể mở ca mới sau khi đóng ca cũ.');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy script
fixConstraint()
  .then(() => {
    console.log('\n✅ Hoàn thành!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Lỗi:', error);
    process.exit(1);
  });
