import analyticsRepository from '../repositories/analyticsRepository.js';

class AnalyticsService {
  /**
   * Lấy KPI tổng quan cho Manager Dashboard
   */
  async getOverviewKPIs(date = null) {
    try {
      const kpis = await analyticsRepository.getOverviewKPIs(date);
      
      // Format data for frontend
      return {
        revenue: {
          today: Number(kpis.today_revenue || 0),
          yesterday: Number(kpis.yesterday_revenue || 0),
          change_percent: Number(kpis.revenue_change_percent || 0)
        },
        orders: {
          paid: Number(kpis.paid_orders || 0),
          open: Number(kpis.open_orders || 0),
          cancelled: Number(kpis.cancelled_orders || 0),
          change_percent: Number(kpis.orders_change_percent || 0)
        },
        tables: {
          active: Number(kpis.active_tables || 0),
          total: Number(kpis.total_tables || 0),
          utilization_percent: kpis.total_tables > 0 
            ? Math.round((kpis.active_tables / kpis.total_tables) * 100)
            : 0
        },
        kitchen: {
          queue_count: Number(kpis.queue_count || 0)
        },
        order_types: {
          dine_in: Number(kpis.dine_in_orders || 0),
          takeaway: Number(kpis.takeaway_orders || 0)
        }
      };
    } catch (error) {
      console.error('Error getting overview KPIs:', error);
      throw error;
    }
  }

  /**
   * Lấy dữ liệu biểu đồ doanh thu
   */
  async getRevenueChart(days = 7) {
    try {
      const data = await analyticsRepository.getRevenueChart(days);
      
      return {
        labels: data.map(row => {
          const date = new Date(row.date);
          return date.toLocaleDateString('vi-VN', { 
            month: 'short', 
            day: 'numeric' 
          });
        }),
        datasets: [
          {
            label: 'Tổng doanh thu',
            data: data.map(row => Number(row.total_revenue)),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4
          },
          {
            label: 'Tại bàn',
            data: data.map(row => Number(row.dine_in_revenue)),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.4
          },
          {
            label: 'Mang đi',
            data: data.map(row => Number(row.takeaway_revenue)),
            borderColor: 'rgb(251, 146, 60)',
            backgroundColor: 'rgba(251, 146, 60, 0.1)',
            tension: 0.4
          }
        ]
      };
    } catch (error) {
      console.error('Error getting revenue chart:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách hóa đơn toàn thời gian
   */
  async getAllInvoices(filters = {}) {
    try {
      const result = await analyticsRepository.getAllInvoices(filters);
      
      // Format data for frontend
      const formattedData = result.data.map(invoice => ({
        id: invoice.id,
        order_type: invoice.order_type,
        status: invoice.trang_thai,
        opened_at: invoice.opened_at,
        closed_at: invoice.closed_at,
        total_amount: Number(invoice.grand_total || 0),
        item_count: Number(invoice.item_count || 0),
        table: {
          name: invoice.ten_ban,
          area: invoice.khu_vuc_ten
        },
        staff: {
          name: invoice.nhan_vien,
          username: invoice.username
        },
        shift: {
          name: invoice.ten_ca_lam,
          started_at: invoice.ca_bat_dau
        },
        payments: {
          cash: Number(invoice.cash_amount || 0),
          card: Number(invoice.card_amount || 0),
          transfer: Number(invoice.transfer_amount || 0),
          online: Number(invoice.online_amount || 0)
        },
        notes: invoice.ghi_chu,
        cancel_reason: invoice.ly_do_huy
      }));
      
      return {
        data: formattedData,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('Error getting all invoices:', error);
      throw error;
    }
  }

  /**
   * Lấy top món bán chạy
   */
  async getTopMenuItems(days = 7, limit = 10) {
    try {
      const items = await analyticsRepository.getTopMenuItems(days, limit);
      
      return items.map(item => ({
        id: item.id,
        name: item.ten_mon,
        variant: item.ten_bien_the,
        price: Number(item.gia),
        quantity_sold: Number(item.tong_so_luong),
        revenue: Number(item.tong_doanh_thu),
        average_price: Number(item.gia_trung_binh),
        order_count: Number(item.so_luong_ban)
      }));
    } catch (error) {
      console.error('Error getting top menu items:', error);
      throw error;
    }
  }

  /**
   * Lấy thống kê ca làm việc
   */
  async getShiftStats(days = 7) {
    try {
      const shifts = await analyticsRepository.getShiftStats(days);
      
      return shifts.map(shift => ({
        id: shift.id,
        name: shift.ten_ca_lam,
        type: shift.shift_type,
        started_at: shift.started_at,
        closed_at: shift.closed_at,
        status: shift.status,
        staff: shift.nhan_vien,
        stats: {
          total_orders: Number(shift.total_orders || 0),
          gross_amount: Number(shift.gross_amount || 0),
          net_amount: Number(shift.net_amount || 0),
          cash_amount: Number(shift.cash_amount || 0),
          card_amount: Number(shift.card_amount || 0),
          online_amount: Number(shift.online_amount || 0),
          cash_diff: Number(shift.cash_diff || 0)
        }
      }));
    } catch (error) {
      console.error('Error getting shift stats:', error);
      throw error;
    }
  }

  /**
   * Lấy báo cáo lợi nhuận chi tiết
   */
  async getProfitReport({ startDate, endDate, includeTopping = true }) {
    try {
      const data = await analyticsRepository.getProfitReport({
        startDate,
        endDate
      });
      
      // Tính tổng
      const summary = {
        totalRevenue: 0,
        totalCostMon: 0,
        totalCostTopping: 0,
        totalCost: 0,
        totalProfit: 0,
        totalOrders: data.length,
        margin: 0
      };
      
      const details = data.map(order => {
        const revenue = Number(order.doanh_thu || 0);
        const costMon = Number(order.gia_von_mon || 0);
        const costTopping = includeTopping ? Number(order.gia_von_topping || 0) : 0;
        const totalCost = costMon + costTopping;
        const profit = revenue - totalCost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        
        // Cộng dồn vào summary
        summary.totalRevenue += revenue;
        summary.totalCostMon += costMon;
        summary.totalCostTopping += costTopping;
        summary.totalCost += totalCost;
        summary.totalProfit += profit;
        
        return {
          orderId: order.order_id,
          closedAt: order.closed_at,
          revenue,
          costMon,
          costTopping,
          totalCost,
          profit,
          margin
        };
      });
      
      // Tính margin tổng
      summary.margin = summary.totalRevenue > 0 
        ? (summary.totalProfit / summary.totalRevenue) * 100 
        : 0;
      
      return { summary, details };
    } catch (error) {
      console.error('Error getting profit report:', error);
      throw error;
    }
  }
}

export default new AnalyticsService();
