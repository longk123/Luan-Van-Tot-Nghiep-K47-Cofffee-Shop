// Customer Repository - Database layer for customer portal
import { pool } from '../db.js';

export default {
  // ==================== CUSTOMER ACCOUNTS ====================
  
  /**
   * Create customer account
   */
  async createAccount({ phone, email, passwordHash, fullName }) {
    const sql = `
      INSERT INTO customer_accounts (phone, email, password_hash, full_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, phone, email, full_name, is_active, loyalty_points, created_at
    `;
    const { rows } = await pool.query(sql, [phone, email, passwordHash, fullName]);
    return rows[0];
  },

  /**
   * Find account by phone
   */
  async findByPhone(phone) {
    const sql = `
      SELECT id, phone, email, password_hash, full_name, date_of_birth, gender, 
             address, is_active, loyalty_points, created_at
      FROM customer_accounts
      WHERE phone = $1
    `;
    const { rows } = await pool.query(sql, [phone]);
    return rows[0];
  },

  /**
   * Find account by email
   */
  async findByEmail(email) {
    const sql = `
      SELECT id, phone, email, password_hash, full_name, date_of_birth, gender,
             address, is_active, loyalty_points, created_at
      FROM customer_accounts
      WHERE email = $1
    `;
    const { rows } = await pool.query(sql, [email]);
    return rows[0];
  },

  /**
   * Find account by ID
   */
  async findById(id) {
    const sql = `
      SELECT id, phone, email, full_name, date_of_birth, gender,
             address, is_active, email_verified, phone_verified, 
             loyalty_points, created_at, updated_at
      FROM customer_accounts
      WHERE id = $1 AND is_active = TRUE
    `;
    const { rows } = await pool.query(sql, [id]);
    return rows[0];
  },

  /**
   * Update account info
   */
  async updateAccount(id, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (updates.fullName !== undefined) {
      fields.push(`full_name = $${idx++}`);
      values.push(updates.fullName);
    }
    if (updates.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(updates.email);
    }
    if (updates.dateOfBirth !== undefined) {
      fields.push(`date_of_birth = $${idx++}`);
      values.push(updates.dateOfBirth);
    }
    if (updates.gender !== undefined) {
      fields.push(`gender = $${idx++}`);
      values.push(updates.gender);
    }
    if (updates.address !== undefined) {
      fields.push(`address = $${idx++}`);
      values.push(updates.address);
    }
    if (updates.passwordHash !== undefined) {
      fields.push(`password_hash = $${idx++}`);
      values.push(updates.passwordHash);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const sql = `
      UPDATE customer_accounts
      SET ${fields.join(', ')}
      WHERE id = $${idx} AND is_active = TRUE
      RETURNING id, phone, email, full_name, date_of_birth, gender, address, loyalty_points
    `;
    const { rows } = await pool.query(sql, values);
    return rows[0];
  },

  // ==================== CART ====================

  /**
   * Get cart by customer ID
   */
  async getCartByCustomerId(customerId) {
    const sql = `
      SELECT id, customer_account_id, items, promo_code, promo_discount, 
             created_at, updated_at, expires_at
      FROM customer_cart
      WHERE customer_account_id = $1
        AND expires_at > NOW()
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    const { rows } = await pool.query(sql, [customerId]);
    return rows[0];
  },

  /**
   * Get cart by session ID
   */
  async getCartBySessionId(sessionId) {
    const sql = `
      SELECT id, session_id, items, promo_code, promo_discount,
             created_at, updated_at, expires_at
      FROM customer_cart
      WHERE session_id = $1
        AND expires_at > NOW()
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    const { rows } = await pool.query(sql, [sessionId]);
    return rows[0];
  },

  /**
   * Create cart
   */
  async createCart({ customerId, sessionId, items = [] }) {
    const sql = `
      INSERT INTO customer_cart (customer_account_id, session_id, items)
      VALUES ($1, $2, $3::jsonb)
      RETURNING id, customer_account_id, session_id, items, promo_code, 
                promo_discount, created_at, updated_at, expires_at
    `;
    const { rows } = await pool.query(sql, [customerId, sessionId, JSON.stringify(items)]);
    return rows[0];
  },

  /**
   * Update cart items
   */
  async updateCartItems(cartId, items) {
    const sql = `
      UPDATE customer_cart
      SET items = $1::jsonb, updated_at = NOW()
      WHERE id = $2
      RETURNING id, customer_account_id, session_id, items, promo_code, 
                promo_discount, updated_at
    `;
    const { rows } = await pool.query(sql, [JSON.stringify(items), cartId]);
    return rows[0];
  },

  /**
   * Update cart (can update customerId, sessionId, or items)
   */
  async updateCart(cartId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.customerId !== undefined) {
      fields.push(`customer_account_id = $${paramIndex++}`);
      values.push(updates.customerId);
    }
    if (updates.sessionId !== undefined) {
      fields.push(`session_id = $${paramIndex++}`);
      values.push(updates.sessionId);
    }
    if (updates.items !== undefined) {
      fields.push(`items = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(updates.items));
    }

    if (fields.length === 0) return null;

    fields.push('updated_at = NOW()');
    values.push(cartId);

    const sql = `
      UPDATE customer_cart
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, customer_account_id, session_id, items, promo_code, 
                promo_discount, updated_at
    `;
    const { rows } = await pool.query(sql, values);
    return rows[0];
  },

  /**
   * Apply promo code to cart
   */
  async applyPromoCode(cartId, promoCode, discount) {
    const sql = `
      UPDATE customer_cart
      SET promo_code = $1, promo_discount = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, promo_code, promo_discount
    `;
    const { rows } = await pool.query(sql, [promoCode, discount, cartId]);
    return rows[0];
  },

  /**
   * Clear promo code from cart
   */
  async clearPromoCode(cartId) {
    const sql = `
      UPDATE customer_cart
      SET promo_code = NULL, promo_discount = 0, updated_at = NOW()
      WHERE id = $1
      RETURNING id, promo_code, promo_discount
    `;
    const { rows } = await pool.query(sql, [cartId]);
    return rows[0];
  },

  /**
   * Delete cart
   */
  async deleteCart(cartId) {
    const sql = `DELETE FROM customer_cart WHERE id = $1`;
    await pool.query(sql, [cartId]);
  },

  /**
   * Clean expired carts
   */
  async cleanExpiredCarts() {
    const sql = `DELETE FROM customer_cart WHERE expires_at < NOW()`;
    const { rowCount } = await pool.query(sql);
    return rowCount;
  },

  // ==================== ORDERS ====================

  /**
   * Get customer orders
   */
  async getCustomerOrders(customerId, { limit = 20, offset = 0 } = {}) {
    const sql = `
      SELECT * FROM v_customer_orders
      WHERE customer_account_id = $1
      ORDER BY opened_at DESC
      LIMIT $2 OFFSET $3
    `;
    const { rows } = await pool.query(sql, [customerId, limit, offset]);
    return rows;
  },

  /**
   * Get order detail
   */
  async getOrderDetail(orderId, customerId) {
    const sql = `
      SELECT * FROM v_customer_orders
      WHERE id = $1 AND customer_account_id = $2
    `;
    const { rows } = await pool.query(sql, [orderId, customerId]);
    return rows[0];
  },

  /**
   * Get order items
   */
  async getOrderItems(orderId) {
    const sql = `
      SELECT 
        d.id,
        d.mon_id,
        m.ten AS ten_mon,
        d.bien_the_id,
        mbt.ten_bien_the,
        d.so_luong,
        d.don_gia,
        d.giam_gia,
        d.ghi_chu,
        (d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0)) AS line_total
      FROM don_hang_chi_tiet d
      LEFT JOIN mon m ON m.id = d.mon_id
      LEFT JOIN mon_bien_the mbt ON mbt.id = d.bien_the_id
      WHERE d.don_hang_id = $1
      ORDER BY d.id
    `;
    const { rows } = await pool.query(sql, [orderId]);
    
    // Get toppings and options for each item
    for (const item of rows) {
      const optionsSql = `
        SELECT 
          dto.id,
          dto.tuy_chon_id,
          tc.ten AS ten_tuy_chon,
          tc.loai AS loai_tuy_chon,
          tcm.ten AS ten_muc,
          dto.so_luong,
          COALESCE(tcm.gia_tri, 0) AS gia_them
        FROM don_hang_chi_tiet_tuy_chon dto
        LEFT JOIN tuy_chon_mon tc ON tc.id = dto.tuy_chon_id
        LEFT JOIN tuy_chon_muc tcm ON tcm.id = dto.muc_id
        WHERE dto.line_id = $1
        ORDER BY tc.loai, tc.ten
      `;
      const { rows: options } = await pool.query(optionsSql, [item.id]);
      
      // Separate options and toppings
      // PERCENT = Độ ngọt, Mức đá (options)
      // TOPPING = Topping thêm
      item.options = options.filter(o => o.loai_tuy_chon === 'PERCENT').map(o => ({
        ...o,
        ten_tuy_chon: o.ten_muc ? `${o.ten_tuy_chon}: ${o.ten_muc}` : o.ten_tuy_chon
      }));
      item.toppings = options.filter(o => o.loai_tuy_chon === 'TOPPING');
    }
    
    return rows;
  },

  // ==================== RESERVATIONS ====================

  /**
   * Get customer reservations
   */
  async getCustomerReservations(customerId, { limit = 20, offset = 0 } = {}) {
    const sql = `
      SELECT * FROM v_customer_reservations
      WHERE customer_account_id = $1
      ORDER BY start_at DESC
      LIMIT $2 OFFSET $3
    `;
    const { rows } = await pool.query(sql, [customerId, limit, offset]);
    return rows;
  },

  /**
   * Get reservation detail
   */
  async getReservationDetail(reservationId, customerId) {
    const sql = `
      SELECT * FROM v_customer_reservations
      WHERE id = $1 AND customer_account_id = $2
    `;
    const { rows } = await pool.query(sql, [reservationId, customerId]);
    return rows[0];
  },

  // ==================== PUBLIC MENU ====================

  /**
   * Get active categories
   */
  async getActiveCategories() {
    try {
      console.log('📋 Repository: Querying categories...');
      const sql = `
        SELECT id, ten, mo_ta, thu_tu
        FROM loai_mon
        WHERE active = TRUE
        ORDER BY thu_tu, id
      `;
      const { rows } = await pool.query(sql);
      console.log('✅ Repository: Found', rows.length, 'categories');
      return rows;
    } catch (error) {
      console.error('❌ Repository: Error querying categories:', error);
      throw error;
    }
  },

  /**
   * Get menu items by category
   */
  async getMenuItems(categoryId = null) {
    let sql = `
      SELECT 
        m.id,
        m.ten,
        m.mo_ta,
        m.loai_id AS loai_mon_id,
        l.ten AS loai_ten,
        m.hinh_anh AS hinh_anh_url,
        m.active,
        m.thu_tu,
        COALESCE(
          (
            SELECT MIN(gia)
            FROM mon_bien_the
            WHERE mon_id = m.id AND active = TRUE
          ),
          m.gia_mac_dinh,
          0
        ) AS gia_tu
      FROM mon m
      LEFT JOIN loai_mon l ON l.id = m.loai_id
      WHERE m.active = TRUE
    `;

    const params = [];
    if (categoryId) {
      sql += ` AND m.loai_id = $1`;
      params.push(categoryId);
    }

    sql += ` ORDER BY m.thu_tu, m.id`;

    const { rows } = await pool.query(sql, params);
    return rows;
  },

  /**
   * Get item detail
   */
  async getItemDetail(itemId) {
    const sql = `
      SELECT 
        m.id,
        m.ten,
        m.mo_ta,
        m.loai_id AS loai_mon_id,
        l.ten AS loai_ten,
        m.hinh_anh AS hinh_anh_url,
        m.gia_mac_dinh,
        m.active
      FROM mon m
      LEFT JOIN loai_mon l ON l.id = m.loai_id
      WHERE m.id = $1 AND m.active = TRUE
    `;
    const { rows } = await pool.query(sql, [itemId]);
    return rows[0];
  },

  /**
   * Get item variants
   */
  async getItemVariants(itemId) {
    const sql = `
      SELECT id, mon_id, ten_bien_the, gia, active, thu_tu
      FROM mon_bien_the
      WHERE mon_id = $1 AND active = TRUE
      ORDER BY thu_tu, id
    `;
    const { rows } = await pool.query(sql, [itemId]);
    return rows;
  },

  /**
   * Get variant by ID
   */
  async getVariantById(variantId) {
    const sql = `
      SELECT id, mon_id, ten_bien_the, gia, active, thu_tu
      FROM mon_bien_the
      WHERE id = $1 AND active = TRUE
    `;
    const { rows } = await pool.query(sql, [variantId]);
    return rows[0] || null;
  },

  /**
   * Get item default price (gia_mac_dinh)
   */
  async getItemDefaultPrice(itemId) {
    const sql = `
      SELECT gia_mac_dinh
      FROM mon
      WHERE id = $1 AND active = TRUE
    `;
    const { rows } = await pool.query(sql, [itemId]);
    return rows[0]?.gia_mac_dinh || null;
  },

  /**
   * Get item options
   */
  async getItemOptions(itemId) {
    const sql = `
      SELECT 
        tc.id,
        tc.ten,
        tc.ma,
        tc.loai,
        tc.don_vi,
        tc.gia_mac_dinh,
        COALESCE(
          json_agg(
            json_build_object(
              'id', tcm.id,
              'ten', tcm.ten,
              'he_so', tcm.gia_tri,
              'thu_tu', tcm.thu_tu
            ) ORDER BY tcm.thu_tu
          ) FILTER (WHERE tcm.id IS NOT NULL),
          '[]'
        ) AS muc_tuy_chon
      FROM tuy_chon_mon tc
      JOIN mon_tuy_chon_ap_dung mtcad ON mtcad.tuy_chon_id = tc.id
      LEFT JOIN tuy_chon_muc tcm ON tcm.tuy_chon_id = tc.id
      WHERE mtcad.mon_id = $1
      GROUP BY tc.id, tc.ten, tc.ma, tc.loai, tc.don_vi, tc.gia_mac_dinh
      ORDER BY tc.id
    `;
    const { rows } = await pool.query(sql, [itemId]);
    return rows;
  },

  /**
   * Get item toppings (AMOUNT type options)
   */
  async getItemToppings(itemId, variantId = null) {
    const sql = `
      SELECT
        tc.id AS tuy_chon_id,
        tc.ma,
        tc.ten,
        tc.don_vi,
        tc.gia_mac_dinh,
        COALESCE(
          (SELECT gia FROM tuy_chon_gia g 
           WHERE g.tuy_chon_id=tc.id AND g.mon_bien_the_id=$2 LIMIT 1),
          (SELECT gia FROM tuy_chon_gia g 
           WHERE g.tuy_chon_id=tc.id AND g.mon_id=$1 AND g.mon_bien_the_id IS NULL LIMIT 1),
          tc.gia_mac_dinh
        ) AS gia_moi_don_vi
      FROM mon_tuy_chon_ap_dung m
      JOIN tuy_chon_mon tc ON tc.id=m.tuy_chon_id
      WHERE m.mon_id=$1 AND tc.loai='AMOUNT'
      ORDER BY tc.ma
    `;
    const { rows } = await pool.query(sql, [itemId, variantId]);
    return rows;
  },

  /**
   * Search menu items
   */
  async searchItems(keyword) {
    const sql = `
      SELECT 
        m.id,
        m.ten,
        m.mo_ta,
        m.loai_id AS loai_mon_id,
        l.ten AS loai_ten,
        m.hinh_anh AS hinh_anh_url,
        COALESCE(
          (
            SELECT MIN(gia)
            FROM mon_bien_the
            WHERE mon_id = m.id AND active = TRUE
          ),
          m.gia_mac_dinh,
          0
        ) AS gia_tu
      FROM mon m
      LEFT JOIN loai_mon l ON l.id = m.loai_id
      WHERE m.active = TRUE
        AND (
          m.ten ILIKE $1
          OR m.mo_ta ILIKE $1
          OR l.ten ILIKE $1
        )
      ORDER BY m.thu_tu, m.id
      LIMIT 50
    `;
    const { rows } = await pool.query(sql, [`%${keyword}%`]);
    return rows;
  },

  /**
   * Get available tables (TRONG status, not deleted)
   */
  async getAvailableTables({ areaId = null, minCapacity = null } = {}) {
    const params = [];
    const conditions = [
      'b.trang_thai = \'TRONG\'',
      '(b.is_deleted = false OR b.is_deleted IS NULL)',
      '(kv.active = true OR kv.active IS NULL)'
    ];

    if (areaId) {
      params.push(areaId);
      conditions.push(`b.khu_vuc_id = $${params.length}`);
    }

    if (minCapacity) {
      params.push(minCapacity);
      conditions.push(`b.suc_chua >= $${params.length}`);
    }

    const sql = `
      SELECT 
        b.id,
        b.ten_ban,
        b.khu_vuc_id,
        kv.ten AS khu_vuc_ten,
        b.suc_chua,
        b.trang_thai,
        b.ghi_chu
      FROM ban b
      LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY kv.thu_tu, kv.ten, b.ten_ban
    `;
    const { rows } = await pool.query(sql, params);
    return rows;
  },

  // ==================== ORDERS ====================

  /**
   * Upsert customer (find or create) from guest info
   * Sử dụng bảng khach_hang cho khách vãng lai (không cần password)
   */
  async upsertCustomer({ fullName, phone, email }) {
    // Try to find existing customer by phone in khach_hang table
    const findSql = `SELECT id, ten as full_name, so_dien_thoai as phone, email FROM khach_hang WHERE so_dien_thoai = $1`;
    const { rows: existing } = await pool.query(findSql, [phone]);
    
    if (existing.length > 0) {
      // Update info if provided
      if (fullName || email) {
        const updateSql = `
          UPDATE khach_hang
          SET 
            ten = COALESCE($1, ten),
            email = COALESCE($2, email),
            updated_at = NOW()
          WHERE id = $3
          RETURNING id, ten as full_name, so_dien_thoai as phone, email
        `;
        const { rows } = await pool.query(updateSql, [fullName || null, email || null, existing[0].id]);
        return rows[0];
      }
      return existing[0];
    }

    // Create new guest customer in khach_hang table (không cần password)
    const insertSql = `
      INSERT INTO khach_hang (ten, so_dien_thoai, email)
      VALUES ($1, $2, $3)
      RETURNING id, ten as full_name, so_dien_thoai as phone, email
    `;
    const { rows } = await pool.query(insertSql, [fullName, phone, email || null]);
    return rows[0];
  },

  /**
   * Create order from cart (for customer portal)
   * - customerId: ID từ customer_accounts (nếu đã đăng nhập)
   * - customerInfo: Thông tin khách vãng lai (nếu chưa đăng nhập)
   */
  async createOrderFromCart({ customerId, orderType, customerInfo }) {
    // Xác định loại khách hàng
    let customerAccountId = null;
    let khachHangId = null;
    
    if (customerId) {
      // Registered customer - dùng customer_account_id
      customerAccountId = customerId;
    } else if (customerInfo) {
      // Guest customer - tạo/tìm trong bảng khach_hang
      const customer = await this.upsertCustomer({
        fullName: customerInfo.fullName,
        phone: customerInfo.phone,
        email: customerInfo.email
      });
      khachHangId = customer.id;
    }

    // Tự động gán vào ca CASHIER đang mở (nếu có) để thu ngân thấy được đơn hàng
    let caLamId = null;
    try {
      const { getOpenCashierShift } = await import('../repositories/shiftsRepository.js');
      const openShift = await getOpenCashierShift();
      if (openShift && openShift.id) {
        caLamId = openShift.id;
      }
    } catch (error) {
      console.error('Error getting open cashier shift:', error);
      // Nếu không lấy được ca, vẫn tạo đơn với ca_lam_id = NULL
      // Đơn sẽ được tự động gán vào ca khi mở ca mới
    }

    // Create order - tự động gán vào ca đang mở (nếu có)
    // QUAN TRỌNG: Set order_source = 'ONLINE' để đơn hàng xuất hiện trong v_customer_orders
    // - customer_account_id: cho khách đã đăng ký (registered customer)
    // - khach_hang_id: cho khách vãng lai (guest customer)
    const sql = `
      INSERT INTO don_hang (ban_id, nhan_vien_id, ca_lam_id, trang_thai, order_type, order_source, customer_account_id, khach_hang_id)
      VALUES (NULL, NULL, $1, 'OPEN', $2, 'ONLINE', $3, $4)
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [caLamId, orderType, customerAccountId, khachHangId]);
    return rows[0];
  },

  /**
   * Add item to order (from cart item)
   */
  async addItemToOrder({ orderId, monId, bienTheId, soLuong, donGia, giamGia = 0, ghiChu = null, cups = null }) {
    // Get item info for snapshot
    const { rows: monRows } = await pool.query(
      `SELECT ten, gia_mac_dinh FROM mon WHERE id = $1`,
      [monId]
    );
    const mon = monRows[0];

    // Calculate price if not provided (fallback to database)
    let price = donGia;
    if (price == null || price === 0) {
      if (bienTheId) {
        const { rows: variantRows } = await pool.query(
          `SELECT gia FROM mon_bien_the WHERE id = $1`,
          [bienTheId]
        );
        price = variantRows[0]?.gia ?? 0;
      } else {
        price = mon?.gia_mac_dinh ?? 0;
      }
    }

    // Validate price
    if (!price || price <= 0) {
      throw new Error(`Không thể lấy giá cho món ID ${monId}${bienTheId ? `, biến thể ID ${bienTheId}` : ''}`);
    }

    // If cups provided (for options/toppings), insert multiple lines
    if (cups && Array.isArray(cups) && cups.length > 0) {
      const lines = [];
      for (const cup of cups) {
        const lineSql = `
          INSERT INTO don_hang_chi_tiet (
            don_hang_id, mon_id, bien_the_id, so_luong, don_gia, giam_gia, 
            ghi_chu, ten_mon_snapshot, gia_niem_yet_snapshot, 
            trang_thai_che_bien, tuy_chon, created_at
          )
          VALUES ($1, $2, $3, 1, $4, $5, $6, $7, $8, 'QUEUED', $9::jsonb, NOW())
          RETURNING *
        `;
        const { rows } = await pool.query(lineSql, [
          orderId, monId, bienTheId, price, giamGia, ghiChu, 
          mon?.ten, mon?.gia_mac_dinh, JSON.stringify(cup.tuy_chon || {})
        ]);
        lines.push(rows[0]);
      }
      return lines;
    }

    // Single line item
    const sql = `
      INSERT INTO don_hang_chi_tiet (
        don_hang_id, mon_id, bien_the_id, so_luong, don_gia, giam_gia, 
        ghi_chu, ten_mon_snapshot, gia_niem_yet_snapshot, trang_thai_che_bien, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'QUEUED', NOW())
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [
      orderId, monId, bienTheId, soLuong, price, giamGia, ghiChu, 
      mon?.ten, mon?.gia_mac_dinh
    ]);
    return rows[0];
  },

  /**
   * Add option/topping to order line item
   */
  async addOrderItemOption({ lineId, tuyChonId, mucId, soLuong = 1 }) {
    const sql = `
      INSERT INTO don_hang_chi_tiet_tuy_chon (line_id, tuy_chon_id, muc_id, he_so, so_luong, created_at)
      VALUES ($1, $2, $3, 1, $4, NOW())
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [lineId, tuyChonId, mucId, soLuong]);
    return rows[0];
  },

  /**
   * Save delivery info for order
   */
  async saveDeliveryInfo(orderId, deliveryInfo) {
    const sql = `
      INSERT INTO don_hang_delivery_info (
        order_id, delivery_address, delivery_phone, delivery_notes,
        delivery_fee, estimated_time, latitude, longitude, distance_km
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (order_id) 
      DO UPDATE SET
        delivery_address = EXCLUDED.delivery_address,
        delivery_phone = EXCLUDED.delivery_phone,
        delivery_notes = EXCLUDED.delivery_notes,
        delivery_fee = EXCLUDED.delivery_fee,
        estimated_time = EXCLUDED.estimated_time,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        distance_km = EXCLUDED.distance_km,
        updated_at = NOW()
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [
      orderId,
      deliveryInfo.deliveryAddress,
      deliveryInfo.deliveryPhone || null,
      deliveryInfo.deliveryNotes || null,
      deliveryInfo.deliveryFee || 0,
      deliveryInfo.deliveryTime ? new Date(deliveryInfo.deliveryTime) : null,
      deliveryInfo.latitude || null,
      deliveryInfo.longitude || null,
      deliveryInfo.distance || null
    ]);
    return rows[0];
  },

  /**
   * Clear cart
   */
  async clearCart(cartId) {
    const sql = `
      UPDATE customer_cart
      SET items = '[]'::jsonb, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;
    const { rows } = await pool.query(sql, [cartId]);
    return rows[0];
  }
};

