import React from 'react';

export default function TimeRangeFilter({ 
  timeRange, 
  onTimeRangeChange, 
  customDate, 
  onCustomDateChange,
  onApply,
  loading = false,
  showCustomRange = false,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange
}) {
  
  const timeOptions = [
    { value: 'today', label: 'Hôm nay', icon: '📅' },
    { value: 'week', label: '7 ngày', icon: '📊' },
    { value: 'month', label: '30 ngày', icon: '📈' },
    { value: 'quarter', label: 'Quý', icon: '📋' },
    { value: 'year', label: 'Năm', icon: '🗓️' },
    { value: 'custom', label: 'Tùy chỉnh', icon: '⚙️' }
  ];

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px' }}>
        📅 Chọn khoảng thời gian thống kê
      </h3>
      
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Time range buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {timeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onTimeRangeChange(option.value)}
              style={{
                padding: '8px 16px',
                backgroundColor: timeRange === option.value ? '#3b82f6' : '#f3f4f6',
                color: timeRange === option.value ? 'white' : '#374151',
                borderWidth: '0',
                borderStyle: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              {option.icon} {option.label}
            </button>
          ))}
        </div>
        
        {/* Custom date range (when timeRange === 'custom') */}
        {timeRange === 'custom' && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
              Từ:
            </label>
            <input
              type="date"
              value={customStartDate || ''}
              onChange={(e) => onCustomStartDateChange && onCustomStartDateChange(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            />
            
            <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
              Đến:
            </label>
            <input
              type="date"
              value={customEndDate || ''}
              onChange={(e) => onCustomEndDateChange && onCustomEndDateChange(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            />
          </div>
        )}
        
        {/* Reference date for Quarter/Year */}
        {(timeRange === 'quarter' || timeRange === 'year') && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
              Ngày tham chiếu:
            </label>
            <input
              type="date"
              value={customDate}
              onChange={(e) => onCustomDateChange(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            />
          </div>
        )}
        
        {/* Apply button */}
        <button
          onClick={onApply}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: loading ? '#9ca3af' : '#10b981',
            color: 'white',
            borderWidth: '0',
            borderStyle: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {loading ? '⏳ Đang tải...' : '🔄 Tải dữ liệu'}
        </button>
      </div>
      
      {/* Display current range */}
      {timeRange && (
        <div style={{ marginTop: '10px', fontSize: '13px', color: '#6b7280' }}>
          {timeRange === 'today' && `Khoảng thời gian: Hôm nay (${customDate || new Date().toISOString().split('T')[0]})`}
          {timeRange === 'week' && 'Khoảng thời gian: 7 ngày gần đây'}
          {timeRange === 'month' && 'Khoảng thời gian: 30 ngày gần đây'}
          {timeRange === 'quarter' && `Khoảng thời gian: Quý hiện tại (tham chiếu: ${customDate})`}
          {timeRange === 'year' && `Khoảng thời gian: Năm hiện tại (tham chiếu: ${customDate})`}
          {timeRange === 'custom' && customStartDate && customEndDate && 
            `Khoảng thời gian: ${customStartDate} đến ${customEndDate}`}
        </div>
      )}
    </div>
  );
}
