// Analytics Export Utilities

export interface AnalyticsData {
  summary: {
    totalUsers: number;
    activeUsers: number;
    tradingVolume: number;
    revenue: number;
  };
  dailyData: Array<{
    date: string;
    volume: number;
    trades: number;
    revenue: number;
    registrations: number;
  }>;
  topPairs: Array<{
    pair: string;
    volume: number;
    trades: number;
  }>;
  systemHealth: {
    uptime: number;
    errors: number;
    avgResponseTime: number;
  };
}

/**
 * Export analytics data to CSV format
 */
export function exportToCSV(data: AnalyticsData, timeRange: string): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `analytics-${timeRange}-${timestamp}.csv`;

  // Create CSV content
  let csvContent = "data:text/csv;charset=utf-8,";

  // Summary section
  csvContent += "SUMMARY\n";
  csvContent += "Metric,Value\n";
  csvContent += `Total Users,${data.summary.totalUsers}\n`;
  csvContent += `Active Users,${data.summary.activeUsers}\n`;
  csvContent += `Trading Volume (USDT),${data.summary.tradingVolume.toFixed(2)}\n`;
  csvContent += `Revenue (USDT),${data.summary.revenue.toFixed(2)}\n`;
  csvContent += "\n";

  // Daily data section
  csvContent += "DAILY METRICS\n";
  csvContent += "Date,Volume (USDT),Trades,Revenue (USDT),Registrations\n";
  data.dailyData.forEach(day => {
    csvContent += `${day.date},${day.volume.toFixed(2)},${day.trades},${day.revenue.toFixed(2)},${day.registrations}\n`;
  });
  csvContent += "\n";

  // Top trading pairs section
  csvContent += "TOP TRADING PAIRS\n";
  csvContent += "Pair,Volume (USDT),Trades\n";
  data.topPairs.forEach(pair => {
    csvContent += `${pair.pair},${pair.volume.toFixed(2)},${pair.trades}\n`;
  });
  csvContent += "\n";

  // System health section
  csvContent += "SYSTEM HEALTH\n";
  csvContent += "Metric,Value\n";
  csvContent += `Uptime (%),${data.systemHealth.uptime.toFixed(2)}\n`;
  csvContent += `Errors,${data.systemHealth.errors}\n`;
  csvContent += `Avg Response Time (ms),${data.systemHealth.avgResponseTime.toFixed(0)}\n`;

  // Create download link
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export analytics data to PDF format
 * Uses browser print functionality to generate PDF
 */
export function exportToPDF(data: AnalyticsData, timeRange: string): void {
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Create a new window with formatted content
  const printWindow = window.open('', '', 'height=800,width=800');
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }

  // HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Analytics Report - ${timeRange} - ${timestamp}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          color: #333;
        }
        h1 {
          color: #6366f1;
          border-bottom: 3px solid #6366f1;
          padding-bottom: 10px;
        }
        h2 {
          color: #4f46e5;
          margin-top: 30px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #e5e7eb;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin: 20px 0;
        }
        .summary-card {
          border: 1px solid #e5e7eb;
          padding: 20px;
          border-radius: 8px;
        }
        .summary-label {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 5px;
        }
        .summary-value {
          font-size: 28px;
          font-weight: bold;
          color: #6366f1;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #9ca3af;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <h1>BitChange Pro - Analytics Report</h1>
      <p><strong>Period:</strong> ${timeRange} | <strong>Generated:</strong> ${new Date().toLocaleString()}</p>

      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">Total Users</div>
          <div class="summary-value">${data.summary.totalUsers.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Active Users</div>
          <div class="summary-value">${data.summary.activeUsers.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Trading Volume</div>
          <div class="summary-value">$${data.summary.tradingVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Revenue</div>
          <div class="summary-value">$${data.summary.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      <h2>Daily Metrics</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Volume (USDT)</th>
            <th>Trades</th>
            <th>Revenue (USDT)</th>
            <th>Registrations</th>
          </tr>
        </thead>
        <tbody>
          ${data.dailyData.map(day => `
            <tr>
              <td>${day.date}</td>
              <td>$${day.volume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td>${day.trades}</td>
              <td>$${day.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td>${day.registrations}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>Top Trading Pairs</h2>
      <table>
        <thead>
          <tr>
            <th>Pair</th>
            <th>Volume (USDT)</th>
            <th>Trades</th>
          </tr>
        </thead>
        <tbody>
          ${data.topPairs.map(pair => `
            <tr>
              <td>${pair.pair}</td>
              <td>$${pair.volume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td>${pair.trades}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>System Health</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Uptime</td>
            <td>${data.systemHealth.uptime.toFixed(2)}%</td>
          </tr>
          <tr>
            <td>Errors</td>
            <td>${data.systemHealth.errors}</td>
          </tr>
          <tr>
            <td>Avg Response Time</td>
            <td>${data.systemHealth.avgResponseTime.toFixed(0)} ms</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <p>BitChange Pro - Professional Cryptocurrency Exchange</p>
        <p>This report is confidential and intended for authorized personnel only.</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    printWindow.print();
    // Close window after printing (or if user cancels)
    setTimeout(() => {
      printWindow.close();
    }, 100);
  };
}

/**
 * Export user metrics to CSV
 */
export function exportUsersToCSV(users: Array<{
  id: number;
  email: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
}>): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `users-${timestamp}.csv`;

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "ID,Email,Role,Created At,Last Login\n";
  
  users.forEach(user => {
    csvContent += `${user.id},"${user.email}",${user.role},${user.createdAt},${user.lastLogin || 'Never'}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export trading data to CSV
 */
export function exportTradesToCSV(trades: Array<{
  id: number;
  pair: string;
  side: string;
  price: number;
  amount: number;
  total: number;
  createdAt: string;
}>): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `trades-${timestamp}.csv`;

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "ID,Pair,Side,Price (USDT),Amount,Total (USDT),Date\n";
  
  trades.forEach(trade => {
    csvContent += `${trade.id},${trade.pair},${trade.side},${trade.price.toFixed(2)},${trade.amount.toFixed(8)},${trade.total.toFixed(2)},${trade.createdAt}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
