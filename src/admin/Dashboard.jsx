import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  IndianRupee, 
  Users, 
  ClipboardList, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Clock, 
  ArrowUpRight,
  Plus,
  Users2,
  Receipt,
  Eye,
  Loader2
} from 'lucide-react';

import { apiRequest } from './api';
import OrderModal from './forms/OrderModal';
import CustomerModal from './forms/CustomerModal';
import PaymentModal from './forms/PaymentModal';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal open states
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      const summaryData = await apiRequest('/api/reports/dashboard-summary');
      setSummary(summaryData);
      
      const analyticsData = await apiRequest('/api/reports/analytics');
      setAnalytics(analyticsData);
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load dashboard data.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-600">
        <p className="font-semibold">{error}</p>
        <button 
          onClick={() => { setLoading(true); fetchDashboardData(); }}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Format currency in Indian standard
  const formatCurrency = (val) => {
    const rounded = Math.round(val);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(rounded);
  };

  // Indian date format helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Max value helper for scaling charts
  const getTrendMaxValue = () => {
    if (!analytics?.monthlyTrend) return 10000;
    const values = analytics.monthlyTrend.flatMap(item => [item.revenue, item.payments]);
    return Math.max(...values, 10000);
  };

  const trendMax = getTrendMaxValue();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Quick Action Dashboard Header */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          onClick={() => setOrderModalOpen(true)}
          className="flex items-center justify-between p-5 rounded-[24px] bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-soft hover:shadow-lg transition text-left group"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-100">Quick Booking</p>
            <p className="mt-2 text-xl font-semibold">Add Tanker Order</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-white group-hover:scale-110 transition">
            <Plus size={20} />
          </div>
        </button>

        <button
          onClick={() => setCustomerModalOpen(true)}
          className="flex items-center justify-between p-5 rounded-[24px] bg-white border border-slate-200 shadow-soft hover:border-blue-300 transition text-left group"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Business Network</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">Add New Customer</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-110 transition">
            <Users2 size={20} />
          </div>
        </button>

        <button
          onClick={() => setPaymentModalOpen(true)}
          className="flex items-center justify-between p-5 rounded-[24px] bg-white border border-slate-200 shadow-soft hover:border-blue-300 transition text-left group"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Accounts Receivable</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">Record Payment</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition">
            <Receipt size={20} />
          </div>
        </button>
      </div>

      {/* Summary Cards Grid (9 metrics cards) */}
      <div>
        <h2 className="font-display text-lg font-semibold text-slate-900 mb-4">Financial & Order Summary</h2>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {/* Card 1: Today's Orders */}
          <div className="bg-white border border-slate-200 p-5 rounded-[20px] shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Orders</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{summary.todayOrders}</p>
          </div>

          {/* Card 2: Today's Sales */}
          <div className="bg-white border border-slate-200 p-5 rounded-[20px] shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Sales</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(summary.todaySales)}</p>
          </div>

          {/* Card 3: Total Customers */}
          <div className="bg-white border border-slate-200 p-5 rounded-[20px] shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Customers</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{summary.totalCustomers}</p>
          </div>

          {/* Card 4: Total Orders */}
          <div className="bg-white border border-slate-200 p-5 rounded-[20px] shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Orders</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{summary.totalOrders}</p>
          </div>

          {/* Card 5: Total Business */}
          <div className="bg-white border border-slate-200 p-5 rounded-[20px] shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Business</p>
            <p className="mt-3 text-2xl font-bold text-blue-600">{formatCurrency(summary.totalBusiness)}</p>
          </div>

          {/* Card 6: Total Received */}
          <div className="bg-white border border-slate-200 p-5 rounded-[20px] shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Received</p>
            <p className="mt-3 text-2xl font-bold text-emerald-600">{formatCurrency(summary.totalReceived)}</p>
          </div>

          {/* Card 7: Total Outstanding */}
          <div className={`border p-5 rounded-[20px] shadow-sm ${summary.totalOutstanding > 0 ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200 bg-white'}`}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Outstanding</p>
            <p className={`mt-3 text-2xl font-bold ${summary.totalOutstanding > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatCurrency(summary.totalOutstanding)}</p>
          </div>

          {/* Card 8: Paid Orders */}
          <div className="bg-white border border-slate-200 p-5 rounded-[20px] shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paid Orders</p>
            <p className="mt-3 text-2xl font-bold text-emerald-600">{summary.paidOrders}</p>
          </div>

          {/* Card 9: Unpaid Orders */}
          <div className="bg-white border border-slate-200 p-5 rounded-[20px] shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unpaid Orders</p>
            <p className="mt-3 text-2xl font-bold text-rose-600">{summary.unpaidOrders}</p>
          </div>
        </div>
      </div>

      {/* Analytics Charts (Custom SVGs) */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Trend Graph */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-display font-semibold text-slate-900 text-base">Monthly Income & Billing Trend</h3>
            <p className="text-xs text-slate-400 mt-1">Comparison of total business logged and actual payments received</p>
          </div>
          
          {/* SVG Bar Chart */}
          <div className="h-64 mt-6 relative flex items-end justify-between border-b border-l border-slate-100 pb-1 pl-1">
            {analytics?.monthlyTrend?.map((item, idx) => {
              const revPercent = Math.round((item.revenue / trendMax) * 100);
              const payPercent = Math.round((item.payments / trendMax) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end px-1.5 sm:px-3 relative">
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-lg p-2 text-2xs opacity-0 group-hover:opacity-100 transition z-20 pointer-events-none whitespace-nowrap shadow-md mb-2">
                    <p className="font-bold">{item.monthLabel}</p>
                    <p className="text-blue-300">Sales: {formatCurrency(item.revenue)}</p>
                    <p className="text-emerald-300">Paid: {formatCurrency(item.payments)}</p>
                    <p className="text-rose-300">Due: {formatCurrency(item.outstanding)}</p>
                  </div>

                  <div className="flex items-end gap-1 h-full w-full justify-center">
                    {/* Revenue Bar */}
                    <div 
                      style={{ height: `${Math.max(revPercent, 2)}%` }}
                      className="w-4 sm:w-6 bg-blue-600 hover:bg-blue-700 transition rounded-t-sm"
                    />
                    {/* Payments Bar */}
                    <div 
                      style={{ height: `${Math.max(payPercent, 2)}%` }}
                      className="w-4 sm:w-6 bg-emerald-500 hover:bg-emerald-600 transition rounded-t-sm"
                    />
                  </div>
                  
                  <span className="text-[10px] font-semibold text-slate-500 mt-2 whitespace-nowrap">
                    {item.monthLabel.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-4 mt-4 text-xs font-semibold justify-center">
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-blue-600" /> Total Sales</div>
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500" /> Payments Received</div>
          </div>
        </div>

        {/* Distributions */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-display font-semibold text-slate-900 text-base">Fleet & Usage Breakdown</h3>
            <p className="text-xs text-slate-400 mt-1">Comparison of tanker logistics and booking arrangements</p>
          </div>

          <div className="space-y-6 mt-6 flex-1 flex flex-col justify-center">
            {/* Tanker Type Distribution */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-2">
                <span>Tanker Type</span>
                <span>
                  Normal ({analytics.tankerDistribution.normal}) vs Motor ({analytics.tankerDistribution.motor})
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${(analytics.tankerDistribution.normal / (analytics.tankerDistribution.normal + analytics.tankerDistribution.motor || 1)) * 100}%` }}
                  className="bg-blue-600 h-full"
                />
                <div 
                  style={{ width: `${(analytics.tankerDistribution.motor / (analytics.tankerDistribution.normal + analytics.tankerDistribution.motor || 1)) * 100}%` }}
                  className="bg-sky-400 h-full"
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>Normal ({Math.round((analytics.tankerDistribution.normal / (analytics.tankerDistribution.normal + analytics.tankerDistribution.motor || 1)) * 100)}%)</span>
                <span>Motor ({Math.round((analytics.tankerDistribution.motor / (analytics.tankerDistribution.normal + analytics.tankerDistribution.motor || 1)) * 100)}%)</span>
              </div>
            </div>

            {/* Use Type Distribution */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-2">
                <span>Order Type / Use</span>
                <span>
                  Filled ({analytics.useDistribution.filled}) vs Standby ({analytics.useDistribution.standby})
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${(analytics.useDistribution.filled / (analytics.useDistribution.filled + analytics.useDistribution.standby || 1)) * 100}%` }}
                  className="bg-indigo-600 h-full"
                />
                <div 
                  style={{ width: `${(analytics.useDistribution.standby / (analytics.useDistribution.filled + analytics.useDistribution.standby || 1)) * 100}%` }}
                  className="bg-orange-400 h-full"
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>Filled ({Math.round((analytics.useDistribution.filled / (analytics.useDistribution.filled + analytics.useDistribution.standby || 1)) * 100)}%)</span>
                <span>Standby ({Math.round((analytics.useDistribution.standby / (analytics.useDistribution.filled + analytics.useDistribution.standby || 1)) * 100)}%)</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6 grid grid-cols-2 gap-2 text-center text-xs font-semibold text-slate-600">
            <Link to="/admin/pending-payments" className="py-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition flex items-center justify-center gap-1">
              <Clock size={14} className="text-amber-500" /> Pending Payments
            </Link>
            <Link to="/admin/accounts" className="py-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition flex items-center justify-center gap-1">
              <Users size={14} className="text-blue-500" /> Client Ledgers
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-display font-semibold text-slate-900 text-base">Recent Tanker Bookings</h3>
            <p className="text-xs text-slate-400 mt-1">Reviewing the latest 10 operations logged on the grid</p>
          </div>
          <Link 
            to="/admin/orders" 
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 border border-blue-100 rounded-full px-3 py-1.5 hover:bg-blue-50 transition"
          >
            All Bookings <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pr-2">ID</th>
                <th className="pb-3 px-2">Date</th>
                <th className="pb-3 px-2">Customer</th>
                <th className="pb-3 px-2">Site Location</th>
                <th className="pb-3 px-2">Tanker</th>
                <th className="pb-3 px-2">Use</th>
                <th className="pb-3 px-2 text-right">Price</th>
                <th className="pb-3 pl-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentOrders.map((order) => {
                let statusColor = 'text-slate-500 bg-slate-100';
                if (order.payment_status === 'Paid') statusColor = 'text-emerald-700 bg-emerald-50';
                else if (order.payment_status === 'Unpaid') statusColor = 'text-rose-700 bg-rose-50';
                else if (order.payment_status === 'Partially Paid') statusColor = 'text-amber-700 bg-amber-50';

                return (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="py-3.5 pr-2 font-semibold text-slate-900">#{order.id}</td>
                    <td className="py-3.5 px-2">{formatDate(order.order_date)}</td>
                    <td className="py-3.5 px-2 font-semibold text-slate-900">{order.customer_name}</td>
                    <td className="py-3.5 px-2 truncate max-w-[150px]">{order.delivery_location}</td>
                    <td className="py-3.5 px-2">{order.tanker_type}</td>
                    <td className="py-3.5 px-2">{order.use_type}</td>
                    <td className="py-3.5 px-2 text-right font-bold text-slate-900">
                      {formatCurrency(order.price)}
                    </td>
                    <td className="py-3.5 pl-2 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${statusColor}`}>
                        {order.payment_status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {summary.recentOrders.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No orders recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shared Modals */}
      <OrderModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        onSave={fetchDashboardData}
      />
      <CustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSave={fetchDashboardData}
      />
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSave={fetchDashboardData}
      />
    </div>
  );
}
