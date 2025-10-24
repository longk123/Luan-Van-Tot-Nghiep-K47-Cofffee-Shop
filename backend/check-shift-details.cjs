// backend/check-shift-details.cjs
// Script kiểm tra chi tiết ca làm việc

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function checkShiftDetails() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Kiểm tra chi tiết ca làm việc...\n');
    
    // 1. Hiển thị tất cả ca gần đây
    const recentShifts = await client.query(`
      SELECT 
        id,
        nhan_vien_id,
        started_at,
        ended_at,
        status,
        shift_type,
        created_at,
        updated_at
      FROM ca_lam 
      ORDER BY started_at DESC 
      LIMIT 10
    `);
    
    console.log('📊 10 ca gần đây nhất:');
    console.log('ID | User | Started | Ended | Status | Type');
    console.log('---|------|---------|-------|--------|------');
    recentShifts.rows.forEach(shift => {
      const start = new Date(shift.started_at).toLocaleString('vi-VN');
      const end = shift.ended_at ? new Date(shift.ended_at).toLocaleString('vi-VN') : 'NULL';
      console.log(`${shift.id.toString().padStart(2)} | ${shift.nhan_vien_id.toString().padStart(4)} | ${start} | ${end} | ${shift.status.padStart(6)} | ${shift.shift_type}`);
    });
    
    // 2. Kiểm tra constraint violation
    console.log('\n🔍 Kiểm tra constraint no_overlap_per_user...');
    
    try {
      // Thử tạo ca test để xem constraint có hoạt động không
      const testResult = await client.query(`
        SELECT 
          nhan_vien_id,
          COUNT(*) as shift_count,
          MIN(started_at) as earliest_start,
          MAX(COALESCE(ended_at, started_at + INTERVAL '1 hour')) as latest_end
        FROM ca_lam 
        WHERE nhan_vien_id = (SELECT nhan_vien_id FROM ca_lam ORDER BY started_at DESC LIMIT 1)
        GROUP BY nhan_vien_id
      `);
      
      if (testResult.rows.length > 0) {
        const user = testResult.rows[0];
        console.log(`👤 User ${user.nhan_vien_id}: ${user.shift_count} ca từ ${user.earliest_start} đến ${user.latest_end}`);
      }
      
    } catch (error) {
      console.log('❌ Lỗi kiểm tra constraint:', error.message);
    }
    
    // 3. Kiểm tra ca có thể gây chồng lấp
    const potentialOverlaps = await client.query(`
      WITH user_shifts AS (
        SELECT 
          nhan_vien_id,
          id,
          started_at,
          COALESCE(ended_at, started_at + INTERVAL '1 hour') as effective_end,
          status
        FROM ca_lam
        WHERE nhan_vien_id IS NOT NULL
      )
      SELECT 
        us1.nhan_vien_id,
        us1.id as shift1_id,
        us1.started_at as start1,
        us1.effective_end as end1,
        us1.status as status1,
        us2.id as shift2_id,
        us2.started_at as start2,
        us2.effective_end as end2,
        us2.status as status2
      FROM user_shifts us1
      JOIN user_shifts us2 ON us1.nhan_vien_id = us2.nhan_vien_id 
        AND us1.id != us2.id
        AND us1.started_at < us2.effective_end
        AND us1.effective_end > us2.started_at
      ORDER BY us1.nhan_vien_id, us1.started_at
    `);
    
    if (potentialOverlaps.rows.length > 0) {
      console.log('\n⚠️ Tìm thấy ca có thể chồng lấp:');
      potentialOverlaps.rows.forEach(overlap => {
        console.log(`  User ${overlap.nhan_vien_id}: Ca #${overlap.shift1_id} (${overlap.start1} - ${overlap.end1}) vs Ca #${overlap.shift2_id} (${overlap.start2} - ${overlap.end2})`);
      });
    } else {
      console.log('\n✅ Không tìm thấy ca chồng lấp.');
    }
    
    // 4. Kiểm tra ca OPEN hiện tại
    const currentOpenShifts = await client.query(`
      SELECT 
        id,
        nhan_vien_id,
        started_at,
        status,
        shift_type
      FROM ca_lam 
      WHERE status = 'OPEN'
      ORDER BY started_at DESC
    `);
    
    console.log(`\n📊 Ca OPEN hiện tại: ${currentOpenShifts.rows.length}`);
    currentOpenShifts.rows.forEach(shift => {
      console.log(`  - Ca #${shift.id}: User ${shift.nhan_vien_id}, ${shift.started_at} (${shift.shift_type})`);
    });
    
    // 5. Đề xuất giải pháp
    if (currentOpenShifts.rows.length > 0) {
      console.log('\n💡 Đề xuất: Đóng ca OPEN trước khi mở ca mới.');
    }
    
    if (potentialOverlaps.rows.length > 0) {
      console.log('\n💡 Đề xuất: Sửa thời gian ca chồng lấp.');
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
checkShiftDetails()
  .then(() => {
    console.log('\n🎉 Hoàn thành kiểm tra!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Lỗi:', error);
    process.exit(1);
  });
