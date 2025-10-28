/**
 * Repository: Inventory Management
 * - Check nguyên liệu
 * - Cảnh báo tồn kho
 * - Báo cáo xuất nhập tồn
 */

import { pool } from '../db.js';

const query = (text, params) => pool.query(text, params);

export const inventoryRepository = {
  /**
   * Check đủ nguyên liệu để làm món
   */
  async checkIngredients({ monId, bienTheId, soLuong, tuyChonIds = null }) {
    const sql = `
      SELECT * FROM check_nguyen_lieu_du($1, $2, $3, $4)
    `;
    
    const { rows } = await query(sql, [
      monId,
      bienTheId,
      soLuong,
      tuyChonIds
    ]);
    
    return rows;
  },

  /**
   * Tính giá vốn động
   */
  async calculateDynamicCost({ monId, bienTheId, tuyChonIds = null }) {
    const sql = `
      SELECT tinh_gia_von_dong($1, $2, $3) as gia_von
    `;
    
    const { rows } = await query(sql, [
      monId,
      bienTheId,
      tuyChonIds
    ]);
    
    return parseFloat(rows[0]?.gia_von || 0);
  },

  /**
   * Lấy cảnh báo tồn kho
   */
  async getWarnings() {
    const sql = `
      SELECT 
        id,
        ma,
        ten,
        ton_kho,
        don_vi,
        gia_nhap_moi_nhat,
        gia_tri_ton_kho,
        uoc_tinh_so_ly_lam_duoc,
        trang_thai
      FROM v_nguyen_lieu_canh_bao_v2
      ORDER BY 
        CASE 
          WHEN trang_thai = 'HET_HANG' THEN 0
          WHEN trang_thai = 'SAP_HET' THEN 1
          ELSE 2
        END,
        ten
    `;
    
    const { rows } = await query(sql);
    return rows;
  },

  /**
   * Lấy lịch sử xuất kho
   */
  async getExportHistory({ donHangId = null, fromDate = null, toDate = null, limit = 100 }) {
    let sql = `
      SELECT 
        xk.id,
        xk.nguyen_lieu_id,
        nl.ten as nguyen_lieu,
        nl.ma,
        xk.so_luong,
        nl.don_vi,
        xk.don_hang_id,
        xk.ngay_xuat,
        xk.ghi_chu,
        (xk.so_luong * nl.gia_nhap_moi_nhat) as gia_tri
      FROM xuat_kho xk
      JOIN nguyen_lieu nl ON nl.id = xk.nguyen_lieu_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (donHangId) {
      sql += ` AND xk.don_hang_id = $${paramIndex}`;
      params.push(donHangId);
      paramIndex++;
    }
    
    if (fromDate) {
      sql += ` AND xk.ngay_xuat >= $${paramIndex}`;
      params.push(fromDate);
      paramIndex++;
    }
    
    if (toDate) {
      sql += ` AND xk.ngay_xuat <= $${paramIndex}`;
      params.push(toDate);
      paramIndex++;
    }
    
    sql += ` ORDER BY xk.ngay_xuat DESC LIMIT $${paramIndex}`;
    params.push(limit);
    
    const { rows } = await query(sql, params);
    return rows;
  },

  /**
   * Lấy lịch sử nhập kho
   */
  async getImportHistory({ fromDate = null, toDate = null, limit = 100 }) {
    let sql = `
      SELECT 
        nk.id,
        nk.nguyen_lieu_id,
        nl.ten as nguyen_lieu,
        nl.ma,
        nk.so_luong,
        nl.don_vi,
        nk.don_gia,
        (nk.so_luong * nk.don_gia) as thanh_tien,
        nk.nha_cung_cap,
        nk.ngay_nhap,
        nk.ghi_chu
      FROM nhap_kho nk
      JOIN nguyen_lieu nl ON nl.id = nk.nguyen_lieu_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (fromDate) {
      sql += ` AND nk.ngay_nhap >= $${paramIndex}`;
      params.push(fromDate);
      paramIndex++;
    }
    
    if (toDate) {
      sql += ` AND nk.ngay_nhap <= $${paramIndex}`;
      params.push(toDate);
      paramIndex++;
    }
    
    sql += ` ORDER BY nk.ngay_nhap DESC LIMIT $${paramIndex}`;
    params.push(limit);
    
    const { rows } = await query(sql, params);
    return rows;
  },

  /**
   * Báo cáo tổng hợp xuất nhập tồn
   */
  async getInventoryReport({ fromDate, toDate }) {
    const sql = `
      WITH nhap AS (
        SELECT 
          nguyen_lieu_id,
          SUM(so_luong * don_gia) as tong_nhap
        FROM nhap_kho
        WHERE ngay_nhap >= $1 AND ngay_nhap <= $2
        GROUP BY nguyen_lieu_id
      ),
      xuat AS (
        SELECT 
          xk.nguyen_lieu_id,
          SUM(xk.so_luong * nl.gia_nhap_moi_nhat) as tong_xuat
        FROM xuat_kho xk
        JOIN nguyen_lieu nl ON nl.id = xk.nguyen_lieu_id
        WHERE xk.ngay_xuat >= $1 AND xk.ngay_xuat <= $2
        GROUP BY xk.nguyen_lieu_id
      )
      SELECT 
        nl.id,
        nl.ma,
        nl.ten,
        nl.don_vi,
        nl.ton_kho,
        nl.gia_nhap_moi_nhat,
        (nl.ton_kho * nl.gia_nhap_moi_nhat) as gia_tri_ton,
        COALESCE(nhap.tong_nhap, 0) as tong_nhap,
        COALESCE(xuat.tong_xuat, 0) as tong_xuat
      FROM nguyen_lieu nl
      LEFT JOIN nhap ON nhap.nguyen_lieu_id = nl.id
      LEFT JOIN xuat ON xuat.nguyen_lieu_id = nl.id
      WHERE nl.active = TRUE
      ORDER BY nl.ten
    `;
    
    const { rows } = await query(sql, [fromDate, toDate]);
    
    // Tính tổng
    const summary = rows.reduce((acc, row) => {
      acc.tong_gia_tri_ton += parseFloat(row.gia_tri_ton || 0);
      acc.tong_nhap += parseFloat(row.tong_nhap || 0);
      acc.tong_xuat += parseFloat(row.tong_xuat || 0);
      return acc;
    }, { tong_gia_tri_ton: 0, tong_nhap: 0, tong_xuat: 0 });
    
    return {
      summary,
      details: rows
    };
  },

  /**
   * Lấy thông tin nguyên liệu
   */
  async getIngredientById(id) {
    const sql = `
      SELECT 
        id,
        ma,
        ten,
        ton_kho,
        don_vi,
        gia_nhap_moi_nhat,
        (ton_kho * gia_nhap_moi_nhat) as gia_tri_ton_kho,
        active
      FROM nguyen_lieu
      WHERE id = $1
    `;
    
    const { rows } = await query(sql, [id]);
    return rows[0] || null;
  },

  /**
   * Lấy danh sách tất cả nguyên liệu
   */
  async getAllIngredients() {
    const sql = `
      SELECT 
        id,
        ma,
        ten,
        ton_kho,
        don_vi,
        gia_nhap_moi_nhat,
        (ton_kho * gia_nhap_moi_nhat) as gia_tri_ton_kho,
        active
      FROM nguyen_lieu
      WHERE active = TRUE
      ORDER BY ten
    `;
    
    const { rows } = await query(sql);
    return rows;
  },

  /**
   * Tạo phiếu nhập kho mới
   */
  async createImport({ nguyenLieuId, soLuong, donGia, nhaCungCap, ghiChu, nguoiNhapId = null }) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert vào bảng nhap_kho (không insert thanh_tien - để DB tự tính)
      const insertSql = `
        INSERT INTO nhap_kho (
          nguyen_lieu_id,
          so_luong,
          don_gia,
          nha_cung_cap,
          ghi_chu,
          nguoi_nhap_id,
          ngay_nhap
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `;
      
      const { rows } = await client.query(insertSql, [
        nguyenLieuId,
        soLuong,
        donGia,
        nhaCungCap,
        ghiChu,
        nguoiNhapId
      ]);
      
      // Cập nhật tồn kho và giá nhập
      const updateSql = `
        UPDATE nguyen_lieu
        SET 
          ton_kho = ton_kho + $1,
          gia_nhap_moi_nhat = $2
        WHERE id = $3
      `;
      
      await client.query(updateSql, [soLuong, donGia, nguyenLieuId]);
      
      await client.query('COMMIT');
      
      return rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

