import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function checkAllOrders() {
  try {
    console.log('🔍 Kiểm tra TẤT CẢ đơn hàng từ 25/10 đến 26/10 (kể cả chưa thanh toán)\n');
    
    const query = `
      SELECT 
        o.id,
        o.trang_thai,
        o.opened_at,
        o.closed_at,
        to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD HH24:MI:SS') AS closed_at_str,
        (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
         FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id) AS revenue,
        (SELECT SUM(d.so_luong * d.don_gia)
         FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id) AS revenue_before_discount,
        (SELECT SUM(COALESCE(d.giam_gia, 0))
         FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id) AS total_discount
      FROM don_hang o
      WHERE o.closed_at IS NOT NULL
        AND to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') >= '2025-10-25'
        AND to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') <= '2025-10-26'
      ORDER BY (o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
    `;
    
    const result = await pool.query(query);
    
    console.log('📊 Tất cả đơn hàng:');
    console.log('─'.repeat(100));
    console.log('ID | Trạng thái | Thời gian | Trước giảm | Giảm giá | Sau giảm');
    console.log('─'.repeat(100));
    
    let totalPaid = 0;
    let totalAll = 0;
    
    result.rows.forEach(row => {
      const revenue = parseFloat(row.revenue || 0);
      const beforeDiscount = parseFloat(row.revenue_before_discount || 0);
      const discount = parseFloat(row.total_discount || 0);
      
      console.log(
        `${row.id} | ${row.trang_thai.padEnd(10)} | ${row.closed_at_str} | ` +
        `${beforeDiscount.toLocaleString('vi-VN').padStart(10)} đ | ` +
        `${discount.toLocaleString('vi-VN').padStart(8)} đ | ` +
        `${revenue.toLocaleString('vi-VN').padStart(10)} đ`
      );
      
      totalAll += revenue;
      if (row.trang_thai === 'PAID') {
        totalPaid += revenue;
      }
    });
    
    console.log('─'.repeat(100));
    console.log(`\n📌 Tổng kết:`);
    console.log(`Tổng tất cả đơn: ${totalAll.toLocaleString('vi-VN')} đ`);
    console.log(`Chỉ đơn PAID: ${totalPaid.toLocaleString('vi-VN')} đ`);
    console.log(`Số đơn: ${result.rows.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkAllOrders();

