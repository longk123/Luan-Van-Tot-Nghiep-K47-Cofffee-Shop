const { pool } = require('./src/db.js');

async function checkPromotionUsage() {
  try {
    console.log('=== Checking don_hang_khuyen_mai table ===');
    
    // Count total records
    const countResult = await pool.query('SELECT COUNT(*) FROM don_hang_khuyen_mai');
    console.log('\n📊 Total records in don_hang_khuyen_mai:', countResult.rows[0].count);
    
    // Sample records with promotion info
    const sampleResult = await pool.query(`
      SELECT dhkm.*, km.ma, km.ten 
      FROM don_hang_khuyen_mai dhkm 
      JOIN khuyen_mai km ON km.id = dhkm.khuyen_mai_id 
      LIMIT 10
    `);
    
    console.log('\n📋 Sample records:');
    console.log(JSON.stringify(sampleResult.rows, null, 2));
    
    // Check for promotion ID 2 (GIAM20K)
    const promo2Result = await pool.query(`
      SELECT COUNT(*) 
      FROM don_hang_khuyen_mai 
      WHERE khuyen_mai_id = 2
    `);
    console.log('\n🔍 Records for promotion ID 2 (GIAM20K):', promo2Result.rows[0].count);
    
    // Test the actual query used in getUsageHistory
    console.log('\n🔍 Testing getUsageHistory query for promotion ID 2...');
    const usageResult = await pool.query(`
      SELECT 
        dh.id AS don_hang_id,
        dh.opened_at AS ngay_tao,
        dhkm.so_tien_giam AS giam_gia,
        u.full_name AS username,
        COALESCE((
          SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
          FROM don_hang_chi_tiet d
          WHERE d.don_hang_id = dh.id
        ), 0) AS tong_tien,
        COALESCE((
          SELECT grand_total
          FROM v_order_money_totals
          WHERE order_id = dh.id
        ), 0) AS thanh_toan
       FROM don_hang_khuyen_mai dhkm
       JOIN don_hang dh ON dh.id = dhkm.don_hang_id
       LEFT JOIN users u ON u.user_id = dhkm.applied_by
       WHERE dhkm.khuyen_mai_id = 2
       ORDER BY dh.opened_at DESC
       LIMIT 10
    `, []);
    
    console.log(`\n✅ Query returned ${usageResult.rows.length} rows`);
    if (usageResult.rows.length > 0) {
      console.log('\n📋 Sample result:');
      console.log(JSON.stringify(usageResult.rows[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
    process.exit();
  }
}

checkPromotionUsage();
