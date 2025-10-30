/**
 * =====================================================================
 * BATCH INVENTORY REPOSITORY
 * =====================================================================
 * 
 * Quản lý lô hàng (batch) với FEFO logic
 * 
 */

import { pool } from '../db.js';

const query = (text, params) => pool.query(text, params);

export const batchInventoryRepository = {
  /**
   * Tạo batch mới khi nhập kho
   */
  async createBatch({
    nguyenLieuId,
    soLuongNhap,
    donGia,
    ngayNhap = null,
    ngaySanXuat = null,
    ngayHetHan = null,
    nhaCungCap = null,
    soLoNhaCungCap = null,
    ghiChu = null,
    nguoiNhapId = null
  }) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Generate batch code
      const { rows: [{ generate_batch_code: batchCode }] } = await client.query(
        'SELECT generate_batch_code($1) as generate_batch_code',
        [nguyenLieuId]
      );
      
      // 2. Lấy đơn vị từ nguyên liệu
      const { rows: [nguyenLieu] } = await client.query(
        'SELECT don_vi FROM nguyen_lieu WHERE id = $1',
        [nguyenLieuId]
      );
      
      if (!nguyenLieu) {
        throw new Error(`Không tìm thấy nguyên liệu ID ${nguyenLieuId}`);
      }
      
      // 3. Insert batch
      const insertSql = `
        INSERT INTO batch_inventory (
          batch_code,
          nguyen_lieu_id,
          so_luong_nhap,
          so_luong_ton,
          don_vi,
          don_gia,
          ngay_nhap,
          ngay_san_xuat,
          ngay_het_han,
          nha_cung_cap,
          so_lo_nha_cung_cap,
          ghi_chu,
          nguoi_nhap_id,
          trang_thai
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      
      const { rows: [batch] } = await client.query(insertSql, [
        batchCode,
        nguyenLieuId,
        soLuongNhap,
        soLuongNhap, // so_luong_ton = so_luong_nhap ban đầu
        nguyenLieu.don_vi,
        donGia,
        ngayNhap || new Date(),
        ngaySanXuat,
        ngayHetHan,
        nhaCungCap,
        soLoNhaCungCap,
        ghiChu,
        nguoiNhapId,
        'ACTIVE'
      ]);
      
      await client.query('COMMIT');
      
      return batch;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Lấy danh sách batch theo FEFO
   */
  async getBatchesForFEFO(nguyenLieuId, soLuongCan) {
    const sql = `
      SELECT * FROM get_batches_fefo($1, $2)
    `;
    
    const { rows } = await query(sql, [nguyenLieuId, soLuongCan]);
    return rows;
  },

  /**
   * Xuất kho từ batch (giảm tồn kho)
   */
  async exportFromBatch(batchId, soLuongXuat) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Kiểm tra batch
      const { rows: [batch] } = await client.query(
        'SELECT * FROM batch_inventory WHERE id = $1 FOR UPDATE',
        [batchId]
      );
      
      if (!batch) {
        throw new Error(`Không tìm thấy batch ID ${batchId}`);
      }
      
      if (batch.trang_thai !== 'ACTIVE') {
        throw new Error(`Batch ${batch.batch_code} không ở trạng thái ACTIVE`);
      }
      
      if (parseFloat(batch.so_luong_ton) < parseFloat(soLuongXuat)) {
        throw new Error(
          `Batch ${batch.batch_code} không đủ tồn kho. ` +
          `Còn: ${batch.so_luong_ton}, Cần: ${soLuongXuat}`
        );
      }
      
      // 2. Giảm tồn kho
      const newSoLuongTon = parseFloat(batch.so_luong_ton) - parseFloat(soLuongXuat);
      const newTrangThai = newSoLuongTon === 0 ? 'DEPLETED' : 'ACTIVE';
      
      await client.query(
        `UPDATE batch_inventory 
         SET so_luong_ton = $1, 
             trang_thai = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [newSoLuongTon, newTrangThai, batchId]
      );
      
      await client.query('COMMIT');
      
      return {
        batchId,
        batchCode: batch.batch_code,
        soLuongXuat,
        soLuongTonMoi: newSoLuongTon,
        trangThaiMoi: newTrangThai
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Lấy danh sách batch của một nguyên liệu
   */
  async getBatchesByIngredient(nguyenLieuId, includeEmpty = false) {
    let sql = `
      SELECT 
        bi.*,
        nl.ten as nguyen_lieu_ten,
        nl.ma as nguyen_lieu_ma,
        u.full_name as nguoi_nhap_ten,
        CASE 
          WHEN bi.ngay_het_han IS NULL THEN NULL
          ELSE (bi.ngay_het_han - CURRENT_DATE)
        END as ngay_con_lai
      FROM batch_inventory bi
      JOIN nguyen_lieu nl ON nl.id = bi.nguyen_lieu_id
      LEFT JOIN users u ON u.user_id = bi.nguoi_nhap_id
      WHERE bi.nguyen_lieu_id = $1
    `;
    
    if (!includeEmpty) {
      sql += ` AND bi.so_luong_ton > 0`;
    }
    
    sql += ` ORDER BY 
      CASE WHEN bi.ngay_het_han IS NULL THEN 1 ELSE 0 END,
      bi.ngay_het_han ASC NULLS LAST,
      bi.ngay_nhap ASC
    `;
    
    const { rows } = await query(sql, [nguyenLieuId]);
    return rows;
  },

  /**
   * Lấy danh sách batch sắp hết hạn
   */
  async getExpiringBatches(daysThreshold = 30) {
    const sql = `
      SELECT
        bi.id as batch_id,
        bi.batch_code,
        bi.nguyen_lieu_id,
        nl.ten as nguyen_lieu_ten,
        bi.so_luong_ton,
        bi.ngay_het_han,
        (bi.ngay_het_han - CURRENT_DATE) AS ngay_con_lai
      FROM batch_inventory bi
      JOIN nguyen_lieu nl ON nl.id = bi.nguyen_lieu_id
      WHERE bi.trang_thai = 'ACTIVE'
        AND bi.so_luong_ton > 0
        AND bi.ngay_het_han IS NOT NULL
        AND bi.ngay_het_han <= CURRENT_DATE + ($1 || ' days')::INTERVAL
      ORDER BY bi.ngay_het_han ASC
    `;

    const { rows } = await query(sql, [daysThreshold]);
    return rows;
  },

  /**
   * Lấy chi tiết batch
   */
  async getBatchById(batchId) {
    const sql = `
      SELECT 
        bi.*,
        nl.ten as nguyen_lieu_ten,
        nl.ma as nguyen_lieu_ma,
        u.full_name as nguoi_nhap_ten,
        CASE 
          WHEN bi.ngay_het_han IS NULL THEN NULL
          ELSE (bi.ngay_het_han - CURRENT_DATE)
        END as ngay_con_lai
      FROM batch_inventory bi
      JOIN nguyen_lieu nl ON nl.id = bi.nguyen_lieu_id
      LEFT JOIN users u ON u.user_id = bi.nguoi_nhap_id
      WHERE bi.id = $1
    `;
    
    const { rows } = await query(sql, [batchId]);
    return rows[0] || null;
  },

  /**
   * Cập nhật trạng thái batch
   */
  async updateBatchStatus(batchId, trangThai, lyDoBlock = null) {
    const sql = `
      UPDATE batch_inventory
      SET trang_thai = $1,
          ly_do_block = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const { rows } = await query(sql, [trangThai, lyDoBlock, batchId]);
    return rows[0] || null;
  },

  /**
   * Lấy tổng quan tồn kho theo batch
   */
  async getBatchSummary() {
    const sql = `
      SELECT 
        COUNT(*) as tong_batch,
        COUNT(*) FILTER (WHERE trang_thai = 'ACTIVE') as batch_active,
        COUNT(*) FILTER (WHERE trang_thai = 'EXPIRED') as batch_expired,
        COUNT(*) FILTER (WHERE trang_thai = 'DEPLETED') as batch_depleted,
        COUNT(*) FILTER (WHERE trang_thai = 'BLOCKED') as batch_blocked,
        SUM(gia_tri_ton) FILTER (WHERE trang_thai = 'ACTIVE') as tong_gia_tri_ton,
        COUNT(*) FILTER (
          WHERE trang_thai = 'ACTIVE' 
          AND ngay_het_han IS NOT NULL 
          AND ngay_het_han <= CURRENT_DATE + INTERVAL '7 days'
        ) as batch_het_han_7_ngay,
        COUNT(*) FILTER (
          WHERE trang_thai = 'ACTIVE' 
          AND ngay_het_han IS NOT NULL 
          AND ngay_het_han <= CURRENT_DATE + INTERVAL '30 days'
        ) as batch_het_han_30_ngay
      FROM batch_inventory
    `;
    
    const { rows } = await query(sql);
    return rows[0];
  }
};

export default batchInventoryRepository;

