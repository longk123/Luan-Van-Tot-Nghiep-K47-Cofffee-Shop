// src/components/BatchExpiryNotification.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function BatchExpiryNotification() {
  const navigate = useNavigate();
  const [expiringBatches, setExpiringBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  
  useEffect(() => {
    loadExpiringBatches();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadExpiringBatches, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  const loadExpiringBatches = async () => {
    try {
      const res = await api.getExpiringBatches(30); // Get batches expiring in 30 days
      const batches = res.data || [];
      
      // Filter only critical batches (expiring in 7 days or less)
      const criticalBatches = batches.filter(b => b.daysRemaining <= 7);
      setExpiringBatches(criticalBatches);
    } catch (error) {
      console.error('Error loading expiring batches:', error);
    } finally {
      setLoading(false);
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
  if (expiringBatches.length === 0) return null;
  if (dismissed) return null;
  
  const displayBatches = showAll ? expiringBatches : expiringBatches.slice(0, 3);
  const hasMore = expiringBatches.length > 3;
  
  return (
    <div className="fixed top-6 right-6 z-[2000] max-w-md animate-slide-in-right">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-orange-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
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
            onClick={() => setDismissed(true)}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {displayBatches.map((batch) => {
              const color = getUrgencyColor(batch.daysRemaining);
              const bgColor = color === 'red' ? 'bg-red-50' : 'bg-orange-50';
              const borderColor = color === 'red' ? 'border-red-200' : 'border-orange-200';
              const textColor = color === 'red' ? 'text-red-700' : 'text-orange-700';
              
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
                            ? 'Đã hết hạn' 
                            : batch.daysRemaining === 0 
                            ? 'Hết hạn hôm nay'
                            : `${batch.daysRemaining} ngày`}
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Show More/Less */}
          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full mt-3 py-2 text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
            >
              {showAll ? 'Thu gọn' : `Xem thêm ${expiringBatches.length - 3} batch`}
            </button>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between gap-3 border-t border-gray-200">
          <button
            onClick={() => navigate('/batch-expiry')}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white border-2 border-orange-500 rounded-lg hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-orange-600 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 font-semibold"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundImage = 'none';
              e.currentTarget.style.backgroundColor = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundImage = '';
              e.currentTarget.style.backgroundColor = '';
            }}
          >
            Xem chi tiết
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <button
            onClick={loadExpiringBatches}
            className="px-3 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-[#c9975b] hover:text-[#c9975b] hover:shadow-md transition-all duration-200"
            title="Làm mới"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

