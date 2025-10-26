const {Pool}=require('pg');
require('dotenv').config({path:require('path').join(__dirname,'.env')});
const p=new Pool({
  host:process.env.DB_HOST,
  port:process.env.DB_PORT,
  database:process.env.DB_NAME,
  user:process.env.DB_USER,
  password:String(process.env.DB_PASSWORD)
});

p.query(`
  DROP VIEW IF EXISTS v_profit_with_topping_cost CASCADE;
  
  CREATE VIEW v_profit_with_topping_cost AS
  SELECT 
    dh.id AS order_id,
    dh.trang_thai,
    dh.opened_at,
    dh.closed_at,
    COALESCE(omt.grand_total, 0) AS doanh_thu,
    COALESCE(SUM(dhct.gia_von_thuc_te * dhct.so_luong), 0)::INTEGER AS gia_von_mon,
    COALESCE(SUM(vtc.tong_gia_von_topping * dhct.so_luong), 0)::INTEGER AS gia_von_topping,
    (COALESCE(SUM(dhct.gia_von_thuc_te * dhct.so_luong), 0) + 
     COALESCE(SUM(vtc.tong_gia_von_topping * dhct.so_luong), 0))::INTEGER AS tong_gia_von,
    (COALESCE(omt.grand_total, 0) - 
     COALESCE(SUM(dhct.gia_von_thuc_te * dhct.so_luong), 0) -
     COALESCE(SUM(vtc.tong_gia_von_topping * dhct.so_luong), 0))::INTEGER AS loi_nhuan
  FROM don_hang dh
  LEFT JOIN don_hang_chi_tiet dhct ON dhct.don_hang_id = dh.id
  LEFT JOIN v_line_topping_cost vtc ON vtc.line_id = dhct.id
  LEFT JOIN v_order_money_totals omt ON omt.order_id = dh.id
  WHERE dh.trang_thai = 'PAID'
  GROUP BY dh.id, dh.trang_thai, dh.opened_at, dh.closed_at, omt.grand_total;
`).then(()=>{
  console.log('✅ View updated to use PAID status!');
  p.end();
}).catch(e=>{
  console.error('❌ Error:', e.message);
  p.end();
});
