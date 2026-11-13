import { useState, useEffect } from 'react';
import { Search, Filter, X, Trash2, Plus, Loader2 } from 'lucide-react';
import { apiRequest } from './api';
import PaymentModal from './forms/PaymentModal';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Filters state
  const [search, setSearch] = useState('');
  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const fetchCustomers = async () => {
    try {
      const data = await apiRequest('/api/customers');
      setCustomers(data);
    } catch (e) {
      // Ignore
    }
  };

  const fetchPayments = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterCustomerId) params.append('customerId', filterCustomerId);
      if (filterPaymentMethod) params.append('paymentMethod', filterPaymentMethod);
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);

      const data = await apiRequest(`/api/payments?${params.toString()}`);
      setPayments(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch payments records.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [search, filterCustomerId, filterPaymentMethod, filterStartDate, filterEndDate]);

  const handleClearFilters = () => {
    setSearch('');
    setFilterCustomerId('');
    setFilterPaymentMethod('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const handleDeletePayment = async (payment) => {
    const msg = `Are you sure you want to delete Payment Receipt #${payment.id} for "${payment.customer_name}" worth ${formatCurrency(payment.amount)}?\n\nDeleting this payment will remove all order allocations associated with it. This order will revert to unpaid or partially paid status!`;
    if (confirm(msg)) {
      try {
        await apiRequest(`/api/payments/${payment.id}`, {
          method: 'DELETE'
        });
        fetchPayments();
      } catch (err) {
        alert(err.message || 'Failed to delete payment.');
      }
    }
  };

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
      {/* Search and Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Search */}
        <div className="relative max-w-md w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search payments by ID, customer name or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none ring-0 focus:border-blue-600 transition text-sm"
          />
        </div>

        <button
          onClick={() => setPaymentModalOpen(true)}
          className="flex justify-center items-center gap-2 px-5 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-sm shadow-soft"
        >
          <Plus size={16} /> Record Payment
        </button>
      </div>

      {/* Filter drawer */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Filter size={14} /> Filter Payments
          </h4>
          {(filterCustomerId || filterPaymentMethod || filterStartDate || filterEndDate) && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-0.5"
            >
              <X size={12} /> Clear Filters
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {/* Customer */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</label>
            <select
              value={filterCustomerId}
              onChange={(e) => setFilterCustomerId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 outline-none focus:border-blue-600 transition text-xs font-semibold text-slate-700"
            >
              <option value="">All Customers</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Method</label>
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 outline-none focus:border-blue-600 transition text-xs font-semibold text-slate-700"
            >
              <option value="">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From Date</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 outline-none focus:border-blue-600 transition text-xs font-semibold text-slate-700"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To Date</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 outline-none focus:border-blue-600 transition text-xs font-semibold text-slate-700"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* Payments Table */}
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
                  <th className="pb-3 pr-2">ID</th>
                  <th className="pb-3 px-2">Payment Date</th>
                  <th className="pb-3 px-2">Customer</th>
                  <th className="pb-3 px-2 text-right">Amount Received</th>
                  <th className="pb-3 px-2">Payment Method</th>
                  <th className="pb-3 px-2">Applied To</th>
                  <th className="pb-3 px-2">Notes</th>
                  <th className="pb-3 pl-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="py-3.5 pr-2 font-semibold text-slate-900">#{payment.id}</td>
                    <td className="py-3.5 px-2">{formatDate(payment.payment_date)}</td>
                    <td className="py-3.5 px-2 font-semibold text-slate-900">{payment.customer_name}</td>
                    <td className="py-3.5 px-2 text-right font-bold text-emerald-600">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="py-3.5 px-2 font-medium">{payment.payment_method}</td>
                    <td className="py-3.5 px-2 text-xs font-semibold">
                      {payment.allocated_order_id ? (
                        <span className="text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase">
                          Order #{payment.allocated_order_id}
                        </span>
                      ) : (
                        <span className="text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full uppercase">
                          Oldest (FIFO)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-2 text-slate-500 italic max-w-[150px] truncate" title={payment.notes}>
                      {payment.notes || '--'}
                    </td>
                    <td className="py-3.5 pl-2 text-center">
                      <button
                        onClick={() => handleDeletePayment(payment)}
                        className="p-1.5 rounded-lg border border-slate-200 text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete & Reverse Payment"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && !loading && (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400">
                      No payment receipts match your filters.
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
        onSave={fetchPayments}
      />
    </div>
  );
}
