/**
 * =====================================================================
 * BATCH INVENTORY CONTROLLER
 * =====================================================================
 *
 * API endpoints cho quản lý lô hàng
 *
 */

import batchInventoryRepository from '../repositories/batchInventoryRepository.js';
import { pool } from '../db.js';

/**
 * GET /api/v1/batch-inventory/ingredient/:ingredientId
 * Lấy danh sách batch của một nguyên liệu
 */
export async function getBatchesByIngredient(req, res, next) {
  try {
    const ingredientId = parseInt(req.params.ingredientId);
    const includeEmpty = req.query.include_empty === 'true';
    
    const batches = await batchInventoryRepository.getBatchesByIngredient(
      ingredientId,
      includeEmpty
    );
    
    res.json({
      ok: true,
      count: batches.length,
      data: batches.map(b => ({
        id: b.id,
        batchCode: b.batch_code,
        ingredientId: b.nguyen_lieu_id,
        ingredientName: b.nguyen_lieu_ten,
        ingredientCode: b.nguyen_lieu_ma,
        quantityImported: parseFloat(b.so_luong_nhap),
        quantityRemaining: parseFloat(b.so_luong_ton),
        unit: b.don_vi,
        unitPrice: parseInt(b.don_gia),
        totalValue: parseInt(b.gia_tri_ton),
        importDate: b.ngay_nhap,
        productionDate: b.ngay_san_xuat,
        expiryDate: b.ngay_het_han,
        daysRemaining: b.ngay_con_lai,
        status: b.trang_thai,
        supplier: b.nha_cung_cap,
        supplierBatchCode: b.so_lo_nha_cung_cap,
        note: b.ghi_chu,
        blockReason: b.ly_do_block,
        importedBy: b.nguoi_nhap_ten
      }))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/batch-inventory/:batchId
 * Lấy chi tiết một batch
 */
export async function getBatchById(req, res, next) {
  try {
    const batchId = parseInt(req.params.batchId);
    
    const batch = await batchInventoryRepository.getBatchById(batchId);
    
    if (!batch) {
      return res.status(404).json({
        ok: false,
        error: `Không tìm thấy batch ID ${batchId}`
      });
    }
    
    res.json({
      ok: true,
      data: {
        id: batch.id,
        batchCode: batch.batch_code,
        ingredientId: batch.nguyen_lieu_id,
        ingredientName: batch.nguyen_lieu_ten,
        ingredientCode: batch.nguyen_lieu_ma,
        quantityImported: parseFloat(batch.so_luong_nhap),
        quantityRemaining: parseFloat(batch.so_luong_ton),
        unit: batch.don_vi,
        unitPrice: parseInt(batch.don_gia),
        totalValue: parseInt(batch.gia_tri_ton),
        importDate: batch.ngay_nhap,
        productionDate: batch.ngay_san_xuat,
        expiryDate: batch.ngay_het_han,
        daysRemaining: batch.ngay_con_lai,
        status: batch.trang_thai,
        supplier: batch.nha_cung_cap,
        supplierBatchCode: batch.so_lo_nha_cung_cap,
        note: batch.ghi_chu,
        blockReason: batch.ly_do_block,
        importedBy: batch.nguoi_nhap_ten
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/batch-inventory/expiring
 * Lấy danh sách batch sắp hết hạn
 */
export async function getExpiringBatches(req, res, next) {
  try {
    const daysThreshold = parseInt(req.query.days || 30);
    
    const batches = await batchInventoryRepository.getExpiringBatches(daysThreshold);
    
    res.json({
      ok: true,
      count: batches.length,
      daysThreshold,
      data: batches.map(b => ({
        batchId: b.batch_id,
        batchCode: b.batch_code,
        ingredientId: b.nguyen_lieu_id,
        ingredientName: b.nguyen_lieu_ten,
        quantityRemaining: parseFloat(b.so_luong_ton),
        expiryDate: b.ngay_het_han,
        daysRemaining: b.ngay_con_lai,
        status: b.ngay_con_lai <= 0 ? 'EXPIRED' : 
                b.ngay_con_lai <= 7 ? 'CRITICAL' : 
                b.ngay_con_lai <= 30 ? 'WARNING' : 'OK'
      }))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/batch-inventory/summary
 * Lấy tổng quan batch inventory
 */
export async function getBatchSummary(req, res, next) {
  try {
    const summary = await batchInventoryRepository.getBatchSummary();
    
    res.json({
      ok: true,
      data: {
        totalBatches: parseInt(summary.tong_batch || 0),
        activeBatches: parseInt(summary.batch_active || 0),
        expiredBatches: parseInt(summary.batch_expired || 0),
        depletedBatches: parseInt(summary.batch_depleted || 0),
        blockedBatches: parseInt(summary.batch_blocked || 0),
        totalValue: parseInt(summary.tong_gia_tri_ton || 0),
        expiringIn7Days: parseInt(summary.batch_het_han_7_ngay || 0),
        expiringIn30Days: parseInt(summary.batch_het_han_30_ngay || 0)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/batch-inventory/:batchId/status
 * Cập nhật trạng thái batch (BLOCK/UNBLOCK)
 */
export async function updateBatchStatus(req, res, next) {
  try {
    const batchId = parseInt(req.params.batchId);
    const { status, reason } = req.body;
    
    if (!status) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required field: status'
      });
    }
    
    const validStatuses = ['ACTIVE', 'BLOCKED', 'EXPIRED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        ok: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    if (status === 'BLOCKED' && !reason) {
      return res.status(400).json({
        ok: false,
        error: 'Reason is required when blocking a batch'
      });
    }
    
    const batch = await batchInventoryRepository.updateBatchStatus(
      batchId,
      status,
      reason || null
    );
    
    if (!batch) {
      return res.status(404).json({
        ok: false,
        error: `Không tìm thấy batch ID ${batchId}`
      });
    }
    
    res.json({
      ok: true,
      message: `Đã cập nhật trạng thái batch ${batch.batch_code} thành ${status}`,
      data: {
        id: batch.id,
        batchCode: batch.batch_code,
        status: batch.trang_thai,
        blockReason: batch.ly_do_block
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/batch-inventory/fefo/:ingredientId
 * Xem thứ tự xuất kho theo FEFO
 */
export async function getFEFOOrder(req, res, next) {
  try {
    const ingredientId = parseInt(req.params.ingredientId);
    const quantity = parseFloat(req.query.quantity || 0);
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid quantity. Must be greater than 0'
      });
    }
    
    const batches = await batchInventoryRepository.getBatchesForFEFO(
      ingredientId,
      quantity
    );
    
    const totalAvailable = batches.reduce(
      (sum, b) => sum + parseFloat(b.so_luong_xuat),
      0
    );
    
    res.json({
      ok: true,
      quantityRequested: quantity,
      quantityAvailable: totalAvailable,
      sufficient: totalAvailable >= quantity,
      batches: batches.map((b, index) => ({
        order: index + 1,
        batchId: b.batch_id,
        batchCode: b.batch_code,
        quantityRemaining: parseFloat(b.so_luong_ton),
        quantityToExport: parseFloat(b.so_luong_xuat),
        unitPrice: parseInt(b.don_gia),
        expiryDate: b.ngay_het_han
      }))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/batch-inventory/report
 * Tạo báo cáo chi tiết batch inventory
 */
export async function getBatchInventoryReport(req, res, next) {
  try {
    const { ingredient_id, status, days_threshold } = req.query;

    // Build query
    let query = `
      SELECT
        bi.id,
        bi.batch_code,
        bi.nguyen_lieu_id,
        nl.ten as nguyen_lieu_ten,
        nl.ma as nguyen_lieu_ma,
        bi.so_luong_nhap,
        bi.so_luong_ton,
        bi.don_vi,
        bi.don_gia,
        bi.gia_tri_ton,
        bi.ngay_nhap,
        bi.ngay_san_xuat,
        bi.ngay_het_han,
        CASE
          WHEN bi.ngay_het_han IS NULL THEN NULL
          ELSE (DATE(bi.ngay_het_han) - CURRENT_DATE)::INT
        END as ngay_con_lai,
        bi.trang_thai,
        bi.nha_cung_cap,
        bi.so_lo_nha_cung_cap,
        bi.ghi_chu,
        u.username as nguoi_nhap_ten,
        -- Tính số lượng đã xuất
        bi.so_luong_nhap - bi.so_luong_ton as so_luong_da_xuat,
        -- Tính % còn lại
        ROUND((bi.so_luong_ton / NULLIF(bi.so_luong_nhap, 0) * 100)::NUMERIC, 2) as phan_tram_con_lai
      FROM batch_inventory bi
      LEFT JOIN nguyen_lieu nl ON bi.nguyen_lieu_id = nl.id
      LEFT JOIN users u ON bi.nguoi_nhap_id = u.user_id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Filter by ingredient
    if (ingredient_id) {
      query += ` AND bi.nguyen_lieu_id = $${paramIndex}`;
      params.push(parseInt(ingredient_id));
      paramIndex++;
    }

    // Filter by status
    if (status) {
      query += ` AND bi.trang_thai = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Filter by expiry threshold
    if (days_threshold) {
      query += ` AND bi.ngay_het_han IS NOT NULL
                 AND bi.ngay_het_han <= CURRENT_DATE + INTERVAL '${parseInt(days_threshold)} days'`;
    }

    query += ` ORDER BY
      CASE
        WHEN bi.ngay_het_han IS NULL THEN 2
        ELSE 1
      END,
      bi.ngay_het_han ASC,
      bi.ngay_nhap ASC
    `;

    const { rows } = await pool.query(query, params);

    // Calculate summary statistics
    const summary = {
      totalBatches: rows.length,
      totalValue: rows.reduce((sum, r) => sum + parseInt(r.gia_tri_ton || 0), 0),
      totalQuantity: rows.reduce((sum, r) => sum + parseFloat(r.so_luong_ton || 0), 0),
      byStatus: {
        ACTIVE: rows.filter(r => r.trang_thai === 'ACTIVE').length,
        EXPIRED: rows.filter(r => r.trang_thai === 'EXPIRED').length,
        DEPLETED: rows.filter(r => r.trang_thai === 'DEPLETED').length,
        BLOCKED: rows.filter(r => r.trang_thai === 'BLOCKED').length
      },
      byExpiry: {
        expired: rows.filter(r => r.ngay_con_lai !== null && r.ngay_con_lai < 0).length,
        expiring7Days: rows.filter(r => r.ngay_con_lai !== null && r.ngay_con_lai >= 0 && r.ngay_con_lai <= 7).length,
        expiring30Days: rows.filter(r => r.ngay_con_lai !== null && r.ngay_con_lai > 7 && r.ngay_con_lai <= 30).length,
        safe: rows.filter(r => r.ngay_con_lai === null || r.ngay_con_lai > 30).length
      }
    };

    res.json({
      ok: true,
      summary,
      data: rows.map(r => ({
        id: r.id,
        batchCode: r.batch_code,
        ingredientId: r.nguyen_lieu_id,
        ingredientName: r.nguyen_lieu_ten,
        ingredientCode: r.nguyen_lieu_ma,
        quantityImported: parseFloat(r.so_luong_nhap),
        quantityRemaining: parseFloat(r.so_luong_ton),
        quantityExported: parseFloat(r.so_luong_da_xuat),
        percentageRemaining: parseFloat(r.phan_tram_con_lai),
        unit: r.don_vi,
        unitPrice: parseInt(r.don_gia),
        totalValue: parseInt(r.gia_tri_ton),
        importDate: r.ngay_nhap,
        productionDate: r.ngay_san_xuat,
        expiryDate: r.ngay_het_han,
        daysRemaining: r.ngay_con_lai,
        status: r.trang_thai,
        supplier: r.nha_cung_cap,
        supplierBatchCode: r.so_lo_nha_cung_cap,
        note: r.ghi_chu,
        importedBy: r.nguoi_nhap_ten
      }))
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getBatchesByIngredient,
  getBatchById,
  getExpiringBatches,
  getBatchSummary,
  updateBatchStatus,
  getFEFOOrder,
  getBatchInventoryReport,
  disposeBatch,
  disposeExpiredBatches
};

/**
 * POST /api/v1/batch-inventory/:batchId/dispose
 * Hủy một lô hàng (xuất kho hủy)
 */
export async function disposeBatch(req, res, next) {
  try {
    const batchId = parseInt(req.params.batchId);
    const { reason, note } = req.body;
    const userId = req.user?.userId;
    
    if (!reason) {
      return res.status(400).json({
        ok: false,
        error: 'Vui lòng nhập lý do hủy'
      });
    }
    
    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: 'Không xác định được người thực hiện'
      });
    }
    
    const result = await batchInventoryRepository.disposeBatch(
      batchId,
      userId,
      reason,
      note
    );
    
    res.json({
      ok: true,
      message: `Đã hủy lô hàng ${result.batchCode} thành công`,
      data: result
    });
  } catch (error) {
    if (error.message.includes('Không tìm thấy') || error.message.includes('không còn hàng')) {
      return res.status(400).json({
        ok: false,
        error: error.message
      });
    }
    next(error);
  }
}

/**
 * POST /api/v1/batch-inventory/dispose-expired
 * Hủy tất cả các lô hàng đã hết hạn
 */
export async function disposeExpiredBatches(req, res, next) {
  try {
    const { batchIds, reason = 'Hết hạn sử dụng' } = req.body;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: 'Không xác định được người thực hiện'
      });
    }
    
    let targetBatchIds = batchIds;
    
    // Nếu không truyền batchIds, lấy tất cả batch đã hết hạn
    if (!targetBatchIds || targetBatchIds.length === 0) {
      const expiredBatches = await batchInventoryRepository.getExpiringBatches(0);
      targetBatchIds = expiredBatches
        .filter(b => b.ngay_con_lai !== null && b.ngay_con_lai < 0)
        .map(b => b.batch_id);
    }
    
    if (targetBatchIds.length === 0) {
      return res.json({
        ok: true,
        message: 'Không có lô hàng nào cần hủy',
        data: { disposed: 0, errors: 0 }
      });
    }
    
    const { results, errors } = await batchInventoryRepository.disposeMultipleBatches(
      targetBatchIds,
      userId,
      reason
    );
    
    const totalDisposed = results.reduce((sum, r) => sum + r.quantityDisposed, 0);
    const totalValue = results.reduce((sum, r) => sum + r.valueDisposed, 0);
    
    res.json({
      ok: true,
      message: `Đã hủy ${results.length} lô hàng`,
      data: {
        disposed: results.length,
        errors: errors.length,
        totalQuantityDisposed: totalDisposed,
        totalValueDisposed: totalValue,
        results,
        errorDetails: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    next(error);
  }
}

