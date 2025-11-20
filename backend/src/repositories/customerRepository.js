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
        (
          SELECT MIN(gia)
          FROM mon_bien_the
          WHERE mon_id = m.id AND active = TRUE
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
        (
          SELECT MIN(gia)
          FROM mon_bien_the
          WHERE mon_id = m.id AND active = TRUE
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
   */
  async upsertCustomer({ fullName, phone, email }) {
    // Try to find existing customer by phone
    let customer = await this.findByPhone(phone);
    
    if (customer) {
      // Update info if provided
      if (fullName || email) {
        const updateSql = `
          UPDATE customer_accounts
          SET 
            full_name = COALESCE($1, full_name),
            email = COALESCE($2, email),
            updated_at = NOW()
          WHERE id = $3
          RETURNING id, phone, email, full_name
        `;
        const { rows } = await pool.query(updateSql, [fullName || null, email || null, customer.id]);
        return rows[0];
      }
      return customer;
    }

    // Create new customer account (without password for guest)
    const insertSql = `
      INSERT INTO customer_accounts (phone, email, full_name, is_active)
      VALUES ($1, $2, $3, true)
      RETURNING id, phone, email, full_name
    `;
    const { rows } = await pool.query(insertSql, [phone, email || null, fullName]);
    return rows[0];
  },

  /**
   * Create order from cart (for customer portal)
   */
  async createOrderFromCart({ customerId, orderType, customerInfo }) {
    // Get or create customer
    let khachHangId = customerId;
    if (!khachHangId && customerInfo) {
      const customer = await this.upsertCustomer({
        fullName: customerInfo.fullName,
        phone: customerInfo.phone,
        email: customerInfo.email
      });
      khachHangId = customer.id;
    }

    // Create order (nhan_vien_id and ca_lam_id can be NULL for customer orders)
    const sql = `
      INSERT INTO don_hang (ban_id, nhan_vien_id, ca_lam_id, trang_thai, order_type, khach_hang_id)
      VALUES (NULL, NULL, NULL, 'OPEN', $1, $2)
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [orderType, khachHangId || null]);
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
          orderId, monId, bienTheId, donGia, giamGia, ghiChu, 
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
      orderId, monId, bienTheId, soLuong, donGia, giamGia, ghiChu, 
      mon?.ten, mon?.gia_mac_dinh
    ]);
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

