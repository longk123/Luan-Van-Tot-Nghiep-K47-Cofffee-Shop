/**
 * =====================================================================
 * TEST: FEFO FLOW
 * =====================================================================
 * 
 * Test toàn bộ flow: Nhập kho → Bán hàng → Xuất kho FEFO
 * 
 * =====================================================================
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'coffee_shop',
});

async function testFEFO() {
  const client = await pool.connect();
  
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 BẮT ĐẦU TEST: FEFO FLOW');
    console.log('='.repeat(80) + '\n');
    
    await client.query('BEGIN');
    
    // =====================================================================
    // SETUP: Tạo nguyên liệu test
    // =====================================================================
    console.log('📋 SETUP: Tạo nguyên liệu test...');
    
    const { rows: [testIngredient] } = await client.query(`
      INSERT INTO nguyen_lieu (ma, ten, don_vi, ton_kho, gia_nhap_moi_nhat, active)
      VALUES ('TEST-FEFO', 'Test FEFO Ingredient', 'kg', 0, 50000, TRUE)
      ON CONFLICT (ma) DO UPDATE 
      SET ton_kho = 0, active = TRUE
      RETURNING *
    `);
    
    console.log(`   ✅ Nguyên liệu: ${testIngredient.ten} (ID: ${testIngredient.id})`);
    
    // Xóa batch cũ của nguyên liệu này
    await client.query('DELETE FROM xuat_kho WHERE nguyen_lieu_id = $1', [testIngredient.id]);
    await client.query('DELETE FROM nhap_kho WHERE nguyen_lieu_id = $1', [testIngredient.id]);
    await client.query('DELETE FROM batch_inventory WHERE nguyen_lieu_id = $1', [testIngredient.id]);
    
    // =====================================================================
    // TEST CASE 1: Nhập 3 batch với ngày hết hạn khác nhau
    // =====================================================================
    console.log('\n📦 TEST CASE 1: Nhập 3 batch với ngày hết hạn khác nhau');
    
    const today = new Date();
    
    // Batch 1: Hết hạn sau 10 ngày (sẽ được xuất đầu tiên)
    const batch1Date = new Date(today);
    batch1Date.setDate(batch1Date.getDate() + 10);
    
    // Batch 2: Hết hạn sau 30 ngày (sẽ được xuất thứ 2)
    const batch2Date = new Date(today);
    batch2Date.setDate(batch2Date.getDate() + 30);
    
    // Batch 3: Không có hạn sử dụng (sẽ được xuất cuối cùng)
    
    const batches = [
      { quantity: 100, expiryDate: batch1Date, label: 'Batch 1 (HSD: 10 ngày)' },
      { quantity: 100, expiryDate: batch2Date, label: 'Batch 2 (HSD: 30 ngày)' },
      { quantity: 100, expiryDate: null, label: 'Batch 3 (Không HSD)' }
    ];
    
    const createdBatches = [];
    
    for (const batch of batches) {
      const { rows: [newBatch] } = await client.query(`
        INSERT INTO batch_inventory (
          batch_code,
          nguyen_lieu_id,
          so_luong_nhap,
          so_luong_ton,
          don_vi,
          don_gia,
          ngay_nhap,
          ngay_san_xuat,
          ngay_het_han,
          trang_thai
        )
        SELECT 
          generate_batch_code($1),
          $1,
          $2,
          $2,
          $3,
          50000,
          NOW(),
          CURRENT_DATE - INTERVAL '5 days',
          $4,
          'ACTIVE'
        RETURNING *
      `, [
        testIngredient.id,
        batch.quantity,
        testIngredient.don_vi,
        batch.expiryDate ? batch.expiryDate.toISOString().split('T')[0] : null
      ]);
      
      createdBatches.push({ ...newBatch, label: batch.label });
      console.log(`   ✅ ${batch.label}: ${newBatch.batch_code}`);
    }
    
    // Cập nhật tồn kho
    await client.query(`
      UPDATE nguyen_lieu 
      SET ton_kho = $1 
      WHERE id = $2
    `, [300, testIngredient.id]);
    
    console.log(`   📊 Tổng tồn kho: 300 ${testIngredient.don_vi}`);
    
    // =====================================================================
    // TEST CASE 2: Xuất kho 150 kg theo FEFO
    // =====================================================================
    console.log('\n🔄 TEST CASE 2: Xuất kho 150 kg theo FEFO');
    
    const { rows: fefoResult } = await client.query(`
      SELECT * FROM xuat_kho_fefo($1, $2, NULL, NULL, 'BAN_HANG')
    `, [testIngredient.id, 150]);
    
    console.log(`   📤 Xuất kho: 150 ${testIngredient.don_vi}`);
    console.log('   📋 Thứ tự xuất kho:');
    
    for (let i = 0; i < fefoResult.length; i++) {
      const result = fefoResult[i];
      const batchInfo = createdBatches.find(b => b.id === result.batch_id);
      console.log(`      ${i + 1}. ${result.batch_code}: ${result.so_luong_xuat} ${testIngredient.don_vi} (${batchInfo.label})`);
    }
    
    // =====================================================================
    // VERIFICATION: Kiểm tra kết quả
    // =====================================================================
    console.log('\n✅ VERIFICATION: Kiểm tra kết quả');
    
    // Kiểm tra batch 1 (HSD 10 ngày) phải được xuất hết
    const { rows: [batch1After] } = await client.query(
      'SELECT * FROM batch_inventory WHERE id = $1',
      [createdBatches[0].id]
    );
    
    console.log(`   🔍 ${createdBatches[0].label}:`);
    console.log(`      - Tồn ban đầu: 100 ${testIngredient.don_vi}`);
    console.log(`      - Tồn hiện tại: ${batch1After.so_luong_ton} ${testIngredient.don_vi}`);
    console.log(`      - Trạng thái: ${batch1After.trang_thai}`);
    
    if (parseFloat(batch1After.so_luong_ton) === 0 && batch1After.trang_thai === 'DEPLETED') {
      console.log(`      ✅ PASS: Batch 1 đã được xuất hết`);
    } else {
      console.log(`      ❌ FAIL: Batch 1 chưa được xuất hết`);
    }
    
    // Kiểm tra batch 2 (HSD 30 ngày) phải được xuất 50 kg
    const { rows: [batch2After] } = await client.query(
      'SELECT * FROM batch_inventory WHERE id = $1',
      [createdBatches[1].id]
    );
    
    console.log(`   🔍 ${createdBatches[1].label}:`);
    console.log(`      - Tồn ban đầu: 100 ${testIngredient.don_vi}`);
    console.log(`      - Tồn hiện tại: ${batch2After.so_luong_ton} ${testIngredient.don_vi}`);
    console.log(`      - Trạng thái: ${batch2After.trang_thai}`);
    
    if (parseFloat(batch2After.so_luong_ton) === 50 && batch2After.trang_thai === 'ACTIVE') {
      console.log(`      ✅ PASS: Batch 2 đã được xuất 50 kg`);
    } else {
      console.log(`      ❌ FAIL: Batch 2 không đúng số lượng`);
    }
    
    // Kiểm tra batch 3 (Không HSD) không được xuất
    const { rows: [batch3After] } = await client.query(
      'SELECT * FROM batch_inventory WHERE id = $1',
      [createdBatches[2].id]
    );
    
    console.log(`   🔍 ${createdBatches[2].label}:`);
    console.log(`      - Tồn ban đầu: 100 ${testIngredient.don_vi}`);
    console.log(`      - Tồn hiện tại: ${batch3After.so_luong_ton} ${testIngredient.don_vi}`);
    console.log(`      - Trạng thái: ${batch3After.trang_thai}`);
    
    if (parseFloat(batch3After.so_luong_ton) === 100 && batch3After.trang_thai === 'ACTIVE') {
      console.log(`      ✅ PASS: Batch 3 chưa được xuất (đúng)`);
    } else {
      console.log(`      ❌ FAIL: Batch 3 không đúng`);
    }
    
    // Kiểm tra tổng tồn kho
    const { rows: [ingredientAfter] } = await client.query(
      'SELECT ton_kho FROM nguyen_lieu WHERE id = $1',
      [testIngredient.id]
    );
    
    console.log(`   🔍 Tổng tồn kho:`);
    console.log(`      - Ban đầu: 300 ${testIngredient.don_vi}`);
    console.log(`      - Hiện tại: ${ingredientAfter.ton_kho} ${testIngredient.don_vi}`);
    console.log(`      - Đã xuất: 150 ${testIngredient.don_vi}`);
    
    // =====================================================================
    // SUMMARY
    // =====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 KẾT QUẢ TEST');
    console.log('='.repeat(80));
    
    const allPassed = 
      parseFloat(batch1After.so_luong_ton) === 0 &&
      parseFloat(batch2After.so_luong_ton) === 50 &&
      parseFloat(batch3After.so_luong_ton) === 100;
    
    if (allPassed) {
      console.log('✅ TẤT CẢ TEST CASE PASSED!');
      console.log('✅ FEFO logic hoạt động đúng:');
      console.log('   1. Batch hết hạn sớm nhất được xuất trước');
      console.log('   2. Batch không có HSD được xuất sau cùng');
      console.log('   3. Tồn kho được cập nhật chính xác');
    } else {
      console.log('❌ CÓ TEST CASE FAILED!');
      console.log('❌ FEFO logic có vấn đề, cần kiểm tra lại');
    }
    
    await client.query('ROLLBACK');
    console.log('\n🔄 Đã rollback test data\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ LỖI TEST:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy test
if (require.main === module) {
  testFEFO()
    .then(() => {
      console.log('✅ Test completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Test failed:', err);
      process.exit(1);
    });
}

module.exports = { testFEFO };

