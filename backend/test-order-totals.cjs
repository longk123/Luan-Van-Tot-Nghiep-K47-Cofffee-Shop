const { pool } = require('./src/db.js');

async function testOrderTotals() {
  try {
    console.log('=== Testing v_order_money_totals view ===\n');
    
    // Test view exists
    const viewCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'v_order_money_totals'
      )
    `);
    console.log('📊 View exists:', viewCheck.rows[0].exists);
    
    if (!viewCheck.rows[0].exists) {
      console.log('❌ View v_order_money_totals does not exist!');
      await pool.end();
      process.exit(1);
    }
    
    // Get sample data from view
    const sampleData = await pool.query(`
      SELECT * FROM v_order_money_totals 
      WHERE order_id IN (SELECT don_hang_id FROM don_hang_khuyen_mai LIMIT 5)
    `);
    
    console.log('\n📋 Sample data from v_order_money_totals:');
    console.log(JSON.stringify(sampleData.rows, null, 2));
    
    // Test the actual query with a known promotion
    console.log('\n🔍 Testing actual getUsageHistory query for promotion ID 2...');
    const testQuery = await pool.query(`
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
       LIMIT 5
    `);
    
    console.log(`\n✅ Query returned ${testQuery.rows.length} rows`);
    console.log('\n📋 Results:');
    testQuery.rows.forEach((row, i) => {
      console.log(`\n${i + 1}. Order #${row.don_hang_id}`);
      console.log(`   tong_tien: ${row.tong_tien} (type: ${typeof row.tong_tien})`);
      console.log(`   giam_gia: ${row.giam_gia} (type: ${typeof row.giam_gia})`);
      console.log(`   thanh_toan: ${row.thanh_toan} (type: ${typeof row.thanh_toan})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
    process.exit();
  }
}

testOrderTotals();
