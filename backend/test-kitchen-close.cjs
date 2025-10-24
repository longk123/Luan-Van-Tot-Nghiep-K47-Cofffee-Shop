// backend/test-kitchen-close.cjs
// Script test đóng ca kitchen

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function testKitchenClose() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Test đóng ca kitchen...\n');
    
    // 1. Tìm ca kitchen đang mở
    const kitchenShift = await client.query(`
      SELECT 
        id,
        nhan_vien_id,
        shift_type,
        status,
        started_at,
        total_items_made,
        avg_prep_time_seconds
      FROM ca_lam 
      WHERE shift_type = 'KITCHEN' AND status = 'OPEN'
      ORDER BY started_at DESC
      LIMIT 1
    `);
    
    if (kitchenShift.rows.length === 0) {
      console.log('❌ Không có ca kitchen nào đang mở');
      return;
    }
    
    const shift = kitchenShift.rows[0];
    console.log(`📊 Ca kitchen: #${shift.id} (User: ${shift.nhan_vien_id})`);
    console.log(`   - Started: ${shift.started_at}`);
    console.log(`   - Items made: ${shift.total_items_made || 0}`);
    console.log(`   - Avg time: ${shift.avg_prep_time_seconds || 0}s`);
    
    // 2. Kiểm tra đơn hàng
    const orders = await client.query(`
      SELECT COUNT(*) as count
      FROM don_hang 
      WHERE ca_lam_id = $1 AND trang_thai = 'OPEN'
    `, [shift.id]);
    
    console.log(`📋 Đơn hàng OPEN: ${orders.rows[0].count}`);
    
    // 3. Test đóng ca
    console.log('\n🔧 Test đóng ca...');
    
    try {
      // Cập nhật ca thành CLOSED
      await client.query(`
        UPDATE ca_lam 
        SET 
          status = 'CLOSED',
          ended_at = NOW(),
          closed_at = NOW(),
          closed_by = $2,
          total_items_made = $3,
          avg_prep_time_seconds = $4,
          note = $5,
          updated_at = NOW()
        WHERE id = $1
      `, [
        shift.id,
        shift.nhan_vien_id,
        shift.total_items_made || 0,
        shift.avg_prep_time_seconds || 0,
        'Test close kitchen shift'
      ]);
      
      console.log('✅ Đóng ca thành công!');
      
      // Kiểm tra lại
      const updatedShift = await client.query(`
        SELECT id, status, ended_at, total_items_made, avg_prep_time_seconds
        FROM ca_lam 
        WHERE id = $1
      `, [shift.id]);
      
      console.log('📊 Ca sau khi đóng:', updatedShift.rows[0]);
      
    } catch (error) {
      console.log('❌ Lỗi đóng ca:', error.message);
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
testKitchenClose()
  .then(() => {
    console.log('\n🎉 Hoàn thành test!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Lỗi:', error);
    process.exit(1);
  });
