// src/services/reservationsService.js
import reservationsRepo from '../repositories/reservationsRepository.js';
import { BadRequest } from '../utils/httpErrors.js';

class ReservationsService {
  // Validate thời gian
  validateTimeRange(start_at, end_at) {
    const start = new Date(start_at);
    const end = new Date(end_at);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequest('Thời gian không hợp lệ');
    }

    if (end <= start) {
      throw new BadRequest('Thời gian kết thúc phải sau thời gian bắt đầu');
    }

    // Kiểm tra không được đặt quá khứ
    if (start < new Date()) {
      throw new BadRequest('Không thể đặt bàn trong quá khứ');
    }

    // Kiểm tra khoảng thời gian hợp lý (15 phút - 4 giờ)
    const duration = (end - start) / (1000 * 60); // minutes
    if (duration < 15) {
      throw new BadRequest('Thời gian đặt bàn tối thiểu 15 phút');
    }
    if (duration > 240) {
      throw new BadRequest('Thời gian đặt bàn tối đa 4 giờ');
    }

    return { start, end, duration };
  }

  // Tạo đặt bàn mới
  async createReservation(data) {
    // Validate
    this.validateTimeRange(data.start_at, data.end_at);

    if (!data.so_nguoi || data.so_nguoi < 1) {
      throw new BadRequest('Số người phải lớn hơn 0');
    }

    if (!data.so_dien_thoai && !data.khach_hang_id) {
      throw new BadRequest('Cần có số điện thoại hoặc thông tin khách hàng');
    }

    // Nếu có SĐT, tìm/tạo khách hàng
    let khach_hang_id = data.khach_hang_id;
    if (data.so_dien_thoai && data.ten_khach) {
      const customer = await reservationsRepo.upsertCustomer({
        ten: data.ten_khach,
        so_dien_thoai: data.so_dien_thoai,
        email: data.email,
        ghi_chu: data.ghi_chu_khach
      });
      khach_hang_id = customer.id;
    }

    // Tạo đặt bàn
    const createData = {
      ...data,
      khach_hang_id
    };
    
    console.log('🔧 Service createReservation - data to repository:', createData);
    console.log('khu_vuc_id value:', createData.khu_vuc_id, 'isNaN:', isNaN(createData.khu_vuc_id));
    
    const reservation = await reservationsRepo.create(createData);

    // Gán bàn nếu có
    if (data.table_ids && data.table_ids.length > 0) {
      await reservationsRepo.assignTables(reservation.id, data.table_ids);
    }

    return await reservationsRepo.getById(reservation.id);
  }

  // Lấy danh sách theo ngày
  async getReservationsByDate(date, trang_thai = null) {
    if (!date) {
      throw new BadRequest('Thiếu tham số date');
    }

    return await reservationsRepo.getByDate(date, trang_thai);
  }

  // Lấy chi tiết
  async getReservationDetail(id) {
    const reservation = await reservationsRepo.getById(id);
    if (!reservation) {
      throw new BadRequest('Không tìm thấy đặt bàn');
    }
    return reservation;
  }

  // Cập nhật
  async updateReservation(id, data) {
    // Kiểm tra tồn tại
    const existing = await reservationsRepo.getById(id);
    if (!existing) {
      throw new BadRequest('Không tìm thấy đặt bàn');
    }

    // Không cho sửa nếu đã SEATED/COMPLETED/CANCELLED
    if (['SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(existing.trang_thai)) {
      throw new BadRequest(`Không thể sửa đặt bàn ở trạng thái ${existing.trang_thai}`);
    }

    // Validate thời gian nếu có thay đổi
    if (data.start_at || data.end_at) {
      const start = data.start_at || existing.start_at;
      const end = data.end_at || existing.end_at;
      this.validateTimeRange(start, end);
    }

    return await reservationsRepo.update(id, data);
  }

  // Gán bàn
  async assignTables(id, table_ids) {
    if (!Array.isArray(table_ids) || table_ids.length === 0) {
      throw new BadRequest('Thiếu danh sách bàn');
    }

    const reservation = await reservationsRepo.getById(id);
    if (!reservation) {
      throw new BadRequest('Không tìm thấy đặt bàn');
    }

    // Kiểm tra bàn có trống không
    const available = await reservationsRepo.findAvailableTables(
      reservation.start_at,
      reservation.end_at,
      reservation.khu_vuc_id
    );

    const availableIds = available.map(t => t.ban_id);
    const invalidTables = table_ids.filter(id => !availableIds.includes(id));

    if (invalidTables.length > 0) {
      throw new BadRequest(
        `Các bàn sau không khả dụng trong khung giờ này: ${invalidTables.join(', ')}`
      );
    }

    return await reservationsRepo.assignTables(id, table_ids);
  }

  // Bỏ gán bàn
  async unassignTable(id, table_id) {
    const reservation = await reservationsRepo.getById(id);
    if (!reservation) {
      throw new BadRequest('Không tìm thấy đặt bàn');
    }

    return await reservationsRepo.unassignTable(id, table_id);
  }

  // Hủy đặt bàn
  async cancelReservation(id, reason = null) {
    const reservation = await reservationsRepo.getById(id);
    if (!reservation) {
      throw new BadRequest('Không tìm thấy đặt bàn');
    }

    if (['COMPLETED', 'CANCELLED'].includes(reservation.trang_thai)) {
      throw new BadRequest('Không thể hủy đặt bàn đã hoàn thành hoặc đã hủy');
    }

    return await reservationsRepo.cancel(id, reason);
  }

  // No-show
  async markNoShow(id) {
    const reservation = await reservationsRepo.getById(id);
    if (!reservation) {
      throw new BadRequest('Không tìm thấy đặt bàn');
    }

    return await reservationsRepo.markNoShow(id);
  }

  // Check-in
  async checkInReservation(id, primary_table_id, created_by) {
    if (!primary_table_id) {
      throw new BadRequest('Thiếu thông tin bàn chính');
    }

    const reservation = await reservationsRepo.getById(id);
    if (!reservation) {
      throw new BadRequest('Không tìm thấy đặt bàn');
    }

    if (reservation.trang_thai === 'SEATED') {
      throw new BadRequest('Đặt bàn đã được check-in');
    }

    if (!['PENDING', 'CONFIRMED'].includes(reservation.trang_thai)) {
      throw new BadRequest('Chỉ có thể check-in đặt bàn ở trạng thái PENDING hoặc CONFIRMED');
    }

    // Kiểm tra bàn có trong danh sách đặt không
    const hasTable = reservation.tables.some(t => t.ban_id === primary_table_id);
    if (!hasTable) {
      throw new BadRequest('Bàn này không thuộc đặt chỗ');
    }

    return await reservationsRepo.checkIn(id, primary_table_id, created_by);
  }

  // Hoàn thành
  async completeReservation(id) {
    const reservation = await reservationsRepo.getById(id);
    if (!reservation) {
      throw new BadRequest('Không tìm thấy đặt bàn');
    }

    return await reservationsRepo.complete(id);
  }

  // Tìm bàn trống
  async searchAvailableTables(start_at, end_at, khu_vuc_id = null) {
    this.validateTimeRange(start_at, end_at);
    return await reservationsRepo.findAvailableTables(start_at, end_at, khu_vuc_id);
  }

  // Lấy đặt bàn sắp tới của bàn
  async getUpcomingForTable(ban_id, within_minutes = 60) {
    return await reservationsRepo.getUpcomingForTable(ban_id, within_minutes);
  }
}

export default new ReservationsService();

