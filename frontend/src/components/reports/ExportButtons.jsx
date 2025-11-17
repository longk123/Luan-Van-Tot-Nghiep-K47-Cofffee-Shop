// src/components/reports/ExportButtons.jsx
import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, File } from 'lucide-react';

const ExportButtons = ({ 
  reportType, 
  data, 
  filters,
  onExport,
  disabled = false,
  className = ''
}) => {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const handleExport = async (format) => {
    if (!data || disabled) return;

    setLoading(format);
    setError(null);

    try {
      // If custom export handler provided, use it
      if (onExport) {
        await onExport(format);
      } else {
        // Default: call backend API
        await exportToBackend(format);
      }
    } catch (err) {
      console.error('Export error:', err);
      setError(`Lỗi export ${format.toUpperCase()}: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  const exportToBackend = async (format) => {
    const token = localStorage.getItem('token');
    
    const response = await fetch('/api/v1/reports/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        reportType,
        format,
        ...filters
      })
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    // Download file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const buttons = [
    { 
      format: 'excel', 
      label: 'Excel', 
      icon: FileSpreadsheet, 
      color: 'bg-green-600 text-white border-2 border-transparent hover:bg-white hover:text-green-600 hover:border-green-600',
      loadingColor: 'bg-green-400 text-white'
    },
    { 
      format: 'pdf', 
      label: 'PDF', 
      icon: FileText, 
      color: 'bg-red-600 text-white border-2 border-transparent hover:bg-white hover:text-red-600 hover:border-red-600',
      loadingColor: 'bg-red-400 text-white'
    },
    { 
      format: 'csv', 
      label: 'CSV', 
      icon: File, 
      color: 'bg-blue-600 text-white border-2 border-transparent hover:bg-white hover:text-blue-600 hover:border-blue-600',
      loadingColor: 'bg-blue-400 text-white'
    }
  ];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-600 mr-2">
        <Download className="inline w-4 h-4 mr-1" />
        Xuất báo cáo:
      </span>
      
      {buttons.map(({ format, label, icon: Icon, color, loadingColor }) => (
        <button
          key={format}
          onClick={() => handleExport(format)}
          disabled={disabled || loading !== null}
          className={`
            ${loading === format ? loadingColor : color}
            ${disabled || loading !== null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            px-4 py-2 rounded-lg
            flex items-center gap-2
            transition-all duration-200
            text-sm font-medium
          `}
        >
          <Icon className="w-4 h-4" />
          {loading === format ? 'Đang xuất...' : label}
        </button>
      ))}

      {error && (
        <div className="text-red-600 text-sm ml-4">
          {error}
        </div>
      )}
    </div>
  );
};

export default ExportButtons;
