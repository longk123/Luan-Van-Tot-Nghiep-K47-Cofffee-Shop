// src/components/BatchExpiryNotification.jsx
import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

// Key để lưu trạng thái đã đóng vào localStorage
const DISMISSED_KEY = 'batch_expiry_dismissed';
const BATCH_IDS_KEY = 'batch_expiry_batch_ids';

const BatchExpiryNotification = forwardRef(function BatchExpiryNotification({ showBellOnly = false }, ref) {
  const navigate = useNavigate();
  const [expiringBatches, setExpiringBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [disposing, setDisposing] = useState(false);
  const [showDisposeConfirm, setShowDisposeConfirm] = useState(false);
  const [disposeResult, setDisposeResult] = useState(null);
  
  // Kiểm tra xem đã dismiss trong ngày chưa
  const checkIfDismissedToday = useCallback(() => {
    const dismissedData = localStorage.getItem(DISMISSED_KEY);
    if (!dismissedData) return false;
    
    try {
      const { date } = JSON.parse(dismissedData);
      const today = new Date().toDateString();
      
      // Nếu khác ngày thì reset
      if (date !== today) {
        localStorage.removeItem(DISMISSED_KEY);
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }, []);
  
  // Lưu trạng thái đã dismiss
  const saveDismissed = useCallback(() => {
    const today = new Date().toDateString();
    const batchIds = expiringBatches.map(b => b.batchId).sort().join(',');
    localStorage.setItem(DISMISSED_KEY, JSON.stringify({ date: today, batchIds }));
    localStorage.setItem(BATCH_IDS_KEY, batchIds);
  }, [expiringBatches]);
  
  const loadExpiringBatches = useCallback(async () => {
    try {
      const res = await api.getExpiringBatches(30);
      const batches = res.data || [];
      
      // Filter only critical batches (expiring in 7 days or less)
      const criticalBatches = batches.filter(b => b.daysRemaining <= 7);
      setExpiringBatches(criticalBatches);
      
      // Lưu batch IDs để so sánh sau
      const batchIds = criticalBatches.map(b => b.batchId).sort().join(',');
      const savedBatchIds = localStorage.getItem(BATCH_IDS_KEY);
      
      // Nếu có batch mới (khác với lần trước), hiển thị popup
      if (criticalBatches.length > 0 && batchIds !== savedBatchIds) {
        localStorage.setItem(BATCH_IDS_KEY, batchIds);
        localStorage.removeItem(DISMISSED_KEY);
        setShowPopup(true);
      } else if (criticalBatches.length > 0 && !checkIfDismissedToday()) {
        setShowPopup(true);
      }
    } catch (error) {
      console.error('Error loading expiring batches:', error);
    } finally {
      setLoading(false);
    }
  }, [checkIfDismissedToday]);
  
  useEffect(() => {
    loadExpiringBatches();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadExpiringBatches, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadExpiringBatches]);
  
  // Expose methods để parent component có thể gọi
  useImperativeHandle(ref, () => ({
    open: () => setShowPopup(true),
    close: () => {
      setShowPopup(false);
      saveDismissed();
    },
    getCount: () => expiringBatches.length,
    refresh: loadExpiringBatches
  }), [expiringBatches.length, loadExpiringBatches, saveDismissed]);
  
  const handleDismiss = () => {
    setShowPopup(false);
    setShowDisposeConfirm(false);
    setDisposeResult(null);
    saveDismissed();
  };
  
  // Hủy các lô hàng đã hết hạn
  const handleDisposeExpired = async () => {
    const expiredBatches = expiringBatches.filter(b => b.daysRemaining < 0);
    console.log('🔍 Expired batches to dispose:', expiredBatches);
    
    if (expiredBatches.length === 0) {
      alert('Không có lô hàng nào đã hết hạn để hủy');
      return;
    }
    
    setDisposing(true);
    try {
      // Đảm bảo batchIds là mảng số nguyên
      const batchIds = expiredBatches.map(b => parseInt(b.batchId));
      console.log('🔍 Batch IDs to dispose (parsed):', batchIds);
      
      const res = await api.disposeExpiredBatches({ 
        batchIds, 
        reason: 'Hết hạn sử dụng - Hủy tự động' 
      });
      
      console.log('🔍 Dispose response:', res);
      
      // Backend trả về { ok, data: { disposed, ... } }
      const disposed = res.data?.disposed || res.disposed || 0;
      const errors = res.data?.errors || res.errors || 0;
      
      setDisposeResult({
        success: true,
        message: `Đã hủy ${disposed} lô hàng thành công${errors > 0 ? `, ${errors} lỗi` : ''}`,
        details: res.data || res
      });
      
      // Reload danh sách
      await loadExpiringBatches();
      setShowDisposeConfirm(false);
    } catch (error) {
      setDisposeResult({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi hủy lô hàng'
      });
    } finally {
      setDisposing(false);
    }
  };
  
  // Hủy một lô hàng cụ thể
  const handleDisposeSingle = async (batch) => {
    if (!window.confirm(`Bạn có chắc muốn hủy lô "${batch.batchCode}" (${batch.ingredientName})?`)) {
      return;
    }
    
    setDisposing(true);
    try {
      await api.disposeBatch(batch.batchId, { 
        reason: batch.daysRemaining < 0 ? 'Hết hạn sử dụng' : 'Sắp hết hạn - Hủy trước khi hết hạn'
      });
      
      alert(`✅ Đã hủy lô hàng ${batch.batchCode} thành công`);
      await loadExpiringBatches();
    } catch (error) {
      alert(`❌ Lỗi: ${error.message}`);
    } finally {
      setDisposing(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };
  
  const getUrgencyColor = (daysRemaining) => {
    if (daysRemaining < 0) return 'red';
    if (daysRemaining === 0) return 'red';
    if (daysRemaining <= 3) return 'red';
    if (daysRemaining <= 7) return 'orange';
    return 'yellow';
  };
  
  const getUrgencyIcon = (daysRemaining) => {
    if (daysRemaining < 0 || daysRemaining === 0) {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  };
  
  if (loading) return null;
  
  const displayBatches = showAll ? expiringBatches : expiringBatches.slice(0, 3);
  const hasMore = expiringBatches.length > 3;
  
  // Render popup (dùng chung cho cả 2 mode)
  const renderPopup = () => {
    if (expiringBatches.length === 0 || !showPopup) return null;
    
    return (
      <div className="fixed top-6 right-6 z-[99999] max-w-md animate-slide-in-right pointer-events-auto">
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-orange-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Cảnh báo Hết hạn</h3>
                <p className="text-white/90 text-sm">{expiringBatches.length} batch cần xử lý</p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDismiss();
              }}
              className="text-white/80 hover:text-white hover:bg-white/20 transition-all p-2 rounded-lg cursor-pointer pointer-events-auto"
              title="Đóng (sẽ không hiện lại trong ngày)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="p-4 max-h-96 overflow-y-auto">
            {/* Hiển thị kết quả hủy nếu có */}
            {disposeResult && (
              <div className={`mb-3 p-3 rounded-lg ${disposeResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2">
                  {disposeResult.success ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={`text-sm font-medium ${disposeResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {disposeResult.message}
                  </span>
                </div>
              </div>
            )}

            {/* Confirm dialog cho hủy nhiều */}
            {showDisposeConfirm && (
              <div className="mb-3 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-3">
                  ⚠️ Xác nhận hủy {expiringBatches.filter(b => b.daysRemaining < 0).length} lô hàng đã hết hạn?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDisposeExpired}
                    disabled={disposing}
                    className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {disposing ? 'Đang xử lý...' : 'Xác nhận hủy'}
                  </button>
                  <button
                    onClick={() => setShowDisposeConfirm(false)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {displayBatches.map((batch) => {
                const color = getUrgencyColor(batch.daysRemaining);
                const bgColor = color === 'red' ? 'bg-red-50' : 'bg-orange-50';
                const borderColor = color === 'red' ? 'border-red-200' : 'border-orange-200';
                const textColor = color === 'red' ? 'text-red-700' : 'text-orange-700';
                const isExpired = batch.daysRemaining < 0;
                
                return (
                  <div
                    key={batch.batchId}
                    className={`${bgColor} ${borderColor} border-l-4 rounded-lg p-3 hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={textColor}>
                        {getUrgencyIcon(batch.daysRemaining)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-gray-200">
                            {batch.batchCode}
                          </span>
                          <span className={`text-xs font-semibold ${textColor}`}>
                            {batch.daysRemaining < 0 
                              ? `Hết hạn ${Math.abs(batch.daysRemaining)} ngày` 
                              : batch.daysRemaining === 0 
                              ? 'Hết hạn hôm nay'
                              : `Còn ${batch.daysRemaining} ngày`}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {batch.ingredientName}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-600">
                            Tồn: {batch.quantityRemaining.toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-500">
                            HSD: {formatDate(batch.expiryDate)}
                          </span>
                        </div>
                        {/* Nút hủy lô hàng */}
                        {isExpired && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDisposeSingle(batch);
                            }}
                            disabled={disposing}
                            className="mt-2 w-full px-2 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Hủy lô này
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Show More/Less */}
            {hasMore && (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="w-full mt-3 py-2 text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
              >
                {showAll ? 'Thu gọn' : `Xem thêm ${expiringBatches.length - 3} batch`}
              </button>
            )}
          </div>
          
          {/* Footer */}
          <div className="bg-gray-50 px-4 py-4 border-t border-gray-200 space-y-3">
            {/* Nút hủy tất cả đã hết hạn */}
            {expiringBatches.filter(b => b.daysRemaining < 0).length > 0 && !showDisposeConfirm && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDisposeConfirm(true);
                }}
                disabled={disposing}
                className="w-full px-4 py-2.5 bg-red-600 text-white border-2 border-red-600 rounded-xl hover:bg-red-700 transition-all duration-200 flex items-center justify-center gap-2 font-semibold cursor-pointer disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Hủy {expiringBatches.filter(b => b.daysRemaining < 0).length} lô đã hết hạn
              </button>
            )}
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDismiss();
                  navigate('/inventory?tab=batches');
                }}
                className="flex-1 px-4 py-2.5 bg-orange-500 text-white border-2 border-orange-500 rounded-xl hover:bg-white hover:text-orange-500 transition-all duration-200 flex items-center justify-center gap-2 font-semibold cursor-pointer pointer-events-auto"
              >
                Xem chi tiết
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  loadExpiringBatches();
                }}
                className="px-3 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:border-[#c9975b] hover:text-[#c9975b] hover:shadow-md transition-all duration-200 cursor-pointer pointer-events-auto"
                title="Làm mới"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Hint */}
          <div className="bg-blue-50 px-4 py-2 text-xs text-blue-600 text-center border-t border-blue-100">
            💡 Đóng popup này sẽ không hiện lại trong ngày. Click icon 🔔 để xem lại.
          </div>
        </div>
      </div>
    );
  };
  
  // Nếu chỉ hiển thị bell icon (cho header)
  if (showBellOnly) {
    if (expiringBatches.length === 0) return null;
    
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowPopup(true);
          }}
          className="relative p-2 text-gray-600 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all duration-200 cursor-pointer"
          title={`${expiringBatches.length} lô hàng sắp hết hạn`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {expiringBatches.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {expiringBatches.length}
            </span>
          )}
        </button>
        {renderPopup()}
      </>
    );
  }
  
  // Không hiển thị popup nếu không có batch hoặc đã dismiss
  if (expiringBatches.length === 0 || !showPopup) return null;
  
  return renderPopup();
});

export default BatchExpiryNotification;