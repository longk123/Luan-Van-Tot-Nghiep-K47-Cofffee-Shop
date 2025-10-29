/**
 * =====================================================================
 * SEED: BATCH INVENTORY SAMPLE DATA
 * =====================================================================
 * 
 * Thêm dữ liệu mẫu cho batch inventory system
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

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🌱 BẮT ĐẦU SEED: BATCH INVENTORY SAMPLE DATA');
    console.log('='.repeat(80) + '\n');
    
    await client.query('BEGIN');
    
    // =====================================================================
    // 1. LẤY DANH SÁCH NGUYÊN LIỆU
    // =====================================================================
    console.log('📋 1. Lấy danh sách nguyên liệu...');
    
    const { rows: ingredients } = await client.query(`
      SELECT id, ma, ten, don_vi 
      FROM nguyen_lieu 
      WHERE active = TRUE
      ORDER BY id
      LIMIT 10
    `);
    
    console.log(`   ✅ Tìm thấy ${ingredients.length} nguyên liệu`);
    
    if (ingredients.length === 0) {
      console.log('   ⚠️  Không có nguyên liệu nào. Vui lòng chạy seed nguyên liệu trước!');
      await client.query('ROLLBACK');
      return;
    }
    
    // =====================================================================
    // 2. XÓA DỮ LIỆU CŨ (NẾU CÓ)
    // =====================================================================
    console.log('🗑️  2. Xóa dữ liệu batch cũ...');
    
    await client.query('DELETE FROM xuat_kho WHERE batch_id IS NOT NULL');
    await client.query('DELETE FROM nhap_kho WHERE batch_id IS NOT NULL');
    await client.query('DELETE FROM batch_inventory');
    
    console.log('   ✅ Đã xóa dữ liệu cũ');
    
    // =====================================================================
    // 3. TẠO BATCH MẪU
    // =====================================================================
    console.log('📦 3. Tạo batch inventory mẫu...');
    
    const today = new Date();
    const batches = [];
    
    for (let i = 0; i < Math.min(ingredients.length, 8); i++) {
      const ing = ingredients[i];
      
      // Tạo 2-3 batch cho mỗi nguyên liệu
      const numBatches = Math.floor(Math.random() * 2) + 2; // 2-3 batches
      
      for (let j = 0; j < numBatches; j++) {
        // Ngày nhập: từ 60 ngày trước đến hôm nay
        const daysAgo = Math.floor(Math.random() * 60);
        const importDate = new Date(today);
        importDate.setDate(importDate.getDate() - daysAgo);
        
        // Ngày sản xuất: 1-5 ngày trước ngày nhập
        const productionDate = new Date(importDate);
        productionDate.setDate(productionDate.getDate() - Math.floor(Math.random() * 5) - 1);
        
        // Ngày hết hạn: 
        // - 50% có hạn sử dụng (30-180 ngày từ ngày sản xuất)
        // - 50% không có hạn (null)
        let expiryDate = null;
        if (Math.random() > 0.5) {
          expiryDate = new Date(productionDate);
          const shelfLifeDays = Math.floor(Math.random() * 150) + 30; // 30-180 ngày
          expiryDate.setDate(expiryDate.getDate() + shelfLifeDays);
        }
        
        // Số lượng nhập: 50-500
        const quantity = Math.floor(Math.random() * 450) + 50;
        
        // Số lượng tồn: 0-100% số lượng nhập
        const remaining = Math.floor(quantity * (Math.random() * 0.7 + 0.3)); // 30-100%
        
        // Đơn giá: 10,000 - 200,000
        const unitPrice = Math.floor(Math.random() * 190000) + 10000;
        
        // Trạng thái
        let status = 'ACTIVE';
        if (remaining === 0) {
          status = 'DEPLETED';
        } else if (expiryDate && expiryDate < today) {
          status = 'EXPIRED';
        }
        
        batches.push({
          ingredientId: ing.id,
          ingredientName: ing.ten,
          quantity,
          remaining,
          unit: ing.don_vi,
          unitPrice,
          importDate: importDate.toISOString().split('T')[0],
          productionDate: productionDate.toISOString().split('T')[0],
          expiryDate: expiryDate ? expiryDate.toISOString().split('T')[0] : null,
          status,
          supplier: ['Công ty TNHH ABC', 'Nhà cung cấp XYZ', 'Công ty Cổ phần DEF', null][Math.floor(Math.random() * 4)],
          supplierBatchCode: Math.random() > 0.5 ? `LOT-${Math.floor(Math.random() * 9000) + 1000}` : null
        });
      }
    }
    
    console.log(`   📦 Tạo ${batches.length} batch...`);
    
    // Insert batches
    let batchCount = 0;
    for (const batch of batches) {
      // Insert batch
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
          nha_cung_cap,
          so_lo_nha_cung_cap,
          trang_thai
        )
        SELECT 
          generate_batch_code($1),
          $1,
          $2,
          $3,
          $4,
          $5,
          $6::date,
          $7::date,
          $8::date,
          $9,
          $10,
          $11
        RETURNING *
      `, [
        batch.ingredientId,
        batch.quantity,
        batch.remaining,
        batch.unit,
        batch.unitPrice,
        batch.importDate,
        batch.productionDate,
        batch.expiryDate,
        batch.supplier,
        batch.supplierBatchCode,
        batch.status
      ]);
      
      // Insert vào nhap_kho
      await client.query(`
        INSERT INTO nhap_kho (
          nguyen_lieu_id,
          so_luong,
          don_gia,
          nha_cung_cap,
          ngay_nhap,
          ngay_san_xuat,
          ngay_het_han,
          batch_id,
          ghi_chu
        ) VALUES ($1, $2, $3, $4, $5::date, $6::date, $7::date, $8, $9)
      `, [
        batch.ingredientId,
        batch.quantity,
        batch.unitPrice,
        batch.supplier,
        batch.importDate,
        batch.productionDate,
        batch.expiryDate,
        newBatch.id,
        `Batch mẫu: ${newBatch.batch_code}`
      ]);
      
      batchCount++;
      
      if (batchCount % 5 === 0) {
        console.log(`   ⏳ Đã tạo ${batchCount}/${batches.length} batch...`);
      }
    }
    
    console.log(`   ✅ Đã tạo ${batchCount} batch thành công`);
    
    // =====================================================================
    // 4. CẬP NHẬT TỒN KHO
    // =====================================================================
    console.log('📊 4. Cập nhật tồn kho nguyên liệu...');
    
    await client.query(`
      UPDATE nguyen_lieu nl
      SET ton_kho = (
        SELECT COALESCE(SUM(bi.so_luong_ton), 0)
        FROM batch_inventory bi
        WHERE bi.nguyen_lieu_id = nl.id
          AND bi.trang_thai = 'ACTIVE'
      )
      WHERE nl.id IN (
        SELECT DISTINCT nguyen_lieu_id FROM batch_inventory
      )
    `);
    
    console.log('   ✅ Đã cập nhật tồn kho');
    
    await client.query('COMMIT');
    
    // =====================================================================
    // 5. THỐNG KÊ
    // =====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('✅ SEED BATCH INVENTORY HOÀN TẤT!');
    console.log('='.repeat(80));
    
    const { rows: [stats] } = await client.query(`
      SELECT 
        COUNT(*) as total_batches,
        COUNT(*) FILTER (WHERE trang_thai = 'ACTIVE') as active_batches,
        COUNT(*) FILTER (WHERE trang_thai = 'EXPIRED') as expired_batches,
        COUNT(*) FILTER (WHERE trang_thai = 'DEPLETED') as depleted_batches,
        COUNT(*) FILTER (
          WHERE trang_thai = 'ACTIVE' 
          AND ngay_het_han IS NOT NULL 
          AND ngay_het_han <= CURRENT_DATE + INTERVAL '7 days'
        ) as expiring_soon,
        SUM(gia_tri_ton) FILTER (WHERE trang_thai = 'ACTIVE') as total_value
      FROM batch_inventory
    `);
    
    console.log('\n📊 THỐNG KÊ:');
    console.log(`  📦 Tổng số batch: ${stats.total_batches}`);
    console.log(`  ✅ Batch ACTIVE: ${stats.active_batches}`);
    console.log(`  ❌ Batch EXPIRED: ${stats.expired_batches}`);
    console.log(`  📭 Batch DEPLETED: ${stats.depleted_batches}`);
    console.log(`  ⚠️  Sắp hết hạn (7 ngày): ${stats.expiring_soon}`);
    console.log(`  💰 Tổng giá trị tồn: ${parseInt(stats.total_value || 0).toLocaleString('vi-VN')} VNĐ`);
    
    console.log('\n💡 CÁCH SỬ DỤNG:');
    console.log('  → Vào trang Quản lý kho để xem batch inventory');
    console.log('  → API: GET /api/v1/batch-inventory/summary');
    console.log('  → API: GET /api/v1/batch-inventory/expiring?days=30');
    console.log('  → API: GET /api/v1/batch-inventory/ingredient/:id\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ LỖI SEED:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy seed
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✅ Seed completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}

module.exports = { seed };

