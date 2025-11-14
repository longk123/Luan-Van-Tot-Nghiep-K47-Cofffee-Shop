// Tìm views/functions có dùng sai tên bảng tuy_chon
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function findTuyChonError() {
  try {
    // Kiểm tra views
    console.log('🔍 Kiểm tra VIEWS có chứa "tuy_chon" (không phải tuy_chon_mon)...\n');
    const views = await pool.query(`
      SELECT viewname, definition 
      FROM pg_views 
      WHERE schemaname='public' 
        AND (definition ILIKE '%from tuy_chon %' 
          OR definition ILIKE '%join tuy_chon %'
          OR definition ILIKE '%from tuy_chon%'
          OR definition ILIKE '%join tuy_chon%')
        AND definition NOT ILIKE '%tuy_chon_mon%'
        AND definition NOT ILIKE '%tuy_chon_gia%'
        AND definition NOT ILIKE '%tuy_chon_muc%'
    `);
    
    if (views.rows.length > 0) {
      console.log(`❌ Tìm thấy ${views.rows.length} views có vấn đề:`);
      views.rows.forEach(v => {
        console.log(`\n📌 View: ${v.viewname}`);
        console.log(`Definition: ${v.definition.substring(0, 200)}...`);
      });
    } else {
      console.log('✅ Không tìm thấy views có vấn đề');
    }

    // Kiểm tra functions/procedures
    console.log('\n\n🔍 Kiểm tra FUNCTIONS có chứa "tuy_chon"...\n');
    const funcs = await pool.query(`
      SELECT proname, prosrc 
      FROM pg_proc 
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND (prosrc ILIKE '%from tuy_chon %' 
          OR prosrc ILIKE '%join tuy_chon %'
          OR prosrc ILIKE '%from tuy_chon%'
          OR prosrc ILIKE '%join tuy_chon%')
        AND prosrc NOT ILIKE '%tuy_chon_mon%'
        AND prosrc NOT ILIKE '%tuy_chon_gia%'
        AND prosrc NOT ILIKE '%tuy_chon_muc%'
    `);
    
    if (funcs.rows.length > 0) {
      console.log(`❌ Tìm thấy ${funcs.rows.length} functions có vấn đề:`);
      funcs.rows.forEach(f => {
        console.log(`\n📌 Function: ${f.proname}`);
        console.log(`Source: ${f.prosrc.substring(0, 200)}...`);
      });
    } else {
      console.log('✅ Không tìm thấy functions có vấn đề');
    }

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await pool.end();
  }
}

findTuyChonError();
