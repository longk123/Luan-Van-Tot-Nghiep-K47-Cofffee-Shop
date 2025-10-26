/**
 * MIGRATION: Thêm giá vốn cho topping
 * - Thêm cột nguyen_lieu_id vào bảng tuy_chon_mon
 * - Cập nhật trigger tính giá vốn để bao gồm topping
 * - Tạo view tính giá vốn topping
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD)
});

async function migrate() {
  console.log('\n🔧 MIGRATION: Thêm giá vốn cho topping');
  console.log('='.repeat(70));
  console.log();
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Thêm cột nguyen_lieu_id vào tuy_chon_mon
    console.log('1️⃣ Thêm cột nguyen_lieu_id vào tuy_chon_mon...');
    await client.query(`
      ALTER TABLE tuy_chon_mon
      ADD COLUMN IF NOT EXISTS nguyen_lieu_id INTEGER REFERENCES nguyen_lieu(id);
    `);
    console.log('   ✅ Đã thêm cột nguyen_lieu_id\n');
    
    // 2. Link topping hiện có với nguyên liệu (nếu có)
    console.log('2️⃣ Link topping với nguyên liệu...');
    await client.query(`
      UPDATE tuy_chon_mon tc
      SET nguyen_lieu_id = nl.id
      FROM nguyen_lieu nl
      WHERE tc.loai = 'AMOUNT' 
        AND tc.nguyen_lieu_id IS NULL
        AND (
          LOWER(tc.ten) = LOWER(nl.ten)
          OR LOWER(tc.ma) = LOWER(nl.ma)
        );
    `);
    const linked = await client.query(`
      SELECT COUNT(*) as count
      FROM tuy_chon_mon
      WHERE loai = 'AMOUNT' AND nguyen_lieu_id IS NOT NULL
    `);
    console.log(`   ✅ Đã link ${linked.rows[0].count} topping với nguyên liệu\n`);
    
    // 3. Tạo view tính giá vốn topping
    console.log('3️⃣ Tạo view v_line_topping_cost...');
    await client.query(`
      DROP VIEW IF EXISTS v_line_topping_cost CASCADE;
      
      CREATE VIEW v_line_topping_cost AS
      SELECT 
        dhct.id AS line_id,
        dhct.don_hang_id AS order_id,
        COALESCE(SUM(
          COALESCE(dhctto.so_luong, 1) * COALESCE(nl.gia_nhap_moi_nhat, 0)
        ), 0)::INTEGER AS tong_gia_von_topping
      FROM don_hang_chi_tiet dhct
      LEFT JOIN don_hang_chi_tiet_tuy_chon dhctto ON dhctto.line_id = dhct.id
      LEFT JOIN tuy_chon_mon tc ON tc.id = dhctto.tuy_chon_id AND tc.loai = 'AMOUNT'
      LEFT JOIN nguyen_lieu nl ON nl.id = tc.nguyen_lieu_id
      GROUP BY dhct.id, dhct.don_hang_id;
    `);
    console.log('   ✅ Đã tạo view v_line_topping_cost\n');
    
    // 4. Tạo function tính giá vốn bao gồm topping
    console.log('4️⃣ Tạo function tinh_gia_von_voi_topping...');
    await client.query(`
      CREATE OR REPLACE FUNCTION tinh_gia_von_voi_topping(p_line_id INTEGER)
      RETURNS NUMERIC AS $$
      DECLARE
        v_gia_von_mon NUMERIC := 0;
        v_gia_von_topping NUMERIC := 0;
        v_so_luong INTEGER := 1;
      BEGIN
        -- Lấy giá vốn món từ cột gia_von_thuc_te
        SELECT 
          COALESCE(gia_von_thuc_te, 0),
          so_luong
        INTO v_gia_von_mon, v_so_luong
        FROM don_hang_chi_tiet
        WHERE id = p_line_id;
        
        -- Lấy giá vốn topping
        SELECT COALESCE(tong_gia_von_topping, 0)
        INTO v_gia_von_topping
        FROM v_line_topping_cost
        WHERE line_id = p_line_id;
        
        -- Tổng giá vốn = (giá vốn món + giá vốn topping) * số lượng
        RETURN (v_gia_von_mon + v_gia_von_topping) * v_so_luong;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✅ Đã tạo function tinh_gia_von_voi_topping\n');
    
    // 5. Tạo view báo cáo lợi nhuận có bao gồm giá vốn topping
    console.log('5️⃣ Tạo view v_profit_with_topping_cost...');
    await client.query(`
      DROP VIEW IF EXISTS v_profit_with_topping_cost CASCADE;
      
      CREATE VIEW v_profit_with_topping_cost AS
      SELECT 
        dh.id AS order_id,
        dh.trang_thai,
        dh.opened_at,
        dh.closed_at,
        -- Doanh thu
        COALESCE(omt.grand_total, 0) AS doanh_thu,
        -- Giá vốn món (không bao gồm topping)
        COALESCE(SUM(dhct.gia_von_thuc_te * dhct.so_luong), 0)::INTEGER AS gia_von_mon,
        -- Giá vốn topping
        COALESCE(SUM(vtc.tong_gia_von_topping * dhct.so_luong), 0)::INTEGER AS gia_von_topping,
        -- Tổng giá vốn
        (COALESCE(SUM(dhct.gia_von_thuc_te * dhct.so_luong), 0) + 
         COALESCE(SUM(vtc.tong_gia_von_topping * dhct.so_luong), 0))::INTEGER AS tong_gia_von,
        -- Lợi nhuận
        (COALESCE(omt.grand_total, 0) - 
         COALESCE(SUM(dhct.gia_von_thuc_te * dhct.so_luong), 0) -
         COALESCE(SUM(vtc.tong_gia_von_topping * dhct.so_luong), 0))::INTEGER AS loi_nhuan
      FROM don_hang dh
      LEFT JOIN don_hang_chi_tiet dhct ON dhct.don_hang_id = dh.id
      LEFT JOIN v_line_topping_cost vtc ON vtc.line_id = dhct.id
      LEFT JOIN v_order_money_totals omt ON omt.order_id = dh.id
      WHERE dh.trang_thai = 'da_thanh_toan'
      GROUP BY dh.id, dh.trang_thai, dh.opened_at, dh.closed_at, omt.grand_total;
    `);
    console.log('   ✅ Đã tạo view v_profit_with_topping_cost\n');
    
    // 6. Hiển thị kết quả
    console.log('6️⃣ Kiểm tra kết quả...');
    console.log('-'.repeat(70));
    
    const topping = await client.query(`
      SELECT 
        tc.id,
        tc.ma,
        tc.ten,
        tc.gia_mac_dinh as gia_ban,
        tc.nguyen_lieu_id,
        nl.ten as nguyen_lieu,
        nl.gia_nhap_moi_nhat as gia_von
      FROM tuy_chon_mon tc
      LEFT JOIN nguyen_lieu nl ON nl.id = tc.nguyen_lieu_id
      WHERE tc.loai = 'AMOUNT'
      ORDER BY tc.id
    `);
    
    console.log('\n📋 DANH SÁCH TOPPING:');
    if (topping.rows.length > 0) {
      topping.rows.forEach(row => {
        console.log(`\n  ${row.ten} (${row.ma}):`);
        console.log(`    Giá bán: ${row.gia_ban}đ`);
        if (row.nguyen_lieu_id) {
          console.log(`    ✅ Linked: ${row.nguyen_lieu}`);
          console.log(`    Giá vốn: ${row.gia_von}đ`);
          console.log(`    Lợi nhuận: ${row.gia_ban - (row.gia_von || 0)}đ`);
        } else {
          console.log(`    ⚠️  CHƯA link với nguyên liệu - KHÔNG có giá vốn`);
        }
      });
    } else {
      console.log('  Không có topping nào trong hệ thống');
    }
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ MIGRATION HOÀN TẤT!');
    console.log('='.repeat(70));
    console.log('\n📝 ĐÃ THÊM:');
    console.log('  1. Cột nguyen_lieu_id vào tuy_chon_mon');
    console.log('  2. View v_line_topping_cost - Tính giá vốn topping theo line');
    console.log('  3. Function tinh_gia_von_voi_topping - Tính tổng giá vốn');
    console.log('  4. View v_profit_with_topping_cost - Báo cáo lợi nhuận đầy đủ');
    console.log('\n💡 LƯU Ý:');
    console.log('  - Topping cần được link với nguyên liệu để có giá vốn');
    console.log('  - Topping chưa link sẽ có giá vốn = 0');
    console.log('  - Sử dụng view v_profit_with_topping_cost để báo cáo chính xác\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ LỖI:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
