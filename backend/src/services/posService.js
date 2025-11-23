// src/services/posService.js
import * as repo from '../repositories/posRepository.js';
import { getMyOpenShift } from '../repositories/shiftsRepository.js';
import { emitChange } from '../utils/eventBus.js';

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export default {
  async getTables(areaId) {
    return repo.default.getTablesWithSummary({ areaId });
  },

  // Mở (hoặc lấy) order OPEN cho 1 bàn
  async openOrGetOrder({ banId, nhanVienId, caLamId = null }) {
    // Nếu đã có order OPEN thì trả về luôn
    const exist = await repo.default.getOpenOrderByTable(banId);
    if (exist) return exist;

    // ✅ Kiểm tra bàn có reservation PENDING/CONFIRMED không (dùng cột mới)
    const { pool } = await import('../db.js');
    const tableCheck = await pool.query(
      `SELECT trang_thai_dat_ban, reservation_guest, reservation_time
       FROM ban
       WHERE id = $1`,
      [banId]
    );
    
    if (tableCheck.rows.length > 0 && tableCheck.rows[0].trang_thai_dat_ban) {
      const table = tableCheck.rows[0];
      const startTime = new Date(table.reservation_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const err = new Error(
        `Bàn đã có đặt trước (${table.trang_thai_dat_ban}) cho khách "${table.reservation_guest || 'N/A'}" lúc ${startTime}. ` +
        `Vui lòng check-in từ màn hình Đặt bàn hoặc hủy/no-show đặt bàn này trước.`
      );
      err.status = 400;
      err.code = 'TABLE_RESERVED';
      throw err;
    }

    // Nếu không truyền ca_lam_id thì tìm ca OPEN của nhân viên
    let caId = caLamId;
    if (!caId) {
      console.log(`🔍 Checking open shift for user_id: ${nhanVienId}`);
      const ca = await getMyOpenShift(nhanVienId);
      console.log(`🔍 getMyOpenShift result:`, ca);
      if (!ca) {
        console.log(`❌ No open shift found for user_id: ${nhanVienId}`);
        const err = new Error('Nhân viên chưa có ca OPEN.');
        err.status = 400; err.code = 'SHIFT_REQUIRED';
        throw err;
      }
      console.log(`✅ Found open shift: ${ca.id} for user_id: ${nhanVienId}`);
      caId = ca.id;
    }

    // Đổi trạng thái bàn sang DANG_DUNG nếu đang TRONG
    await repo.default.setTableStatus(banId, 'DANG_DUNG');
    emitChange('table.updated', { banId, trang_thai: 'DANG_DUNG' });

    // Tạo order mới
    const order = await repo.default.createOrderWithTable({ banId, nhanVienId });
    emitChange('order.updated', { orderId: order.id, banId });
    return order;
  },

  async createOrderNoTable({ nhanVienId, caLamId }) {
    // Kiểm tra có ca đang mở không
    let caId = caLamId;
    if (!caId) {
      const ca = await getMyOpenShift(nhanVienId);
      if (!ca) {
        const err = new Error('Nhân viên chưa có ca OPEN. Vui lòng mở ca làm việc trước khi tạo đơn.');
        err.status = 400;
        err.code = 'SHIFT_REQUIRED';
        throw err;
      }
      caId = ca.id;
    }
    
    const order = await repo.default.createOrderNoTable({ nhanVienId, caLamId: caId });
    emitChange('order.updated', { orderId: order.id });
    return order;
  },

  async getOrderItems(orderId) {
    return repo.default.getOrderItems(orderId);
  },

  async getOrderSummary(orderId) {
    return repo.default.getOrderSummary(orderId);
  },

  async addItem(orderId, payload) {
    const line = await repo.default.addItemToOrder({ orderId, ...payload });
    emitChange('order.items.changed', { orderId });
    return line;
  },

  // Xác nhận đơn - chuyển tất cả món PENDING → QUEUED
  async confirmOrder(orderId) {
    const { pool } = await import('../db.js');
    const result = await pool.query(
      `UPDATE don_hang_chi_tiet 
       SET trang_thai_che_bien = 'QUEUED' 
       WHERE don_hang_id = $1 
         AND trang_thai_che_bien = 'PENDING'
       RETURNING id`,
      [orderId]
    );
    
    emitChange('order.confirmed', { orderId, confirmedItems: result.rowCount });
    emitChange('order.items.changed', { orderId });
    
    return { confirmed: result.rowCount };
  },

  // Lấy danh sách đơn mang đi chưa giao
  async getTakeawayOrders() {
    const { pool } = await import('../db.js');
    const { rows } = await pool.query(`
      SELECT * FROM v_takeaway_pending
    `);
    
    return rows;
  },

  // Lấy danh sách đơn giao hàng chưa giao
  async getDeliveryOrders() {
    const { pool } = await import('../db.js');
    const { rows } = await pool.query(`
      SELECT * FROM v_delivery_pending
    `);
    
    return rows;
  },

  // Phân công đơn giao hàng cho nhân viên phục vụ
  async assignDeliveryOrder(orderId, shipperId, assignedBy) {
    const { pool } = await import('../db.js');
    
    // Kiểm tra đơn có tồn tại và là DELIVERY không
    const orderCheck = await pool.query(
      `SELECT id, order_type, trang_thai FROM don_hang WHERE id = $1`,
      [orderId]
    );
    
    if (orderCheck.rows.length === 0) {
      const err = new Error('Không tìm thấy đơn hàng');
      err.status = 404;
      throw err;
    }
    
    if (orderCheck.rows[0].order_type !== 'DELIVERY') {
      const err = new Error('Chỉ có thể phân công đơn DELIVERY');
      err.status = 400;
      throw err;
    }
    
    // Kiểm tra xem đã có delivery_info chưa
    const existingDeliveryInfo = await pool.query(
      `SELECT order_id FROM don_hang_delivery_info WHERE order_id = $1`,
      [orderId]
    );
    
    if (existingDeliveryInfo.rows.length === 0) {
      const err = new Error('Đơn hàng chưa có thông tin giao hàng. Vui lòng tạo đơn từ Customer Portal hoặc thêm thông tin giao hàng trước.');
      err.status = 400;
      throw err;
    }
    
    // Chỉ UPDATE khi đã có delivery_info (vì delivery_address là NOT NULL)
    const result = await pool.query(`
      UPDATE don_hang_delivery_info
      SET shipper_id = $2,
          delivery_status = 'ASSIGNED',
          updated_at = NOW()
      WHERE order_id = $1
      RETURNING *
    `, [orderId, shipperId]);
    
    // Emit event
    const { emitEvent } = await import('../utils/sse.js');
    emitEvent('delivery.assigned', { orderId, shipperId, assignedBy });
    
    return result.rows[0];
  },

  // Cập nhật trạng thái giao hàng
  async updateDeliveryStatus(orderId, status, shipperId = null) {
    const { pool } = await import('../db.js');
    
    const validStatuses = ['PENDING', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];
    if (!validStatuses.includes(status)) {
      const err = new Error(`Trạng thái không hợp lệ. Phải là một trong: ${validStatuses.join(', ')}`);
      err.status = 400;
      throw err;
    }
    
    // Kiểm tra tất cả món đã xong chưa khi chuyển sang OUT_FOR_DELIVERY
    if (status === 'OUT_FOR_DELIVERY') {
      const checkResult = await pool.query(
        `SELECT COUNT(*) as count 
         FROM don_hang_chi_tiet 
         WHERE don_hang_id = $1 
           AND trang_thai_che_bien NOT IN ('DONE', 'CANCELLED')`,
        [orderId]
      );
      
      if (parseInt(checkResult.rows[0].count) > 0) {
        const err = new Error('Còn món chưa hoàn tất. Không thể bắt đầu giao hàng.');
        err.status = 400;
        throw err;
      }
    }
    
    // Kiểm tra quyền: chỉ shipper được phân công mới có thể update
    if (shipperId) {
      const checkResult = await pool.query(
        `SELECT shipper_id FROM don_hang_delivery_info WHERE order_id = $1`,
        [orderId]
      );
      
      if (checkResult.rows.length > 0 && checkResult.rows[0].shipper_id !== shipperId) {
        const err = new Error('Bạn không có quyền cập nhật đơn này');
        err.status = 403;
        throw err;
      }
    }
    
    // Cập nhật trạng thái
    const result = await pool.query(`
      UPDATE don_hang_delivery_info
      SET delivery_status = $1,
          updated_at = NOW()
      WHERE order_id = $2
      RETURNING *
    `, [status, orderId]);
    
    if (result.rows.length === 0) {
      const err = new Error('Không tìm thấy thông tin giao hàng');
      err.status = 404;
      throw err;
    }
    
    // Nếu DELIVERED, cập nhật delivered_at
    if (status === 'DELIVERED') {
      await pool.query(`
        UPDATE don_hang_delivery_info
        SET actual_delivered_at = NOW()
        WHERE order_id = $1
      `, [orderId]);
      
      await pool.query(`
        UPDATE don_hang
        SET delivered_at = NOW()
        WHERE id = $1
      `, [orderId]);
    }
    
    // Emit event
    const { emitEvent } = await import('../utils/sse.js');
    emitEvent('delivery.status.updated', { orderId, status, shipperId });
    
    return result.rows[0];
  },

  // Lấy đơn được phân công cho nhân viên phục vụ
  async getAssignedDeliveryOrders(shipperId, status = null) {
    const { pool } = await import('../db.js');
    
    let query = `
      SELECT 
        dh.id,
        dh.trang_thai,
        dh.order_type,
        dh.opened_at,
        di.delivery_address,
        di.delivery_phone,
        di.delivery_status,
        di.distance_km,
        di.delivery_fee,
        settlement.grand_total,
        ca.full_name AS khach_hang_ten,
        ca.phone AS khach_hang_phone,
        json_agg(
          json_build_object(
            'id', ct.id,
            'mon_ten', COALESCE(ct.ten_mon_snapshot, m.ten),
            'bien_the_ten', btm.ten_bien_the,
            'so_luong', ct.so_luong,
            'trang_thai_che_bien', ct.trang_thai_che_bien
          ) ORDER BY ct.id
        ) FILTER (WHERE ct.id IS NOT NULL) AS items
      FROM don_hang dh
      JOIN don_hang_delivery_info di ON di.order_id = dh.id
      LEFT JOIN don_hang_chi_tiet ct ON ct.don_hang_id = dh.id
      LEFT JOIN mon m ON m.id = ct.mon_id
      LEFT JOIN mon_bien_the btm ON btm.id = ct.bien_the_id
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      LEFT JOIN customer_accounts ca ON ca.id = dh.customer_account_id
      WHERE di.shipper_id = $1
        AND dh.trang_thai IN ('OPEN', 'PAID')
        AND (dh.delivered_at IS NULL OR di.actual_delivered_at IS NULL)
    `;
    
    const params = [shipperId];
    
    if (status) {
      query += ` AND di.delivery_status = $2`;
      params.push(status);
    }
    
    query += `
      GROUP BY dh.id, dh.trang_thai, dh.order_type, dh.opened_at,
               di.delivery_address, di.delivery_phone, di.delivery_status,
               di.distance_km, di.delivery_fee, settlement.grand_total,
               ca.full_name, ca.phone
      ORDER BY dh.opened_at ASC
    `;
    
    const { rows } = await pool.query(query, params);
    return rows;
  },

  // Giao hàng (đánh dấu đơn hoàn tất)
  async deliverOrder(orderId) {
    const { pool } = await import('../db.js');
    
    // Kiểm tra tất cả món đã DONE chưa
    const checkResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM don_hang_chi_tiet 
       WHERE don_hang_id = $1 
         AND trang_thai_che_bien NOT IN ('DONE', 'CANCELLED')`,
      [orderId]
    );
    
    if (parseInt(checkResult.rows[0].count) > 0) {
      const err = new Error('Còn món chưa hoàn tất. Không thể giao hàng.');
      err.status = 400;
      throw err;
    }
    
    // Đánh dấu đã giao hàng
    const result = await pool.query(
      `UPDATE don_hang 
       SET delivered_at = NOW(),
           closed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [orderId]
    );
    
    emitChange('order.completed', { orderId });
    
    return result.rows[0];
  },

  // Lưu thông tin giao hàng
  async saveDeliveryInfo(orderId, data) {
    const { pool } = await import('../db.js');
    
    // Store location (địa chỉ ảo cho demo: 123 Đường 3/2, Phường Xuân Khánh, Ninh Kiều, Cần Thơ)
    const STORE_LOCATION = {
      lat: 10.0310,  // Tọa độ gần Đại học Cần Thơ, đường 3/2
      lng: 105.7690,
      address: '123 Đường 3/2, Phường Xuân Khánh, Ninh Kiều, Cần Thơ'
    };
    
    // Kiểm tra địa chỉ có thuộc quận Ninh Kiều không
    const checkIsNinhKieu = (address) => {
      if (!address) return false;
      const addressLower = address.toLowerCase();
      const ninhKieuKeywords = [
        'ninh kiều',
        'xuân khánh',
        'an khánh',
        'an hòa',
        'an thới',
        'bình thủy',
        'cái khế',
        'hưng lợi',
        'tân an',
        'thới bình',
        'thới an đông'
      ];
      return ninhKieuKeywords.some(keyword => addressLower.includes(keyword));
    };
    
    // Kiểm tra đơn hàng có tồn tại và là DELIVERY không
    const orderCheck = await pool.query(
      `SELECT id, order_type FROM don_hang WHERE id = $1`,
      [orderId]
    );
    
    if (orderCheck.rows.length === 0) {
      const err = new Error('Đơn hàng không tồn tại');
      err.status = 404;
      throw err;
    }
    
    if (orderCheck.rows[0].order_type !== 'DELIVERY') {
      const err = new Error('Chỉ có thể lưu thông tin giao hàng cho đơn DELIVERY');
      err.status = 400;
      throw err;
    }
    
    // Validate địa chỉ phải thuộc quận Ninh Kiều
    if (data.deliveryAddress && !checkIsNinhKieu(data.deliveryAddress)) {
      const err = new Error('Chúng tôi chỉ giao hàng trong quận Ninh Kiều, Cần Thơ');
      err.status = 400;
      throw err;
    }
    
    // Tính khoảng cách nếu có tọa độ (để lưu vào database, không dùng để validate)
    if (data.latitude && data.longitude) {
      const distance = calculateDistance(
        STORE_LOCATION.lat, 
        STORE_LOCATION.lng, 
        parseFloat(data.latitude), 
        parseFloat(data.longitude)
      );
      
      // Use calculated distance if not provided
      if (!data.distance) {
        data.distance = distance;
      }
    }
    
    // Lưu hoặc cập nhật delivery info
    const result = await pool.query(
      `INSERT INTO don_hang_delivery_info (
        order_id, delivery_address, delivery_phone, delivery_notes, 
        delivery_fee, latitude, longitude, distance_km, estimated_time, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (order_id) 
      DO UPDATE SET 
        delivery_address = EXCLUDED.delivery_address,
        delivery_phone = EXCLUDED.delivery_phone,
        delivery_notes = EXCLUDED.delivery_notes,
        delivery_fee = EXCLUDED.delivery_fee,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        distance_km = EXCLUDED.distance_km,
        estimated_time = EXCLUDED.estimated_time,
        updated_at = NOW()
      RETURNING *`,
      [
        orderId,
        data.deliveryAddress,
        data.deliveryPhone || null,
        data.deliveryNotes || null,
        data.deliveryFee || 0,
        data.latitude ? parseFloat(data.latitude) : null,
        data.longitude ? parseFloat(data.longitude) : null,
        data.distance ? parseFloat(data.distance) : null,
        data.deliveryTime ? new Date(data.deliveryTime) : null
      ]
    );
    
    return result.rows[0];
  },

  async updateItem(lineId, payload) {
    const updated = await repo.default.updateItemQuantity({ itemId: lineId, soLuong: payload.so_luong });
    if (!updated) {
      const err = new Error('Không tìm thấy line món.');
      err.status = 404;
      throw err;
    }
    emitChange('order.items.changed', { orderId: updated.don_hang_id });
    return updated;
  },

  async removeItem(lineId) {
    const deleted = await repo.default.removeItemFromOrder(lineId);
    emitChange('order.items.changed', { orderId: deleted.don_hang_id });
    return deleted;
  },

  // Lấy menu theo category
  async getMenuByCategory(categoryId) {
    return repo.default.getMenuByCategory(categoryId);
  },

  // Lấy categories
  async getMenuCategories() {
    return repo.default.getMenuCategories();
  },

  // Lấy variants của món
  async getMenuItemVariants(monId) {
    return repo.default.getMenuItemVariants(monId);
  },

  // Di chuyển order sang bàn khác (hỗ trợ cả OPEN và PAID)
  async moveOrderTableService({ orderId, toTableId, userId }) {
    if (!Number.isInteger(orderId) || !Number.isInteger(toTableId)) {
      const err = new Error('orderId hoặc to_table_id không hợp lệ.');
      err.status = 400;
      throw err;
    }

    // Thực hiện đổi bàn
    const result = await repo.default.moveOrderToTable({ orderId, toTableId });

    // Phát SSE để frontend cập nhật realtime
    emitChange('order.updated', { 
      orderId: result.order_id, 
      banId: result.new_table_id,
      movedFrom: result.old_table_id 
    });
    
    // Cập nhật bàn cũ
    if (result.old_table_id) {
      emitChange('table.updated', { banId: result.old_table_id });
    }
    
    // Cập nhật bàn mới
    emitChange('table.updated', { banId: result.new_table_id });

    console.log(`[POS] Nhân viên ${userId} đổi đơn #${orderId} từ bàn ${result.old_table_id} → ${result.new_table_id}`);

    return result;
  }
};

