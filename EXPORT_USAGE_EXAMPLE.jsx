// Example: How to add export to any report component

import React from 'react';
import ExportButtons from '../components/reports/ExportButtons';
import { exportHelpers } from '../utils/exportHelpers';

function MyReport() {
  const [reportData, setReportData] = useState(null);
  
  // Custom export handler (optional)
  const handleExport = async (format) => {
    if (format === 'excel') {
      // Client-side Excel export
      const data = reportData.details.map(item => ({
        'Tên': item.name,
        'Số Lượng': item.quantity,
        'Doanh Thu': item.revenue
      }));
      
      exportHelpers.exportToExcelClient(
        data, 
        exportHelpers.generateFilename('my-report', 'excel')
      );
    } else {
      // Use backend API for PDF/CSV
      await exportHelpers.exportFromBackend(
        'my-report',
        format,
        { startDate, endDate }
      );
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2>My Report</h2>
        
        {/* Option 1: Use backend API (recommended for complex reports) */}
        <ExportButtons 
          reportType="revenue"
          data={reportData}
          filters={{ startDate, endDate }}
          disabled={!reportData}
        />
        
        {/* Option 2: Custom export handler */}
        <ExportButtons 
          reportType="revenue"
          data={reportData}
          filters={{ startDate, endDate }}
          onExport={handleExport}
          disabled={!reportData}
        />
      </div>
      
      {/* Report content */}
    </div>
  );
}

export default MyReport;
