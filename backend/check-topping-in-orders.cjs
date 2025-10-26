const {Pool}=require('pg');
require('dotenv').config({path:require('path').join(__dirname,'.env')});
const p=new Pool({
  host:process.env.DB_HOST,
  port:process.env.DB_PORT,
  database:process.env.DB_NAME,
  user:process.env.DB_USER,
  password:String(process.env.DB_PASSWORD)
});

async function check() {
  console.log('\n🔍 Kiểm tra đơn hàng có topping\n');
  
  // 1. Kiểm tra có đơn nào có topping không
  const withTopping = await p.query(`
    SELECT 
      dh.id as order_id,
      dh.trang_thai,
      COUNT(DISTINCT dhctto.id) as so_topping
    FROM don_hang dh
    JOIN don_hang_chi_tiet dhct ON dhct.don_hang_id = dh.id
    JOIN don_hang_chi_tiet_tuy_chon dhctto ON dhctto.line_id = dhct.id
    JOIN tuy_chon_mon tc ON tc.id = dhctto.tuy_chon_id AND tc.loai = 'AMOUNT'
    WHERE dh.trang_thai = 'PAID'
    GROUP BY dh.id, dh.trang_thai
    ORDER BY dh.id DESC
    LIMIT 5
  `);
  
  console.log(`Đơn có topping (loại AMOUNT): ${withTopping.rows.length}`);
  
  if (withTopping.rows.length > 0) {
    console.log('\n📦 Chi tiết đơn có topping:');
    for (const order of withTopping.rows) {
      console.log(`\nĐơn #${order.order_id}:`);
      
      // Chi tiết topping
      const details = await p.query(`
        SELECT 
          m.ten as mon,
          tc.ten as topping,
          tc.nguyen_lieu_id,
          nl.ten as nguyen_lieu,
          nl.gia_nhap_moi_nhat,
          dhctto.so_luong,
          tc.gia_mac_dinh as gia_ban
        FROM don_hang_chi_tiet dhct
        JOIN mon m ON m.id = dhct.mon_id
        JOIN don_hang_chi_tiet_tuy_chon dhctto ON dhctto.line_id = dhct.id
        JOIN tuy_chon_mon tc ON tc.id = dhctto.tuy_chon_id
        LEFT JOIN nguyen_lieu nl ON nl.id = tc.nguyen_lieu_id
        WHERE dhct.don_hang_id = $1 AND tc.loai = 'AMOUNT'
      `, [order.order_id]);
      
      details.rows.forEach(d => {
        console.log(`  ${d.mon} + ${d.topping}`);
        console.log(`    Giá bán: ${d.gia_ban}đ × ${d.so_luong}`);
        if (d.nguyen_lieu_id) {
          console.log(`    ✅ Linked: ${d.nguyen_lieu} - Giá vốn: ${d.gia_nhap_moi_nhat}đ`);
        } else {
          console.log(`    ❌ CHƯA link với nguyên liệu!`);
        }
      });
      
      // Check view
      const profit = await p.query(`
        SELECT gia_von_topping FROM v_profit_with_topping_cost WHERE order_id = $1
      `, [order.order_id]);
      
      if (profit.rows[0]) {
        console.log(`  Giá vốn topping từ view: ${profit.rows[0].gia_von_topping}đ`);
      }
    }
  } else {
    console.log('\n❌ KHÔNG có đơn nào với topping loại AMOUNT');
    
    // Kiểm tra tất cả loại topping
    const allTopping = await p.query(`
      SELECT 
        tc.loai,
        COUNT(*) as count
      FROM don_hang dh
      JOIN don_hang_chi_tiet dhct ON dhct.don_hang_id = dh.id
      JOIN don_hang_chi_tiet_tuy_chon dhctto ON dhctto.line_id = dhct.id
      JOIN tuy_chon_mon tc ON tc.id = dhctto.tuy_chon_id
      WHERE dh.trang_thai = 'PAID'
      GROUP BY tc.loai
    `);
    
    console.log('\n📊 Tùy chọn trong đơn hàng theo loại:');
    allTopping.rows.forEach(r => {
      console.log(`  ${r.loai}: ${r.count} lần`);
    });
  }
  
  // Kiểm tra topping trong database
  console.log('\n\n📋 Topping trong database:');
  const toppings = await p.query(`
    SELECT 
      id,
      ma,
      ten,
      loai,
      gia_mac_dinh,
      nguyen_lieu_id
    FROM tuy_chon_mon
    WHERE loai = 'AMOUNT'
  `);
  
  toppings.rows.forEach(t => {
    console.log(`  ${t.ten} (${t.ma}) - ${t.loai}`);
    console.log(`    Giá bán: ${t.gia_mac_dinh}đ`);
    console.log(`    Link: ${t.nguyen_lieu_id ? '✅ ID=' + t.nguyen_lieu_id : '❌ Chưa link'}`);
  });
  
  await p.end();
}

check();
