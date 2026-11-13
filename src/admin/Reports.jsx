import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  FileSpreadsheet, 
  Database,
  Loader2
} from 'lucide-react';
import { apiRequest } from './api';

export default function Reports() {
  // Date-wise report state
  const [datePreset, setDatePreset] = useState('this_month'); // today, yesterday, last_7, this_month, last_month, custom
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [dateReportData, setDateReportData] = useState(null);
  const [loadingDateReport, setLoadingDateReport] = useState(false);

  // Monthly report state
  const [monthlyMonth, setMonthlyMonth] = useState('');
  const [monthlyYear, setMonthlyYear] = useState('');
  const [monthlyReportData, setMonthlyReportData] = useState(null);
  const [loadingMonthlyReport, setLoadingMonthlyReport] = useState(false);

  // General state
  const [error, setError] = useState('');

  // Helper date calculators
  const getLocalDateString = (dateObj) => {
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    return formatter.format(dateObj);
  };

  const getPresetsDates = (preset) => {
    const today = new Date();
    let start = today;
    let end = today;

    switch (preset) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'yesterday':
        const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        start = yesterday;
        end = yesterday;
        break;
      case 'last_7':
        const last7 = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
        start = last7;
        end = today;
        break;
      case 'this_month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
        break;
      case 'last_month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      default:
        break;
    }

    return {
      start: getLocalDateString(start),
      end: getLocalDateString(end)
    };
  };

  // Run initial loading
  useEffect(() => {
    const today = new Date();
    setMonthlyMonth(String(today.getMonth() + 1).padStart(2, '0'));
    setMonthlyYear(String(today.getFullYear()));
    
    // Default date range
    const { start, end } = getPresetsDates('this_month');
    setReportStartDate(start);
    setReportEndDate(end);
  }, []);

  // Update date range when preset changes
  useEffect(() => {
    if (datePreset !== 'custom') {
      const { start, end } = getPresetsDates(datePreset);
      setReportStartDate(start);
      setReportEndDate(end);
    }
  }, [datePreset]);

  // Load Date Report
  const fetchDateReport = async () => {
    if (!reportStartDate || !reportEndDate) return;
    setLoadingDateReport(true);
    setError('');
    try {
      const data = await apiRequest(`/api/reports/business-report?startDate=${reportStartDate}&endDate=${reportEndDate}`);
      setDateReportData(data);
    } catch (err) {
      setError('Failed to calculate period report.');
    } finally {
      setLoadingDateReport(false);
    }
  };

  // Load Monthly Report
  const fetchMonthlyReport = async () => {
    if (!monthlyMonth || !monthlyYear) return;
    setLoadingMonthlyReport(true);
    setError('');
    try {
      const data = await apiRequest(`/api/reports/monthly?month=${monthlyMonth}&year=${monthlyYear}`);
      setMonthlyReportData(data);
    } catch (err) {
      setError('Failed to calculate monthly report.');
    } finally {
      setLoadingMonthlyReport(false);
    }
  };

  useEffect(() => {
    fetchDateReport();
  }, [reportStartDate, reportEndDate]);

  useEffect(() => {
    fetchMonthlyReport();
  }, [monthlyMonth, monthlyYear]);

  // CSV Exporter helper
  const handleCsvExport = async (type) => {
    try {
      const token = localStorage.getItem('rajindera_admin_token');
      const response = await fetch(`/api/backup/export/${type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Server returned error on CSV generation.');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(err.message || 'Export failed.');
    }
  };

  // SQLite Database Binary Exporter
  const handleDbBackup = async () => {
    try {
      const token = localStorage.getItem('rajindera_admin_token');
      const response = await fetch('/api/backup/database-file', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Database backup download failed.');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rajindera_database_backup_${new Date().toISOString().split('T')[0]}.db`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(err.message || 'Failed to download database backup.');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.round(val || 0));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* Grid: Date-wise Report & Monthly Report */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Panel 1: Date-wise Report */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-semibold text-slate-900 text-base flex items-center gap-1.5">
                <Calendar size={18} className="text-blue-500" /> Date-Wise Business Report
              </h3>
            </div>

            {/* Presets buttons */}
            <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded-xl">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'last_7', label: '7 Days' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'custom', label: 'Custom' },
              ].map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setDatePreset(preset.id)}
                  className={`flex-1 min-w-[70px] text-center py-1.5 rounded-lg text-2xs font-bold transition ${
                    datePreset === preset.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Inputs */}
            {datePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date</label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-600 transition"
                  />
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {loadingDateReport ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={24} />
              </div>
            ) : dateReportData ? (
              /* Report Output Summary */
              <div className="pt-4 grid grid-cols-2 gap-4 border-t border-slate-100">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tankers Booked</span>
                  <p className="mt-1 text-lg font-bold text-slate-800">{dateReportData.totalOrders}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Sales</span>
                  <p className="mt-1 text-lg font-bold text-blue-600">{formatCurrency(dateReportData.totalSales)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Received</span>
                  <p className="mt-1 text-lg font-bold text-emerald-600">{formatCurrency(dateReportData.totalReceived)}</p>
                </div>
                <div className={`p-3 rounded-xl ${dateReportData.outstanding > 0 ? 'bg-rose-50' : 'bg-slate-50'}`}>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Outstanding</span>
                  <p className={`mt-1 text-lg font-bold ${dateReportData.outstanding > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {formatCurrency(dateReportData.outstanding)}
                  </p>
                </div>
                
                {/* Fleet Breakdown details */}
                <div className="col-span-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-500 font-semibold">
                  <div>• Normal Fleet: {dateReportData.normalTankers}</div>
                  <div>• Motor Fleet: {dateReportData.motorTankers}</div>
                  <div>• Filled Tanks: {dateReportData.filledOrders}</div>
                  <div>• Standby Tanks: {dateReportData.standbyOrders}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Panel 2: Monthly report */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-slate-900 text-base flex items-center gap-1.5">
              <BarChart3 size={18} className="text-indigo-500" /> Monthly Account Statement
            </h3>

            {/* Select Month and Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Month</label>
                <select
                  value={monthlyMonth}
                  onChange={(e) => setMonthlyMonth(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-600 transition text-xs font-semibold text-slate-700"
                >
                  <option value="01">January</option>
                  <option value="02">February</option>
                  <option value="03">March</option>
                  <option value="04">April</option>
                  <option value="05">May</option>
                  <option value="06">June</option>
                  <option value="07">July</option>
                  <option value="08">August</option>
                  <option value="09">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Year</label>
                <select
                  value={monthlyYear}
                  onChange={(e) => setMonthlyYear(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-600 transition text-xs font-semibold text-slate-700"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingMonthlyReport ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={24} />
              </div>
            ) : monthlyReportData ? (
              /* Report Output Summary */
              <div className="pt-4 grid grid-cols-2 gap-4 border-t border-slate-100">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Monthly Bookings</span>
                  <p className="mt-1 text-lg font-bold text-slate-800">{monthlyReportData.totalOrders}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-display">Business logged</span>
                  <p className="mt-1 text-lg font-bold text-blue-600">{formatCurrency(monthlyReportData.totalBusiness)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Received</span>
                  <p className="mt-1 text-lg font-bold text-emerald-600">{formatCurrency(monthlyReportData.totalReceived)}</p>
                </div>
                <div className={`p-3 rounded-xl ${monthlyReportData.outstanding > 0 ? 'bg-rose-50' : 'bg-slate-50'}`}>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Outstanding</span>
                  <p className={`mt-1 text-lg font-bold ${monthlyReportData.outstanding > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {formatCurrency(monthlyReportData.outstanding)}
                  </p>
                </div>

                {/* Fleet Breakdown details */}
                <div className="col-span-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-500 font-semibold">
                  <div>• Normal Fleet: {monthlyReportData.normalTankers}</div>
                  <div>• Motor Fleet: {monthlyReportData.motorTankers}</div>
                  <div>• Filled Tanks: {monthlyReportData.filledOrders}</div>
                  <div>• Standby Tanks: {monthlyReportData.standbyOrders}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Exporter Section */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
        <h3 className="font-display font-semibold text-slate-900 text-base mb-2 flex items-center gap-1.5">
          <Download size={18} className="text-emerald-500" /> Export Data & System Backups
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Download records locally as spreadsheet-friendly formats or download the database binary file to save audit history.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {/* Customers CSV */}
          <button
            onClick={() => handleCsvExport('customers')}
            className="flex items-center gap-3 p-4 border border-slate-200 hover:border-blue-200 bg-white hover:bg-blue-50/20 rounded-2xl text-left transition group"
          >
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Export Customers List</p>
              <p className="text-2xs text-slate-400 mt-0.5">CSV spreadsheet format</p>
            </div>
          </button>

          {/* Orders CSV */}
          <button
            onClick={() => handleCsvExport('orders')}
            className="flex items-center gap-3 p-4 border border-slate-200 hover:border-blue-200 bg-white hover:bg-blue-50/20 rounded-2xl text-left transition group"
          >
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Export Orders Ledger</p>
              <p className="text-2xs text-slate-400 mt-0.5">CSV spreadsheet format</p>
            </div>
          </button>

          {/* Payments CSV */}
          <button
            onClick={() => handleCsvExport('payments')}
            className="flex items-center gap-3 p-4 border border-slate-200 hover:border-blue-200 bg-white hover:bg-blue-50/20 rounded-2xl text-left transition group"
          >
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Export Payments History</p>
              <p className="text-2xs text-slate-400 mt-0.5">CSV spreadsheet format</p>
            </div>
          </button>

          {/* Accounts Summary CSV */}
          <button
            onClick={() => handleCsvExport('accounts')}
            className="flex items-center gap-3 p-4 border border-slate-200 hover:border-blue-200 bg-white hover:bg-blue-50/20 rounded-2xl text-left transition group"
          >
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Export Accounts Ledger</p>
              <p className="text-2xs text-slate-400 mt-0.5">CSV spreadsheet format</p>
            </div>
          </button>

          {/* Pending Payments CSV */}
          <button
            onClick={() => handleCsvExport('pending-payments')}
            className="flex items-center gap-3 p-4 border border-slate-200 hover:border-blue-200 bg-white hover:bg-blue-50/20 rounded-2xl text-left transition group"
          >
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Export Unpaid Receivables</p>
              <p className="text-2xs text-slate-400 mt-0.5">CSV spreadsheet format</p>
            </div>
          </button>

          {/* Database Backup */}
          <button
            onClick={handleDbBackup}
            className="flex items-center gap-3 p-4 border border-slate-200 hover:border-blue-200 bg-white hover:bg-blue-50/20 rounded-2xl text-left transition group"
          >
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition">
              <Database size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Backup Raw Database</p>
              <p className="text-2xs text-slate-400 mt-0.5">SQLite binary file download</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
