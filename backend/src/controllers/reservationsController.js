// src/controllers/reservationsController.js
import { asyncHandler } from '../middleware/error.js';
import reservationsService from '../services/reservationsService.js';

class ReservationsController {
  // POST /api/v1/reservations
  createReservation = asyncHandler(async (req, res) => {
    const data = {
      ...req.body,
      created_by: req.user?.user_id
    };

    const reservation = await reservationsService.createReservation(data);

    res.status(201).json({
      success: true,
      data: reservation
    });
  });

  // GET /api/v1/reservations?date=YYYY-MM-DD&status=PENDING
  listReservations = asyncHandler(async (req, res) => {
    const { date, status } = req.query;

    const reservations = await reservationsService.getReservationsByDate(date, status);

    res.json({
      success: true,
      data: reservations
    });
  });

  // GET /api/v1/reservations/:id
  getReservationDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const reservation = await reservationsService.getReservationDetail(parseInt(id));

    res.json({
      success: true,
      data: reservation
    });
  });

  // PATCH /api/v1/reservations/:id
  updateReservation = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const updated = await reservationsService.updateReservation(parseInt(id), req.body);

    res.json({
      success: true,
      data: updated
    });
  });

  // POST /api/v1/reservations/:id/tables
  assignTables = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { table_ids } = req.body;

    const result = await reservationsService.assignTables(parseInt(id), table_ids);

    res.json({
      success: true,
      data: result
    });
  });

  // DELETE /api/v1/reservations/:id/tables/:tableId
  unassignTable = asyncHandler(async (req, res) => {
    const { id, tableId } = req.params;

    const result = await reservationsService.unassignTable(parseInt(id), parseInt(tableId));

    res.json({
      success: true,
      data: result
    });
  });

  // POST /api/v1/reservations/:id/cancel
  cancelReservation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const reservation = await reservationsService.cancelReservation(parseInt(id), reason);

    res.json({
      success: true,
      data: reservation
    });
  });

  // POST /api/v1/reservations/:id/no-show
  markNoShow = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const reservation = await reservationsService.markNoShow(parseInt(id));

    res.json({
      success: true,
      data: reservation
    });
  });

  // POST /api/v1/reservations/:id/check-in
  checkInReservation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { primary_table_id } = req.body;
    const created_by = req.user?.user_id;

    const result = await reservationsService.checkInReservation(
      parseInt(id),
      parseInt(primary_table_id),
      created_by
    );

    res.status(201).json({
      success: true,
      data: result
    });
  });

  // POST /api/v1/reservations/:id/complete
  completeReservation = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const reservation = await reservationsService.completeReservation(parseInt(id));

    res.json({
      success: true,
      data: reservation
    });
  });

  // POST /api/v1/reservations/:id/confirm
  confirmReservation = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const reservation = await reservationsService.updateReservation(parseInt(id), {
      trang_thai: 'CONFIRMED'
    });

    res.json({
      success: true,
      data: reservation
    });
  });

  // GET /api/v1/reservations/available-tables?start=...&end=...&area=...
  searchAvailableTables = asyncHandler(async (req, res) => {
    const { start, end, area } = req.query;

    // Parse area safely
    let areaId = null;
    if (area && area !== 'null' && area !== 'undefined') {
      const parsed = parseInt(area);
      if (!isNaN(parsed)) {
        areaId = parsed;
      }
    }

    const tables = await reservationsService.searchAvailableTables(
      start,
      end,
      areaId
    );

    res.json({
      success: true,
      data: tables
    });
  });

  // GET /api/v1/tables/:id/upcoming-reservation
  getUpcomingReservation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { within } = req.query; // minutes

    const reservation = await reservationsService.getUpcomingForTable(
      parseInt(id),
      within ? parseInt(within) : 60
    );

    res.json({
      success: true,
      data: reservation || null
    });
  });
}

export default new ReservationsController();

