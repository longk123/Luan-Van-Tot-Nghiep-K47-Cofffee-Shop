const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
});

async function checkShifts() {
  try {
    console.log('🔍 Kiểm tra ca làm việc...\n');
    
    // 1. Tổng số ca
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM ca_lam');
    console.log(`📊 Tổng số ca: ${totalResult.rows[0].count}`);
    
    // 2. Ca trong 7 ngày gần đây
    const recentResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM ca_lam 
      WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
    `);
    console.log(`📅 Ca trong 7 ngày gần đây: ${recentResult.rows[0].count}`);
    
    // 3. Ca trong 30 ngày gần đây
    const monthResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM ca_lam 
      WHERE started_at >= CURRENT_DATE - INTERVAL '30 days'
    `);
    console.log(`📅 Ca trong 30 ngày gần đây: ${monthResult.rows[0].count}`);
    
    // 4. Danh sách 10 ca gần nhất
    const shiftsResult = await pool.query(`
      SELECT 
        ca.id,
        ca.shift_type,
        ca.status,
        ca.started_at,
        ca.closed_at,
        u.full_name AS nhan_vien,
        COALESCE(ca.total_orders, 0) AS total_orders,
        COALESCE(ca.net_amount, 0) AS net_amount
      FROM ca_lam ca
      LEFT JOIN users u ON u.user_id = ca.opened_by
      ORDER BY ca.started_at DESC
      LIMIT 10
    `);
    
    console.log('\n📋 10 ca gần nhất:');
    console.table(shiftsResult.rows.map(s => ({
      ID: s.id,
      Type: s.shift_type,
      Status: s.status,
      Started: s.started_at?.toISOString().split('T')[0],
      Staff: s.nhan_vien,
      Orders: s.total_orders,
      Revenue: s.net_amount
    })));
    
    // 5. Kiểm tra ngày gần nhất có ca
    if (shiftsResult.rows.length > 0) {
      const latestDate = shiftsResult.rows[0].started_at;
      const today = new Date();
      const daysDiff = Math.floor((today - new Date(latestDate)) / (1000 * 60 * 60 * 24));
      
      console.log(`\n⏰ Ca gần nhất: ${latestDate.toISOString().split('T')[0]} (${daysDiff} ngày trước)`);
      
      if (daysDiff > 7) {
        console.log('⚠️  Không có ca nào trong 7 ngày gần đây!');
        console.log('💡 Bạn cần tạo ca mới hoặc thay đổi filter trong UI');
      }
    } else {
      console.log('\n❌ Không có ca nào trong database!');
      console.log('💡 Bạn cần mở ca mới từ Dashboard');
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await pool.end();
  }
}

checkShifts();