export async function checkoutOrderService({ orderId, payment_method, keepSeated, note, userId }) {
  const data = await repo.default.checkoutOrder({ orderId, payment_method, keepSeated, note, userId });
  
  // Phát SSE để frontend cập nhật realtime
  emitChange('order.updated', { orderId, banId: data.ban_id, status: 'PAID' });

  // ✅ BỎ auto-set TRỐNG: sau thanh toán bàn vẫn "ĐANG_DÙNG"
  // Nhân viên sẽ thủ công bấm "Cho trống" hoặc "Khóa" khi khách rời bàn

  return data;
}

// === Close table after paid ===
export async function closeTableAfterPaidService({ tableId, toStatus = 'TRONG', userId }) {
  if (!Number.isInteger(tableId)) {
    const err = new Error('Thiếu tableId hợp lệ.');
    err.status = 400;
    throw err;
  }

  // Lấy order gần nhất của bàn
  const latest = await repo.default.getLatestOrderByTable(tableId);
  if (!latest) {
    const err = new Error('Không tìm thấy đơn hàng nào cho bàn này.');
    err.status = 404;
    throw err;
  }

  // Kiểm tra trạng thái
  const status = latest.status || latest.trang_thai;
  if (status !== 'PAID') {
    const err = new Error('Đơn hàng của bàn chưa được thanh toán.');
    err.status = 400;
    throw err;
  }

  // Đổi trạng thái bàn
  const updated = await repo.default.setTableStatus(tableId, toStatus);

  // Ghi log hoặc audit nếu cần
  console.log(`[POS] Nhân viên ${userId} đổi bàn #${tableId} → ${toStatus}`);

  // Phát SSE để frontend cập nhật realtime
  emitChange('table.updated', { banId: tableId, trang_thai: toStatus });

  return updated;
}

