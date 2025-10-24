import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function ShiftBadge() {
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load shift information
  useEffect(() => {
    loadShift();
  }, []);

  async function loadShift() {
    try {
      setLoading(true);
      const res = await api.getCurrentShift();
      const shiftData = res?.data || res;
      
      // Kiểm tra shift có hợp lệ không
      if (shiftData && shiftData.id && shiftData.status === 'OPEN') {
        setShift(shiftData);
      } else {
        setShift(null);
      }
    } catch (err) {
      console.error('Error loading shift:', err);
      setShift(null);
    } finally {
      setLoading(false);
    }
  }

  // Format thời gian
  const formatTime = (dateString) => {
    if (!dateString) return 'Invalid Date';
    try {
      return new Date(dateString).toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Format ngày
  const formatDate = (dateString) => {
    if (!dateString) return 'Invalid Date';
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
        <div className="w-4 h-4 bg-gray-300 rounded-full animate-pulse"></div>
        <div className="text-sm text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-800 rounded-lg border border-amber-200">
        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
        <div className="text-sm font-medium">Chưa mở ca</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg border border-green-200">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <div className="text-sm">
        <div className="font-semibold">
          Ca #{shift.id} - {shift.nhan_vien?.full_name || shift.nhan_vien_ten || 'Unknown'}
        </div>
        <div className="text-xs text-green-600">
          {formatTime(shift.started_at)} • {formatDate(shift.started_at)}
        </div>
      </div>
    </div>
  );
}
