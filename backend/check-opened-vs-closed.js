import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function checkOpenedVsClosed() {
  try {
    console.log('🔍 Kiểm tra đơn hàng: opened_at vs closed_at\n');
    
    const query = `
      SELECT 
        o.id,
        o.trang_thai,
        o.opened_at,
        (o.opened_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') AS opened_at_vn,
        to_char((o.opened_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') AS opened_date,
        o.closed_at,
        (o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') AS closed_at_vn,
        to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') AS closed_date,
        (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
         FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id) AS revenue
      FROM don_hang o
      WHERE o.closed_at IS NOT NULL
        AND (
          to_char((o.opened_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') IN ('2025-10-25', '2025-10-26')
          OR
          to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') IN ('2025-10-25', '2025-10-26')
        )
      ORDER BY o.opened_at
    `;
    
    const result = await pool.query(query);
    
    console.log('📊 Tất cả đơn hàng liên quan đến 25/10 và 26/10:');
    console.log('─'.repeat(100));
    console.log('ID | Trạng thái | Ngày mở | Ngày đóng | Doanh thu | Ghi chú');
    console.log('─'.repeat(100));
    
    let count25Opened = 0, revenue25Opened = 0;
    let count26Opened = 0, revenue26Opened = 0;
    let count25Closed = 0, revenue25Closed = 0;
    let count26Closed = 0, revenue26Closed = 0;
    
    result.rows.forEach(row => {
      const revenue = parseFloat(row.revenue || 0);
      const openedDate = row.opened_date;
      const closedDate = row.closed_date;
      
      let note = '';
      if (openedDate !== closedDate) {
        note = `⚠️ Mở ${openedDate}, đóng ${closedDate}`;
      }
      
      console.log(
        `${row.id} | ${row.trang_thai.padEnd(10)} | ${openedDate} | ${closedDate} | ` +
        `${revenue.toLocaleString('vi-VN').padStart(10)} đ | ${note}`
      );
      
      // Đếm theo opened_at
      if (openedDate === '2025-10-25' && row.trang_thai === 'PAID') {
        count25Opened++;
        revenue25Opened += revenue;
      } else if (openedDate === '2025-10-26' && row.trang_thai === 'PAID') {
        count26Opened++;
        revenue26Opened += revenue;
      }
      
      // Đếm theo closed_at
      if (closedDate === '2025-10-25' && row.trang_thai === 'PAID') {
        count25Closed++;
        revenue25Closed += revenue;
      } else if (closedDate === '2025-10-26' && row.trang_thai === 'PAID') {
        count26Closed++;
        revenue26Closed += revenue;
      }
    });
    
    console.log('─'.repeat(100));
    console.log('\n📌 Tổng kết theo OPENED_AT (cách cũ - SAI):');
    console.log(`25/10: ${count25Opened} đơn | ${revenue25Opened.toLocaleString('vi-VN')} đ`);
    console.log(`26/10: ${count26Opened} đơn | ${revenue26Opened.toLocaleString('vi-VN')} đ`);
    
    console.log('\n📌 Tổng kết theo CLOSED_AT (cách mới - ĐÚNG):');
    console.log(`25/10: ${count25Closed} đơn | ${revenue25Closed.toLocaleString('vi-VN')} đ`);
    console.log(`26/10: ${count26Closed} đơn | ${revenue26Closed.toLocaleString('vi-VN')} đ`);
    
    console.log('\n📌 So sánh với UI:');
    console.log(`UI hiển thị 25/10: 32.000 đ (theo opened_at - SAI)`);
    console.log(`Nên hiển thị 25/10: ${revenue25Closed.toLocaleString('vi-VN')} đ (theo closed_at - ĐÚNG)`);
    console.log(`UI hiển thị 26/10: 130.000 đ (theo opened_at - SAI)`);
    console.log(`Nên hiển thị 26/10: ${revenue26Closed.toLocaleString('vi-VN')} đ (theo closed_at - ĐÚNG)`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkOpenedVsClosed();

