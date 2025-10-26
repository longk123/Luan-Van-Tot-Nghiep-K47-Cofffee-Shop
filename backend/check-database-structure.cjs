/**
 * Script kiểm tra cấu trúc database hiện tại
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

async function checkDatabase() {
  try {
    console.log('🔍 KIỂM TRA CẤU TRÚC DATABASE\n');
    console.log('=' .repeat(80));
    
    // 1. Danh sách tất cả các bảng
    console.log('\n📋 DANH SÁCH BẢNG:');
    console.log('-'.repeat(80));
    const tablesResult = await pool.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    tablesResult.rows.forEach((table, idx) => {
      console.log(`${idx + 1}. ${table.table_name} (${table.column_count} cột)`);
    });
    
    // 2. Danh sách Views
    console.log('\n📊 DANH SÁCH VIEWS:');
    console.log('-'.repeat(80));
    const viewsResult = await pool.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    viewsResult.rows.forEach((view, idx) => {
      console.log(`${idx + 1}. ${view.table_name}`);
    });
    
    // 3. Chi tiết các bảng quan trọng
    console.log('\n📝 CHI TIẾT CÁC BẢNG QUAN TRỌNG:');
    console.log('='.repeat(80));
    
    const importantTables = [
      'users',
      'ca_lam',
      'don_hang',
      'don_hang_chi_tiet',
      'mon',
      'loai_mon',
      'ban',
      'khu_vuc',
      'payment_method',
      'order_payment',
      'nguyen_lieu', // Kiểm tra có chưa
      'chi_phi',     // Kiểm tra có chưa
      'bang_cong',   // Kiểm tra có chưa
      'cong_thuc_mon' // Kiểm tra có chưa
    ];
    
    for (const tableName of importantTables) {
      const columnsResult = await pool.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      if (columnsResult.rows.length > 0) {
        console.log(`\n📄 Bảng: ${tableName.toUpperCase()}`);
        console.log('-'.repeat(80));
        columnsResult.rows.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const type = col.character_maximum_length 
            ? `${col.data_type}(${col.character_maximum_length})`
            : col.data_type;
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          console.log(`  - ${col.column_name}: ${type} ${nullable}${defaultVal}`);
        });
        
        // Đếm số record
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`  📊 Số records: ${countResult.rows[0].count}`);
      } else {
        console.log(`\n❌ Bảng: ${tableName.toUpperCase()} - KHÔNG TỒN TẠI`);
      }
    }
    
    // 4. Kiểm tra Sequences
    console.log('\n\n🔢 DANH SÁCH SEQUENCES:');
    console.log('-'.repeat(80));
    const sequencesResult = await pool.query(`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name
    `);
    
    sequencesResult.rows.forEach((seq, idx) => {
      console.log(`${idx + 1}. ${seq.sequence_name}`);
    });
    
    // 5. Kiểm tra Extensions
    console.log('\n\n🔌 EXTENSIONS ĐÃ CÀI:');
    console.log('-'.repeat(80));
    const extensionsResult = await pool.query(`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname != 'plpgsql'
      ORDER BY extname
    `);
    
    extensionsResult.rows.forEach((ext, idx) => {
      console.log(`${idx + 1}. ${ext.extname} (version ${ext.extversion})`);
    });
    
    // 6. Tổng kết
    console.log('\n\n📊 TỔNG KẾT:');
    console.log('='.repeat(80));
    console.log(`✅ Tổng số bảng: ${tablesResult.rows.length}`);
    console.log(`✅ Tổng số views: ${viewsResult.rows.length}`);
    console.log(`✅ Tổng số sequences: ${sequencesResult.rows.length}`);
    console.log(`✅ Tổng số extensions: ${extensionsResult.rows.length}`);
    
    // 7. Kiểm tra các bảng quan trọng còn thiếu
    console.log('\n\n⚠️  CÁC BẢNG QUAN TRỌNG CÒN THIẾU:');
    console.log('-'.repeat(80));
    const missingTables = [];
    for (const tableName of ['nguyen_lieu', 'chi_phi', 'bang_cong', 'cong_thuc_mon', 'muc_tieu']) {
      const check = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);
      
      if (!check.rows[0].exists) {
        missingTables.push(tableName);
      }
    }
    
    if (missingTables.length > 0) {
      console.log('❌ Các bảng chưa có:');
      missingTables.forEach(table => {
        console.log(`   - ${table}`);
      });
      console.log('\n💡 Cần tạo các bảng này để làm báo cáo nâng cao!');
    } else {
      console.log('✅ Tất cả các bảng quan trọng đã có đầy đủ!');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Kiểm tra hoàn tất!\n');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkDatabase();
