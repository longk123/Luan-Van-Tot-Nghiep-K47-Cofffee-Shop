/**
 * Controller: Inventory Management
 */

import { inventoryRepository } from '../repositories/inventoryRepository.js';

/**
 * GET /api/v1/inventory/check
 * Check đủ nguyên liệu để làm món
 */
export async function checkIngredients(req, res, next) {
  try {
    const { mon_id, bien_the_id, so_luong, tuy_chon_ids } = req.query;
    
    if (!mon_id || !so_luong) {
      return res.status(400).json({
        ok: false,
        error: 'Missing mon_id or so_luong'
      });
    }
    
    const tuyChonArray = tuy_chon_ids 
      ? (Array.isArray(tuy_chon_ids) ? tuy_chon_ids : [tuy_chon_ids])
      : null;
    
    const results = await inventoryRepository.checkIngredients({
      monId: parseInt(mon_id),
      bienTheId: bien_the_id ? parseInt(bien_the_id) : null,
      soLuong: parseInt(so_luong),
      tuyChonIds: tuyChonArray
    });
    
    const allAvailable = results.every(r => r.du_nguyen_lieu);
    const missing = results.filter(r => !r.du_nguyen_lieu);
    
    res.json({
      ok: true,
      available: allAvailable,
      ingredients: results.map(r => ({
        name: r.nguyen_lieu_thieu,
        available: r.du_nguyen_lieu,
        stock: parseFloat(r.ton_kho),
        need: parseFloat(r.can_dung),
        unit: r.don_vi
      })),
      missing: missing.map(r => r.nguyen_lieu_thieu)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/inventory/calculate-cost
 * Tính giá vốn động theo size và % đường/đá
 * Query: ?mon_id=1&bien_the_id=2&tuy_chon_ids=2,5
 */
export async function calculateCost(req, res, next) {
  try {
    const { mon_id, bien_the_id, tuy_chon_ids } = req.query;
    
    if (!mon_id) {
      return res.status(400).json({
        ok: false,
        error: 'Missing mon_id'
      });
    }
    
    // Parse tuy_chon_ids: support comma-separated values or array
    let tuyChonArray = null;
    if (tuy_chon_ids) {
      if (Array.isArray(tuy_chon_ids)) {
        // Format: tuy_chon_ids[]=2&tuy_chon_ids[]=5
        tuyChonArray = tuy_chon_ids.map(id => parseInt(id));
      } else if (typeof tuy_chon_ids === 'string') {
        // Format: tuy_chon_ids=2,5
        tuyChonArray = tuy_chon_ids.split(',').map(id => parseInt(id.trim()));
      }
    }
    
    const cost = await inventoryRepository.calculateDynamicCost({
      monId: parseInt(mon_id),
      bienTheId: bien_the_id ? parseInt(bien_the_id) : null,
      tuyChonIds: tuyChonArray
    });
    
    res.json({
      ok: true,
      mon_id: parseInt(mon_id),
      bien_the_id: bien_the_id ? parseInt(bien_the_id) : null,
      tuy_chon_ids: tuyChonArray,
      gia_von: cost,
      formatted: `${cost.toLocaleString('vi-VN')}đ`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/inventory/warnings
 * Lấy cảnh báo tồn kho
 */
export async function getWarnings(req, res, next) {
  try {
    const warnings = await inventoryRepository.getWarnings();
    
    const critical = warnings.filter(w => w.trang_thai === 'HET_HANG');
    const warning = warnings.filter(w => w.trang_thai === 'SAP_HET');
    const ok = warnings.filter(w => w.trang_thai === 'DU');
    
    res.json({
      ok: true,
      summary: {
        total: warnings.length,
        critical: critical.length,
        warning: warning.length,
        ok: ok.length
      },
      warnings: warnings.map(w => ({
        id: w.id,
        code: w.ma,
        name: w.ten,
        stock: parseFloat(w.ton_kho),
        unit: w.don_vi,
        price: parseFloat(w.gia_nhap_moi_nhat || 0),
        value: parseFloat(w.gia_tri_ton_kho || 0),
        canMake: w.uoc_tinh_so_ly_lam_duoc ? parseInt(w.uoc_tinh_so_ly_lam_duoc) : null,
        status: w.trang_thai
      }))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/inventory/export-history
 * Lịch sử xuất kho
 */
export async function getExportHistory(req, res, next) {
  try {
    const { don_hang_id, from_date, to_date, limit } = req.query;
    
    const history = await inventoryRepository.getExportHistory({
      donHangId: don_hang_id ? parseInt(don_hang_id) : null,
      fromDate: from_date || null,
      toDate: to_date || null,
      limit: limit ? parseInt(limit) : 100
    });
    
    res.json({
      ok: true,
      count: history.length,
      data: history.map(h => ({
        id: h.id,
        ingredientId: h.nguyen_lieu_id,
        ingredient: h.nguyen_lieu,
        code: h.ma,
        quantity: parseFloat(h.so_luong),
        unit: h.don_vi,
        orderId: h.don_hang_id,
        exportDate: h.ngay_xuat,
        note: h.ghi_chu,
        value: parseFloat(h.gia_tri || 0)
      }))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/inventory/import-history
 * Lịch sử nhập kho
 */
export async function getImportHistory(req, res, next) {
  try {
    const { from_date, to_date, limit } = req.query;
    
    const history = await inventoryRepository.getImportHistory({
      fromDate: from_date || null,
      toDate: to_date || null,
      limit: limit ? parseInt(limit) : 100
    });
    
    res.json({
      ok: true,
      count: history.length,
      data: history.map(h => ({
        id: h.id,
        ingredientId: h.nguyen_lieu_id,
        ingredient: h.nguyen_lieu,
        code: h.ma,
        quantity: parseFloat(h.so_luong),
        unit: h.don_vi,
        price: parseFloat(h.don_gia),
        total: parseFloat(h.thanh_tien),
        supplier: h.nha_cung_cap,
        importDate: h.ngay_nhap,
        note: h.ghi_chu
      }))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/inventory/report
 * Báo cáo xuất nhập tồn
 */
export async function getInventoryReport(req, res, next) {
  try {
    const { from_date, to_date } = req.query;
    
    if (!from_date || !to_date) {
      return res.status(400).json({
        ok: false,
        error: 'Missing from_date or to_date'
      });
    }
    
    const report = await inventoryRepository.getInventoryReport({
      fromDate: from_date,
      toDate: to_date
    });
    
    res.json({
      ok: true,
      summary: {
        totalInventoryValue: report.summary.tong_gia_tri_ton,
        totalImported: report.summary.tong_nhap,
        totalExported: report.summary.tong_xuat
      },
      details: report.details.map(d => ({
        id: d.id,
        code: d.ma,
        name: d.ten,
        unit: d.don_vi,
        stock: parseFloat(d.ton_kho),
        price: parseFloat(d.gia_nhap_moi_nhat),
        inventoryValue: parseFloat(d.gia_tri_ton),
        imported: parseFloat(d.tong_nhap),
        exported: parseFloat(d.tong_xuat)
      }))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/inventory/ingredients
 * Danh sách nguyên liệu
 */
export async function getIngredients(req, res, next) {
  try {
    const ingredients = await inventoryRepository.getAllIngredients();
    
    res.json({
      ok: true,
      count: ingredients.length,
      data: ingredients.map(i => ({
        id: i.id,
        code: i.ma,
        name: i.ten,
        stock: parseFloat(i.ton_kho),
        unit: i.don_vi,
        price: parseFloat(i.gia_nhap_moi_nhat || 0),
        value: parseFloat(i.gia_tri_ton_kho || 0),
        active: i.active
      }))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/inventory/ingredients/:id
 * Chi tiết nguyên liệu
 */
export async function getIngredientById(req, res, next) {
  try {
    const { id } = req.params;
    
    const ingredient = await inventoryRepository.getIngredientById(parseInt(id));
    
    if (!ingredient) {
      return res.status(404).json({
        ok: false,
        error: 'Ingredient not found'
      });
    }
    
    res.json({
      ok: true,
      data: {
        id: ingredient.id,
        code: ingredient.ma,
        name: ingredient.ten,
        stock: parseFloat(ingredient.ton_kho),
        unit: ingredient.don_vi,
        price: parseFloat(ingredient.gia_nhap_moi_nhat || 0),
        value: parseFloat(ingredient.gia_tri_ton_kho || 0),
        active: ingredient.active
      }
    });
  } catch (error) {
    next(error);
  }
}
