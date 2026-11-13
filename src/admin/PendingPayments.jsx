import { useState, useEffect } from 'react';
import { Clock, Search, IndianRupee, Loader2 } from 'lucide-react';
import { apiRequest } from './api';
import PaymentModal from './forms/PaymentModal';

export default function PendingPayments() {
  const [unpaidOrders, setUnpaidOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('all'); // today, last_7, this_month, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentCustomerId, setPaymentCustomerId] = useState('');
  const [paymentOrderId, setPaymentOrderId] = useState('');

  const fetchUnpaidOrders = async () => {
    try {
      // Fetch all orders and we will filter for unpaid/partially paid in the view
      const data = await apiRequest('/api/orders');
      const pending = data.filter(o => o.payment_status !== 'Paid');
      setUnpaidOrders(pending);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch pending payments ledger.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnpaidOrders();
  }, []);

  const handleRecordPayment = (order) => {
    setPaymentCustomerId(order.customer_id);
    setPaymentOrderId(order.id);
    setPaymentModalOpen(true);
  };

  const handlePaymentSaved = () => {
    fetchUnpaidOrders();
  };

  // Days pending calculation
  const getDaysPending = (dateStr) => {
    if (!dateStr) return 0;
    const orderDateObj = new Date(dateStr);
    const todayObj = new Date();
    
    // Normalize times
    orderDateObj.setHours(0,0,0,0);
    todayObj.setHours(0,0,0,0);
    
    const diffTime = todayObj.getTime() - orderDateObj.getTime();
    if (diffTime < 0) return 0;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Helper YYYY-MM-DD date range checks
  const isToday = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const isWithinLastDays = (dateStr, days) => {
    const oDate = new Date(dateStr);
    const today = new Date();
    const threshold = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
    return oDate >= threshold;
  };

  const isThisMonth = (dateStr) => {
    const oDate = new Date(dateStr);
    const today = new Date();
    return oDate.getMonth() === today.getMonth() && oDate.getFullYear() === today.getFullYear();
  };

  // Filter & Search Logic
  const filteredOrders = unpaidOrders.filter(order => {
    // 1. Search filter
    const term = search.toLowerCase().trim();
    if (term) {
      const match = 
        order.customer_name.toLowerCase().includes(term) ||
        (order.customer_phone && order.customer_phone.includes(term)) ||
        order.delivery_location.toLowerCase().includes(term) ||
        String(order.id) === term;
      if (!match) return false;
    }

    // 2. Date presets filters
    if (dateRangeFilter === 'today') {
      return isToday(order.order_date);
    }
    if (dateRangeFilter === 'last_7') {
      return isWithinLastDays(order.order_date, 7);
    }
    if (dateRangeFilter === 'this_month') {
      return isThisMonth(order.order_date);
    }
    if (dateRangeFilter === 'custom') {
      if (customStartDate && order.order_date < customStartDate) return false;
      if (customEndDate && order.order_date > customEndDate) return false;
    }

    return true;
  });

  // Calculate Total Outstanding of the filtered set
  const totalOutstanding = filteredOrders.reduce((sum, o) => sum + o.balance, 0);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.round(val));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Total Outstanding Hero Card */}
      <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-[28px] p-6 text-white shadow-soft flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rose-100">Total Outstanding Balance</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-extrabold">{formatCurrency(totalOutstanding)}</h2>
          <p className="mt-2 text-xs text-rose-100 font-semibold">
            Currently tracking {filteredOrders.length} unpaid / partially paid tanker deliveries
          </p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/20 text-white">
          <Clock size={28} />
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4">
        {/* Preset Toggles */}
        <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-100">
          {[
            { id: 'all', label: 'All Unpaid' },
            { id: 'today', label: "Today's Unpaid" },
            { id: 'last_7', label: 'Last 7 Days' },
            { id: 'this_month', label: 'This Month' },
            { id: 'custom', label: 'Custom Range' },
          ].map(preset => (
            <button
              key={preset.id}
              onClick={() => setDateRangeFilter(preset.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                dateRangeFilter === preset.id
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Search & Custom inputs */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 min-w-[200px] w-full">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Unpaid Ledger</label>
            <div className="relative mt-1.5">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search by customer, phone or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 outline-none focus:border-blue-600 transition text-xs font-semibold text-slate-700"
              />
            </div>
          </div>

          {dateRangeFilter === 'custom' && (
            <div className="flex flex-wrap gap-3 items-end w-full md:w-auto">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 outline-none focus:border-blue-600 transition text-xs font-semibold text-slate-700"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 outline-none focus:border-blue-600 transition text-xs font-semibold text-slate-700"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* Unpaid orders table */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pr-2">Customer</th>
                  <th className="pb-3 px-2">Phone</th>
                  <th className="pb-3 px-2">Order Date</th>
                  <th className="pb-3 px-2">Delivery Location</th>
                  <th className="pb-3 px-2 text-right">Original Amount</th>
                  <th className="pb-3 px-2 text-right">Amount Paid</th>
                  <th className="pb-3 px-2 text-right">Outstanding</th>
                  <th className="pb-3 px-2 text-center">Days Pending</th>
                  <th className="pb-3 pl-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const days = getDaysPending(order.order_date);
                  let pendingColor = 'text-slate-500 bg-slate-50';
                  if (days > 30) pendingColor = 'text-rose-700 bg-rose-50 border border-rose-100';
                  else if (days > 7) pendingColor = 'text-amber-700 bg-amber-50 border border-amber-100';

                  return (
                    <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                      <td className="py-3.5 pr-2 font-semibold text-slate-900">{order.customer_name}</td>
                      <td className="py-3.5 px-2">{order.customer_phone || '--'}</td>
                      <td className="py-3.5 px-2">{formatDate(order.order_date)}</td>
                      <td className="py-3.5 px-2 truncate max-w-[130px]">{order.delivery_location}</td>
                      <td className="py-3.5 px-2 text-right font-bold text-slate-900">
                        {formatCurrency(order.price)}
                      </td>
                      <td className="py-3.5 px-2 text-right font-semibold text-emerald-600">
                        {formatCurrency(order.amount_paid)}
                      </td>
                      <td className="py-3.5 px-2 text-right font-extrabold text-rose-600">
                        {formatCurrency(order.balance)}
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${pendingColor}`}>
                          {days === 0 ? 'Today' : `${days} Day${days > 1 ? 's' : ''}`}
                        </span>
                      </td>
                      <td className="py-3.5 pl-2 text-center">
                        <button
                          onClick={() => handleRecordPayment(order)}
                          className="flex items-center gap-0.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full transition mx-auto"
                        >
                          <IndianRupee size={12} /> Record Payment
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && !loading && (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-400">
                      No pending payments found in this date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSave={handlePaymentSaved}
        defaultCustomerId={paymentCustomerId}
        defaultOrderId={paymentOrderId}
      />
    </div>
  );
}
