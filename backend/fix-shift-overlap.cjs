// backend/fix-shift-overlap.cjs
// Script để sửa lỗi chồng lấp ca làm việc

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function fixShiftOverlap() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Kiểm tra ca làm việc có vấn đề...');
    
    // 1. Kiểm tra ca OPEN không có ended_at
    const openShifts = await client.query(`
      SELECT id, nhan_vien_id, started_at, ended_at, status, shift_type
      FROM ca_lam 
      WHERE status = 'OPEN' AND ended_at IS NULL
      ORDER BY started_at DESC
    `);
    
    console.log(`📊 Tìm thấy ${openShifts.rows.length} ca OPEN:`);
    openShifts.rows.forEach(shift => {
      console.log(`  - Ca #${shift.id}: ${shift.started_at} (${shift.shift_type})`);
    });
    
    // 2. Kiểm tra ca có ended_at = NULL nhưng status = CLOSED
    const closedShiftsWithoutEnd = await client.query(`
      SELECT id, nhan_vien_id, started_at, ended_at, status, shift_type
      FROM ca_lam 
      WHERE status = 'CLOSED' AND ended_at IS NULL
      ORDER BY started_at DESC
    `);
    
    console.log(`📊 Tìm thấy ${closedShiftsWithoutEnd.rows.length} ca CLOSED nhưng ended_at = NULL:`);
    closedShiftsWithoutEnd.rows.forEach(shift => {
      console.log(`  - Ca #${shift.id}: ${shift.started_at} (${shift.shift_type})`);
    });
    
    // 3. Kiểm tra ca có thời gian chồng lấp
    const overlappingShifts = await client.query(`
      SELECT 
        c1.id as shift1_id,
        c1.nhan_vien_id,
        c1.started_at as start1,
        c1.ended_at as end1,
        c1.status as status1,
        c2.id as shift2_id,
        c2.started_at as start2,
        c2.ended_at as end2,
        c2.status as status2
      FROM ca_lam c1
      JOIN ca_lam c2 ON c1.nhan_vien_id = c2.nhan_vien_id 
        AND c1.id != c2.id
        AND c1.started_at < COALESCE(c2.ended_at, 'infinity')
        AND COALESCE(c1.ended_at, 'infinity') > c2.started_at
      ORDER BY c1.nhan_vien_id, c1.started_at
    `);
    
    console.log(`📊 Tìm thấy ${overlappingShifts.rows.length} cặp ca chồng lấp:`);
    overlappingShifts.rows.forEach(overlap => {
      console.log(`  - Ca #${overlap.shift1_id} (${overlap.start1} - ${overlap.end1 || 'NULL'}) chồng với Ca #${overlap.shift2_id} (${overlap.start2} - ${overlap.end2 || 'NULL'})`);
    });
    
    // 4. Sửa lỗi: Đóng ca OPEN cũ (nếu có)
    if (openShifts.rows.length > 0) {
      console.log('\n🔧 Sửa lỗi: Đóng ca OPEN cũ...');
      
      for (const shift of openShifts.rows) {
        console.log(`  - Đóng ca #${shift.id} (${shift.started_at})`);
        
        // Cập nhật ended_at = started_at + 1 giờ (giả lập)
        const endTime = new Date(shift.started_at);
        endTime.setHours(endTime.getHours() + 1);
        
        await client.query(`
          UPDATE ca_lam 
          SET ended_at = $1, status = 'CLOSED', closed_at = NOW()
          WHERE id = $2
        `, [endTime, shift.id]);
        
        console.log(`    ✅ Đã đóng ca #${shift.id}`);
      }
    }
    
    // 5. Sửa lỗi: Cập nhật ended_at cho ca CLOSED
    if (closedShiftsWithoutEnd.rows.length > 0) {
      console.log('\n🔧 Sửa lỗi: Cập nhật ended_at cho ca CLOSED...');
      
      for (const shift of closedShiftsWithoutEnd.rows) {
        console.log(`  - Cập nhật ca #${shift.id} (${shift.started_at})`);
        
        // Cập nhật ended_at = started_at + 1 giờ
        const endTime = new Date(shift.started_at);
        endTime.setHours(endTime.getHours() + 1);
        
        await client.query(`
          UPDATE ca_lam 
          SET ended_at = $1
          WHERE id = $2
        `, [endTime, shift.id]);
        
        console.log(`    ✅ Đã cập nhật ca #${shift.id}`);
      }
    }
    
    // 6. Kiểm tra lại sau khi sửa
    console.log('\n🔍 Kiểm tra lại sau khi sửa...');
    
    const finalCheck = await client.query(`
      SELECT 
        COUNT(*) as total_shifts,
        COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_shifts,
        COUNT(CASE WHEN ended_at IS NULL THEN 1 END) as null_ended_at
      FROM ca_lam
    `);
    
    console.log('📊 Kết quả cuối cùng:');
    console.log(`  - Tổng ca: ${finalCheck.rows[0].total_shifts}`);
    console.log(`  - Ca OPEN: ${finalCheck.rows[0].open_shifts}`);
    console.log(`  - Ca có ended_at = NULL: ${finalCheck.rows[0].null_ended_at}`);
    
    if (finalCheck.rows[0].open_shifts === 0 && finalCheck.rows[0].null_ended_at === 0) {
      console.log('✅ Đã sửa xong! Bây giờ có thể mở ca mới.');
    } else {
      console.log('⚠️ Vẫn còn vấn đề. Cần kiểm tra thêm.');
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
fixShiftOverlap()
  .then(() => {
    console.log('🎉 Hoàn thành!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Lỗi:', error);
    process.exit(1);
  });
