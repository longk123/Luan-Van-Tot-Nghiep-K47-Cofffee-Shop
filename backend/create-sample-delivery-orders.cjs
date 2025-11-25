const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function createSampleDeliveryOrders() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Tạo đơn DELIVERY mẫu để test chức năng Claim...\n');
    
    // 1. Lấy ca làm việc đang mở (CASHIER)
    const { rows: openShifts } = await client.query(`
      SELECT id, nhan_vien_id 
      FROM ca_lam 
      WHERE status = 'OPEN' 
        AND shift_type = 'CASHIER'
      ORDER BY started_at DESC
      LIMIT 1
    `);
    
    if (openShifts.length === 0) {
      console.log('❌ Không có ca làm việc CASHIER đang mở. Vui lòng mở ca trước.');
      await client.query('ROLLBACK');
      return;
    }
    
    const shiftId = openShifts[0].id;
    const cashierId = openShifts[0].nhan_vien_id;
    console.log(`✅ Sử dụng ca làm việc #${shiftId} của nhân viên #${cashierId}`);
    
    // 2. Lấy một số món đồ uống
    const { rows: menuItems } = await client.query(`
      SELECT m.id, m.ten, m.gia_mac_dinh, 
             COALESCE((SELECT MIN(mbt.gia) FROM mon_bien_the mbt WHERE mbt.mon_id = m.id AND mbt.active = TRUE), m.gia_mac_dinh) as gia
      FROM mon m
      LEFT JOIN loai_mon lm ON lm.id = m.loai_id
      WHERE m.active = TRUE
        AND (lm.ten ILIKE '%đồ uống%' OR lm.ten ILIKE '%cà phê%' OR lm.ten ILIKE '%nước%' OR lm.ten ILIKE '%trà%' OR lm.ten ILIKE '%smoothie%')
      LIMIT 5
    `);
    
    if (menuItems.length === 0) {
      console.log('❌ Không tìm thấy món đồ uống. Vui lòng kiểm tra dữ liệu menu.');
      await client.query('ROLLBACK');
      return;
    }
    
    console.log(`✅ Tìm thấy ${menuItems.length} món đồ uống\n`);
    
    // 3. Tạo 5 đơn DELIVERY mẫu
    const deliveryAddresses = [
      '123 Đường Nguyễn Văn Cừ, Phường An Khánh, Quận Ninh Kiều, TP. Cần Thơ',
      '456 Đường 3/2, Phường Xuân Khánh, Quận Ninh Kiều, TP. Cần Thơ',
      '789 Đường Võ Văn Tần, Phường An Thới, Quận Bình Thủy, TP. Cần Thơ',
      '321 Đường Trần Hưng Đạo, Phường Cái Khế, Quận Ninh Kiều, TP. Cần Thơ',
      '654 Đường Nguyễn Thái Học, Phường An Hòa, Quận Ninh Kiều, TP. Cần Thơ'
    ];
    
    const deliveryPhones = [
      '0987654321',
      '0912345678',
      '0901234567',
      '0923456789',
      '0934567890'
    ];
    
    const createdOrders = [];
    
    for (let i = 0; i < 5; i++) {
      // Tạo đơn hàng
      const { rows: orderRows } = await client.query(`
        INSERT INTO don_hang (
          ban_id, nhan_vien_id, ca_lam_id, 
          trang_thai, order_type, opened_at
        )
        VALUES (NULL, $1, $2, 'PAID', 'DELIVERY', NOW())
        RETURNING id
      `, [cashierId, shiftId]);
      
      const orderId = orderRows[0].id;
      
      // Chọn món ngẫu nhiên
      const randomItem = menuItems[Math.floor(Math.random() * menuItems.length)];
      
      // Lấy variant (nếu có)
      const { rows: variants } = await client.query(`
        SELECT id, gia 
        FROM mon_bien_the 
        WHERE mon_id = $1 AND active = TRUE 
        ORDER BY thu_tu 
        LIMIT 1
      `, [randomItem.id]);
      
      const variantId = variants.length > 0 ? variants[0].id : null;
      const donGia = variants.length > 0 ? variants[0].gia : randomItem.gia;
      
      // Thêm món vào đơn
      const { rows: itemRows } = await client.query(`
        INSERT INTO don_hang_chi_tiet (
          don_hang_id, mon_id, bien_the_id, so_luong, don_gia,
          ten_mon_snapshot, gia_niem_yet_snapshot, trang_thai_che_bien
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'DONE')
        RETURNING id
      `, [
        orderId,
        randomItem.id,
        variantId,
        2, // Số lượng
        donGia,
        randomItem.ten,
        donGia
      ]);
      
      // Tạo delivery_info với trạng thái PENDING (chưa có shipper_id)
      await client.query(`
        INSERT INTO don_hang_delivery_info (
          order_id, delivery_address, delivery_phone, 
          delivery_fee, distance_km, delivery_status
        )
        VALUES ($1, $2, $3, $4, $5, 'PENDING')
        ON CONFLICT (order_id) DO UPDATE SET
          delivery_status = 'PENDING',
          shipper_id = NULL
      `, [
        orderId,
        deliveryAddresses[i],
        deliveryPhones[i],
        8000, // Phí ship cố định 8k
        1.0 + (i * 0.3) // Khoảng cách từ 1.0km đến 2.2km
      ]);
      
      // Lấy method_code cho CASH
      const { rows: cashMethod } = await client.query(`
        SELECT code FROM payment_method WHERE code = 'CASH' LIMIT 1
      `);
      
      if (cashMethod.length === 0) {
        // Tạo CASH method nếu chưa có
        await client.query(`
          INSERT INTO payment_method (code, name, active) 
          VALUES ('CASH', 'Tiền mặt', true)
          ON CONFLICT (code) DO NOTHING
        `);
      }
      
      // Tạo payment để đơn có trạng thái PAID
      await client.query(`
        INSERT INTO order_payment (
          order_id, method_code, amount, status, created_by, created_at
        )
        VALUES ($1, 'CASH', $2, 'CAPTURED', $3, NOW())
      `, [orderId, donGia * 2 + 8000, cashierId]);
      
      createdOrders.push({
        id: orderId,
        address: deliveryAddresses[i],
        phone: deliveryPhones[i],
        item: randomItem.ten,
        total: donGia * 2 + 8000
      });
      
      console.log(`✅ Đã tạo đơn #${orderId}: ${randomItem.ten} x2 - ${deliveryAddresses[i].substring(0, 30)}...`);
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Hoàn tất! Đã tạo 5 đơn DELIVERY mẫu:\n');
    createdOrders.forEach((order, idx) => {
      console.log(`${idx + 1}. Đơn #${order.id}`);
      console.log(`   - Món: ${order.item} x2`);
      console.log(`   - Địa chỉ: ${order.address.substring(0, 50)}...`);
      console.log(`   - SĐT: ${order.phone}`);
      console.log(`   - Tổng tiền: ${order.total.toLocaleString('vi-VN')}đ`);
      console.log(`   - Trạng thái: PENDING (chưa có shipper_id)`);
      console.log('');
    });
    
    console.log('📝 Hướng dẫn test:');
    console.log('1. Đăng nhập với tài khoản waiter (waiter01 / waiter123)');
    console.log('2. Vào Dashboard → Tab "Giao hàng"');
    console.log('3. Bạn sẽ thấy 5 đơn với nút "Nhận đơn" hoặc checkbox');
    console.log('4. Có thể chọn nhiều đơn và nhận cùng lúc (tối đa 10 đơn)');
    console.log('5. Tổng tiền sẽ tự động tính bao gồm phí ship\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createSampleDeliveryOrders().catch(console.error);

