const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function checkWaiterOrders() {
  try {
    // Lấy user_id của waiter01
    const waiterResult = await pool.query(`
      SELECT user_id FROM users WHERE username = 'waiter01'
    `);
    
    if (waiterResult.rows.length === 0) {
      console.log('❌ Không tìm thấy user waiter01');
      await pool.end();
      return;
    }
    
    const waiterId = waiterResult.rows[0].user_id;
    console.log(`✅ Waiter ID: ${waiterId}\n`);
    
    // Lấy ca làm việc hiện tại của waiter
    const shiftResult = await pool.query(`
      SELECT id, shift_type, started_at 
      FROM ca_lam 
      WHERE nhan_vien_id = $1 AND closed_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `, [waiterId]);
    
    if (shiftResult.rows.length === 0) {
      console.log('❌ Waiter chưa mở ca làm việc');
      await pool.end();
      return;
    }
    
    const shift = shiftResult.rows[0];
    console.log(`📋 Ca làm việc hiện tại:`);
    console.log(`   - ID: ${shift.id}`);
    console.log(`   - Loại: ${shift.shift_type}`);
    console.log(`   - Bắt đầu: ${new Date(shift.started_at).toLocaleString('vi-VN')}\n`);
    
    // Lấy đơn hàng của waiter (DINE_IN/TAKEAWAY do mình tạo)
    const ordersResult = await pool.query(`
      SELECT 
        dh.id,
        dh.order_type,
        dh.trang_thai,
        dh.opened_at,
        dh.closed_at,
        b.ten_ban,
        COALESCE(settlement.grand_total, 0) as tong_tien,
        (SELECT COUNT(*) FROM don_hang_chi_tiet WHERE don_hang_id = dh.id) as so_mon
      FROM don_hang dh
      LEFT JOIN ban b ON b.id = dh.ban_id
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.ca_lam_id = $1
        AND dh.nhan_vien_id = $2
        AND dh.order_type IN ('DINE_IN', 'TAKEAWAY')
      ORDER BY dh.opened_at DESC
      LIMIT 10
    `, [shift.id, waiterId]);
    
    console.log(`📦 Đơn hàng do waiter tạo (DINE_IN/TAKEAWAY):`);
    if (ordersResult.rows.length === 0) {
      console.log('   ❌ Chưa có đơn nào\n');
    } else {
      console.table(ordersResult.rows.map(r => ({
        ID: r.id,
        'Loại': r.order_type === 'DINE_IN' ? 'Tại bàn' : 'Mang đi',
        'Bàn': r.ten_ban || 'N/A',
        'Trạng thái': r.trang_thai,
        'Số món': r.so_mon,
        'Tổng tiền': r.tong_tien.toLocaleString('vi-VN') + 'đ'
      })));
    }
    
    // Lấy đơn DELIVERY mà waiter đã claim
    const deliveryResult = await pool.query(`
      SELECT 
        dh.id,
        dh.trang_thai,
        dh.opened_at,
        di.delivery_status,
        di.delivery_address,
        COALESCE(settlement.grand_total, 0) as tong_tien
      FROM don_hang dh
      JOIN don_hang_delivery_info di ON di.order_id = dh.id
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.ca_lam_id = $1
        AND dh.order_type = 'DELIVERY'
        AND di.shipper_id = $2
      ORDER BY dh.opened_at DESC
      LIMIT 10
    `, [shift.id, waiterId]);
    
    console.log(`\n🚚 Đơn DELIVERY đã nhận:`);
    if (deliveryResult.rows.length === 0) {
      console.log('   ❌ Chưa nhận đơn giao hàng nào\n');
    } else {
      console.table(deliveryResult.rows.map(r => ({
        ID: r.id,
        'Trạng thái đơn': r.trang_thai,
        'Trạng thái giao': r.delivery_status,
        'Địa chỉ': r.delivery_address.substring(0, 40) + '...',
        'Tổng tiền': r.tong_tien.toLocaleString('vi-VN') + 'đ'
      })));
    }
    
    // Lấy đơn DELIVERY đang chờ claim (PENDING)
    const pendingResult = await pool.query(`
      SELECT 
        dh.id,
        dh.opened_at,
        di.delivery_address,
        di.distance_km,
        COALESCE(settlement.grand_total, 0) as tong_tien
      FROM don_hang dh
      JOIN don_hang_delivery_info di ON di.order_id = dh.id
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.trang_thai = 'PAID'
        AND dh.order_type = 'DELIVERY'
        AND di.delivery_status = 'PENDING'
      ORDER BY dh.opened_at DESC
      LIMIT 5
    `);
    
    console.log(`\n🎯 Đơn DELIVERY chờ săn (PENDING):`);
    if (pendingResult.rows.length === 0) {
      console.log('   ❌ Không có đơn nào\n');
    } else {
      console.table(pendingResult.rows.map(r => ({
        ID: r.id,
        'Địa chỉ': r.delivery_address.substring(0, 40) + '...',
        'Khoảng cách': r.distance_km ? parseFloat(r.distance_km).toFixed(2) + ' km' : 'N/A',
        'Tổng tiền': r.tong_tien.toLocaleString('vi-VN') + 'đ',
        'Thời gian': new Date(r.opened_at).toLocaleString('vi-VN')
      })));
    }

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi:', err);
    await pool.end();
    process.exit(1);
  }
}

checkWaiterOrders();
