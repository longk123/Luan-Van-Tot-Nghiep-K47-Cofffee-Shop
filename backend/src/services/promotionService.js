// backend/src/services/promotionService.js
import promotionRepository from '../repositories/promotionRepository.js';

class PromotionService {
  async getAllPromotions(filters) {
    // Pass all filters to repository including timeRange
    return await promotionRepository.getAll(filters);
  }

  async getPromotionById(id) {
    const promotion = await promotionRepository.getById(id);
    if (!promotion) {
      throw new Error('Promotion not found');
    }
    return promotion;
  }

  async createPromotion(data) {
    // Validate
    this.validatePromotionData(data);

    // Check if code exists
    if (data.ma && await promotionRepository.codeExists(data.ma)) {
      throw new Error('Mã khuyến mãi đã tồn tại');
    }

    return await promotionRepository.create(data);
  }

  async updatePromotion(id, data) {
    // Check if exists
    await this.getPromotionById(id);

    // Validate
    this.validatePromotionData(data);

    // Check if code exists (excluding current)
    if (data.ma && await promotionRepository.codeExists(data.ma, id)) {
      throw new Error('Mã khuyến mãi đã tồn tại');
    }

    return await promotionRepository.update(id, data);
  }

  async deletePromotion(id) {
    // Check if exists
    await this.getPromotionById(id);

    return await promotionRepository.delete(id);
  }

  async toggleActive(id, active) {
    // Check if exists
    await this.getPromotionById(id);

    return await promotionRepository.toggleActive(id, active);
  }

  async getPromotionStats(id, startDate, endDate) {
    // Check if exists
    await this.getPromotionById(id);

    return await promotionRepository.getStats(id, startDate, endDate);
  }

  async getUsageHistory(id, page, limit) {
    // Check if exists
    await this.getPromotionById(id);

    return await promotionRepository.getUsageHistory(id, page, limit);
  }

  async getSummary(date) {
    return await promotionRepository.getSummary(date);
  }

  validatePromotionData(data) {
    const { loai, gia_tri, max_giam, bat_dau, ket_thuc } = data;

    // Validate type
    if (!['PERCENT', 'AMOUNT'].includes(loai)) {
      throw new Error('Loại khuyến mãi không hợp lệ');
    }

    // Validate value
    if (loai === 'PERCENT') {
      if (gia_tri < 0 || gia_tri > 100) {
        throw new Error('Giá trị phần trăm phải từ 0-100');
      }
    } else {
      if (gia_tri < 0) {
        throw new Error('Giá trị giảm giá phải >= 0');
      }
    }

    // Validate max_giam for PERCENT
    if (loai === 'PERCENT' && max_giam && max_giam < 0) {
      throw new Error('Giới hạn tối đa phải >= 0');
    }

    // Validate dates
    if (bat_dau && ket_thuc) {
      if (new Date(bat_dau) > new Date(ket_thuc)) {
        throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
      }
    }
  }
}

export default new PromotionService();
