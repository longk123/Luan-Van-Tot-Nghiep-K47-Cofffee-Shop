// src/utils/exportHelpers.js
import * as XLSX from 'xlsx';

export const exportHelpers = {
  // Generate filename with timestamp
  generateFilename(reportType, format) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const extension = format === 'excel' ? 'xlsx' : format;
    return `${reportType}_${timestamp}.${extension}`;
  },

  // Format currency for export
  formatCurrency(value) {
    return (value || 0).toLocaleString('vi-VN') + ' đ';
  },

  // Format date for export
  formatDate(date) {
    return new Date(date).toLocaleDateString('vi-VN');
  },

  // Client-side Excel export using XLSX
  exportToExcelClient(data, filename, sheetName = 'Sheet1') {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  },

  // Client-side CSV export with UTF-8 BOM
  exportToCSVClient(data, columns, filename) {
    const BOM = '\uFEFF';
    const headers = columns.map(col => col.header).join(',');
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col.key] || '';
        return `"${value}"`;
      }).join(',')
    ).join('\n');
    
    const csvContent = BOM + headers + '\n' + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Download blob as file
  downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Call backend export API
  async exportFromBackend(reportType, format, filters) {
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
      const error = await response.json();
      throw new Error(error.message || 'Export failed');
    }

    const blob = await response.blob();
    const filename = this.generateFilename(reportType, format);
    this.downloadBlob(blob, filename);
  },

  // Prepare data for export (clean and format)
  prepareDataForExport(data, columns) {
    return data.map(item => {
      const formatted = {};
      columns.forEach(col => {
        let value = item[col.key];
        
        // Apply formatting if specified
        if (col.format === 'currency') {
          value = this.formatCurrency(value);
        } else if (col.format === 'date') {
          value = this.formatDate(value);
        } else if (col.format === 'number') {
          value = (value || 0).toLocaleString('vi-VN');
        }
        
        formatted[col.header] = value;
      });
      return formatted;
    });
  }
};

export default exportHelpers;
