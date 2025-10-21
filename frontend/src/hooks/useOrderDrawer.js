// === src/hooks/useOrderDrawer.js ===
// File path: D:\my-thesis\frontend\src\hooks\useOrderDrawer.js
import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function useOrderDrawer(orderId) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [moveTableId, setMoveTableId] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  async function fetchData() {
    if (!orderId) return;
    console.log('Fetching order data for orderId:', orderId);
    setLoading(true);
    try {
      const [i, s] = await Promise.all([
        api.getOrderItemsWithAddons(orderId), // API mới với topping pricing
        api.getOrderSummary(orderId),
      ]);
      
      console.log('Order items with addons response:', i);
      console.log('Order summary response:', s);
      
      // Xử lý items - có thể là items hoặc data
      const itemsData = i?.items || i?.data || i || [];
      setItems(Array.isArray(itemsData) ? itemsData : []);
      
      // Tính lại summary để bao gồm topping
      const recalculatedSummary = { ...(s?.data || s || {}) };
      if (Array.isArray(itemsData) && itemsData.length > 0) {
        // Tính tổng tiền có bao gồm topping
        const totalWithToppings = itemsData.reduce((sum, item) => {
          return sum + (item.line_total_with_addons || item.line_total || 0);
        }, 0);
        recalculatedSummary.subtotal = totalWithToppings;
      }
      setSummary(recalculatedSummary);
    } catch (error) {
      console.error('Error fetching order data:', error);
      setItems([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  const moveTable = async () => {
    if (!moveTableId || !orderId) return;
    
    const targetId = Number(moveTableId);
    if (isNaN(targetId) || targetId <= 0) {
      alert('Vui lòng nhập ID bàn hợp lệ (số nguyên dương).');
      return false;
    }

    try {
      await api.moveOrderTable(orderId, targetId);
      setMoveTableId('');
      return true; // Success
    } catch (error) {
      console.error('Error moving table:', error);
      const errorMsg = error.message || 'Có lỗi xảy ra khi đổi bàn.';
      alert('Lỗi: ' + errorMsg);
      return false;
    }
  };

  const checkout = async (paymentMethod = 'CASH', keepSeated = false) => {
    if (!orderId) return false;
    setCheckingOut(true);
    try {
      await api.checkoutOrder(orderId, paymentMethod, keepSeated);
      // Refresh data sau khi thanh toán để lấy trạng thái mới
      await fetchData();
      return true; // Success
    } catch (error) {
      console.error('Error checking out:', error);
      alert('Lỗi khi thanh toán: ' + error.message);
      return false;
    } finally {
      setCheckingOut(false);
    }
  };

  return {
    items,
    summary,
    loading,
    moveTableId,
    setMoveTableId,
    checkingOut,
    fetchData,
    moveTable,
    checkout
  };
}