// === Cancel order (both TAKEAWAY & DINE_IN) ===
export async function cancelOrderService({ orderId, userId, reason = null }) {
  // 1️⃣ Lấy đơn hàng
  const order = await repo.default.getOrderById(orderId);
  if (!order) {
    const err = new Error('Không tìm thấy đơn hàng.');
    err.status = 404;
    throw err;
  }

  // 1.5️⃣ Kiểm tra có ca đang mở không
  const ca = await getMyOpenShift(userId);
  if (!ca) {
    const err = new Error('Nhân viên chưa có ca OPEN. Vui lòng mở ca làm việc trước khi hủy đơn.');
    err.status = 400;
    err.code = 'SHIFT_REQUIRED';
    throw err;
  }

  // 2️⃣ Chỉ cho phép hủy nếu chưa thanh toán
  if (['PAID', 'CANCELLED'].includes(order.trang_thai)) {
    const err = new Error('Không thể hủy đơn đã thanh toán hoặc đã hủy.');
    err.status = 400;
    throw err;
  }

  // 3️⃣ Kiểm tra món đang làm hoặc đã làm xong
  const { pool } = await import('../db.js');
  const checkItems = await pool.query(
    `SELECT COUNT(*) as count 
     FROM don_hang_chi_tiet 
     WHERE don_hang_id = $1 
       AND trang_thai_che_bien IN ('MAKING', 'DONE')`,
    [orderId]
  );
  
  if (parseInt(checkItems.rows[0].count) > 0) {
    const err = new Error(`Không thể hủy đơn: Có ${checkItems.rows[0].count} món đã bắt đầu làm hoặc hoàn tất. Vui lòng liên hệ bếp/pha chế.`);
    err.status = 400;
    err.code = 'ITEMS_IN_PROGRESS';
    throw err;
  }

  // 3️⃣ Cập nhật trạng thái
  const updated = await repo.default.setOrderStatus(orderId, 'CANCELLED', reason);

  // 4️⃣ Nếu là đơn tại bàn → đổi trạng thái bàn
  if (order.ban_id) {
    await repo.default.setTableStatus(order.ban_id, 'TRONG');
    emitChange('table.updated', { banId: order.ban_id, trang_thai: 'TRONG' });
  }

  // 5️⃣ Phát sự kiện realtime
  emitChange('order.updated', { orderId, status: 'CANCELLED' });

  console.log(`[POS] Nhân viên ${userId} đã hủy đơn #${orderId}`);
  return updated;
}