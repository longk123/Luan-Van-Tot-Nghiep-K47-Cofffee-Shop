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
   * @param {Object} params - { startDate, endDate } hoặc { days }
   */
  async getRevenueChart(params = {}) {
    try {
      const data = await analyticsRepository.getRevenueChart(params);

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
        total_discount: Number(invoice.total_discount || 0),
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
          cash_diff: Number(shift.cash_diff || 0),
          // Kitchen stats
          total_items_made: Number(shift.total_items_made || 0),
          avg_prep_time_seconds: Number(shift.avg_prep_time_seconds || 0)
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
  async getProfitReport({ startDate, endDate, includeTopping = true, orderType = null }) {
    try {
      const data = await analyticsRepository.getProfitReport({
        startDate,
        endDate,
        orderType
      });

      // Tính tổng
      const summary = {
        totalRevenue: 0,
        totalOriginalRevenue: 0,
        totalDiscountLine: 0,
        totalDiscountPromo: 0,
        totalDiscountManual: 0,
        totalDiscount: 0,
        totalCostMon: 0,
        totalCostTopping: 0,
        totalCost: 0,
        totalProfit: 0,
        totalOrders: data.length,
        margin: 0,
        dineInOrders: 0,
        takeawayOrders: 0
      };

      const details = data.map(order => {
        const originalRevenue = Number(order.doanh_thu_goc || 0);
        const discountLine = Number(order.giam_gia_line || 0);
        const discountPromo = Number(order.giam_gia_khuyen_mai || 0);
        const discountManual = Number(order.giam_gia_thu_cong || 0);
        const totalDiscount = Number(order.tong_giam_gia || 0);
        const revenue = Number(order.doanh_thu || 0);
        const costMon = Number(order.gia_von_mon || 0);
        const costTopping = includeTopping ? Number(order.gia_von_topping || 0) : 0;
        const totalCost = costMon + costTopping;
        const profit = revenue - totalCost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

        // Cộng dồn vào summary
        summary.totalOriginalRevenue += originalRevenue;
        summary.totalDiscountLine += discountLine;
        summary.totalDiscountPromo += discountPromo;
        summary.totalDiscountManual += discountManual;
        summary.totalDiscount += totalDiscount;
        summary.totalRevenue += revenue;
        summary.totalCostMon += costMon;
        summary.totalCostTopping += costTopping;
        summary.totalCost += totalCost;
        summary.totalProfit += profit;

        // Count order types
        if (order.order_type === 'DINE_IN') summary.dineInOrders++;
        if (order.order_type === 'TAKEAWAY') summary.takeawayOrders++;

        return {
          orderId: order.order_id,
          closedAt: order.closed_at,
          orderType: order.order_type,
          originalRevenue,
          discountLine,
          discountPromo,
          discountManual,
          totalDiscount,
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

  /**
   * Lấy biểu đồ lợi nhuận theo ngày
   */
  async getProfitChart({ startDate, endDate }) {
    try {
      const data = await analyticsRepository.getProfitChart({
        startDate,
        endDate
      });

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
            label: 'Doanh thu',
            data: data.map(row => Number(row.total_revenue)),
            borderColor: 'rgb(251, 191, 36)',
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            tension: 0.4
          },
          {
            label: 'Giá vốn',
            data: data.map(row => Number(row.total_cost)),
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4
          },
          {
            label: 'Lợi nhuận',
            data: data.map(row => Number(row.total_profit)),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.4
          }
        ],
        marginData: data.map(row => ({
          date: row.date,
          margin: Number(row.margin_percent)
        }))
      };
    } catch (error) {
      console.error('Error getting profit chart:', error);
      throw error;
    }
  }

  /**
   * Lấy phân tích lợi nhuận theo món
   */
  async getProfitByItem({ startDate, endDate, limit = 20 }) {
    try {
      const data = await analyticsRepository.getProfitByItem({
        startDate,
        endDate,
        limit
      });

      return data.map(item => ({
        itemId: item.item_id,
        itemName: item.item_name,
        categoryName: item.category_name,
        orderCount: Number(item.order_count),
        quantitySold: Number(item.quantity_sold),
        totalRevenue: Number(item.total_revenue),
        totalCostMon: Number(item.total_cost_mon),
        totalCostTopping: Number(item.total_cost_topping),
        totalCost: Number(item.total_cost),
        totalProfit: Number(item.total_profit),
        marginPercent: Number(item.margin_percent)
      }));
    } catch (error) {
      console.error('Error getting profit by item:', error);
      throw error;
    }
  }

  /**
   * Lấy phân tích lợi nhuận theo danh mục
   */
  async getProfitByCategory({ startDate, endDate }) {
    try {
      const data = await analyticsRepository.getProfitByCategory({
        startDate,
        endDate
      });

      return data.map(category => ({
        categoryId: category.category_id,
        categoryName: category.category_name,
        orderCount: Number(category.order_count),
        quantitySold: Number(category.quantity_sold),
        totalRevenue: Number(category.total_revenue),
        totalCostMon: Number(category.total_cost_mon),
        totalCostTopping: Number(category.total_cost_topping),
        totalCost: Number(category.total_cost),
        totalProfit: Number(category.total_profit),
        marginPercent: Number(category.margin_percent)
      }));
    } catch (error) {
      console.error('Error getting profit by category:', error);
      throw error;
    }
  }

  /**
   * So sánh lợi nhuận với kỳ trước
   */
  async getProfitComparison({ startDate, endDate, timeRange = 'custom' }) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      let prevStart, prevEnd;

      // Calculate previous period based on timeRange type
      switch (timeRange) {
        case 'day':
          // Previous day
          prevEnd = new Date(start);
          prevEnd.setDate(prevEnd.getDate() - 1);
          prevStart = new Date(prevEnd);
          break;

        case 'week':
          // Previous week (same day of week)
          prevStart = new Date(start);
          prevStart.setDate(prevStart.getDate() - 7);
          prevEnd = new Date(end);
          prevEnd.setDate(prevEnd.getDate() - 7);
          break;

        case 'month':
          // Previous month (same dates)
          prevStart = new Date(start);
          prevStart.setMonth(prevStart.getMonth() - 1);
          prevEnd = new Date(end);
          prevEnd.setMonth(prevEnd.getMonth() - 1);
          // Handle month-end edge cases
          if (prevEnd.getDate() !== end.getDate()) {
            prevEnd.setDate(0); // Last day of previous month
          }
          break;

        case 'quarter':
          // Previous quarter (3 months back)
          prevStart = new Date(start);
          prevStart.setMonth(prevStart.getMonth() - 3);
          prevEnd = new Date(end);
          prevEnd.setMonth(prevEnd.getMonth() - 3);
          break;

        case 'year':
          // Previous year (same dates)
          prevStart = new Date(start);
          prevStart.setFullYear(prevStart.getFullYear() - 1);
          prevEnd = new Date(end);
          prevEnd.setFullYear(prevEnd.getFullYear() - 1);
          break;

        case 'custom':
        default:
          // For custom range, use same number of days
          const periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
          prevEnd = new Date(start);
          prevEnd.setDate(prevEnd.getDate() - 1);
          prevStart = new Date(prevEnd);
          prevStart.setDate(prevStart.getDate() - periodDays + 1);
          break;
      }

      const prevStartStr = prevStart.toISOString().split('T')[0];
      const prevEndStr = prevEnd.toISOString().split('T')[0];

      // Fetch both periods
      const [currentData, previousData] = await Promise.all([
        analyticsRepository.getProfitReport({ startDate, endDate }),
        analyticsRepository.getProfitReport({ startDate: prevStartStr, endDate: prevEndStr })
      ]);

      // Calculate summaries
      const calculateSummary = (data) => {
        const summary = {
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          totalOrders: data.length
        };

        data.forEach(order => {
          summary.totalRevenue += Number(order.doanh_thu || 0);
          summary.totalCost += Number(order.tong_gia_von || 0);
          summary.totalProfit += Number(order.loi_nhuan || 0);
        });

        summary.margin = summary.totalRevenue > 0
          ? (summary.totalProfit / summary.totalRevenue) * 100
          : 0;

        return summary;
      };

      const current = calculateSummary(currentData);
      const previous = calculateSummary(previousData);

      // Calculate changes
      const calculateChange = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      return {
        current: {
          startDate,
          endDate,
          ...current
        },
        previous: {
          startDate: prevStartStr,
          endDate: prevEndStr,
          ...previous
        },
        changes: {
          revenue: calculateChange(current.totalRevenue, previous.totalRevenue),
          cost: calculateChange(current.totalCost, previous.totalCost),
          profit: calculateChange(current.totalProfit, previous.totalProfit),
          orders: calculateChange(current.totalOrders, previous.totalOrders),
          margin: current.margin - previous.margin // Absolute difference for margin
        }
      };
    } catch (error) {
      console.error('Error getting profit comparison:', error);
      throw error;
    }
  }
}

export default new AnalyticsService();
