import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  Edit2, 
  Trash2, 
  IndianRupee, 
  Plus, 
  Loader2 
} from 'lucide-react';
import { apiRequest } from './api';
import OrderModal from './forms/OrderModal';
import PaymentModal from './forms/PaymentModal';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterTankerType, setFilterTankerType] = useState('');
  const [filterUseType, setFilterUseType] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentCustomerId, setPaymentCustomerId] = useState('');
  const [paymentOrderId, setPaymentOrderId] = useState('');

  const fetchCustomers = async () => {
    try {
      const data = await apiRequest('/api/customers');
      setCustomers(data);
    } catch (e) {
      // Ignore silent error
    }
  };

  const fetchOrders = async () => {
    try {
      // Build query string
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterCustomerId) params.append('customerId', filterCustomerId);
      if (filterLocation) params.append('location', filterLocation);
      if (filterTankerType) params.append('tankerType', filterTankerType);
      if (filterUseType) params.append('useType', filterUseType);
      if (filterPaymentStatus) params.append('paymentStatus', filterPaymentStatus);
      if (filterPaymentMethod) params.append('paymentMethod', filterPaymentMethod);
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);

      const data = await apiRequest(`/api/orders?${params.toString()}`);
      setOrders(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch orders ledger.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [
    search,
    filterCustomerId,
    filterLocation,
    filterTankerType,
    filterUseType,
    filterPaymentStatus,
    filterPaymentMethod,
    filterStartDate,
    filterEndDate
  ]);

  const handleClearFilters = () => {
    setSearch('');
    setFilterCustomerId('');
    setFilterLocation('');
    setFilterTankerType('');
    setFilterUseType('');
    setFilterPaymentStatus('');
    setFilterPaymentMethod('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const handleAddOrder = () => {
    setSelectedOrder(null);
    setOrderModalOpen(true);
  };

  const handleEditOrder = (order) => {
    setSelectedOrder(order);
    setOrderModalOpen(true);
  };

  const handleDeleteOrder = async (order) => {
    const msg = `Are you sure you want to delete Order #${order.id} for "${order.customer_name}"?\n\nDeleting this order booking will reverse any payments allocated to it and recalculate outstanding balances.`;
    if (confirm(msg)) {
      try {
        await apiRequest(`/api/orders/${order.id}`, { method: 'DELETE' });
        fetchOrders();
      } catch (err) {
        alert(err.message || 'Failed to delete order.');
      }
    }
  };

  const handleRecordPayment = (order) => {
    setPaymentCustomerId(order.customer_id);
    setPaymentOrderId(order.id);
    setPaymentModalOpen(true);
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
      {/* Action Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Search */}
        <div className="relative max-w-md w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search by ID, customer name, location or date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none ring-0 focus:border-blue-600 transition text-sm"
          />
        </div>

        <button
          onClick={handleAddOrder}
          className="flex justify-center items-center gap-2 px-5 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-sm shadow-soft"
        >
          <Plus size={16} /> Add Tanker Order
        </button>
      </div>

      {/* Advanced Filter Collapsible Panel */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Filter size={14} /> Filter Bookings
          </h4>
          {(filterCustomerId || filterLocation || filterTankerType || filterUseType || filterPaymentStatus || filterPaymentMethod || filterStartDate || filterEndDate) && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-0.5"
            >
              <X size={12} /> Clear Filters
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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

          {/* Location */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Site</label>
            <input
              type="text"
              placeholder="e.g. Sector 34"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 outline-none focus:border-blue-600 transition text-xs font-semibold text-slate-700"
            />
          </div>

          {/* Tanker Type */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanker Type</label>
            <select
              value={filterTankerType}
              onChange={(e) => setFilterTankerType(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 outline-none focus:border-blue-600 transition text-xs font-semibold text-slate-700"
            >
              <option value="">All Fleet</option>
              <option value="Normal">Normal</option>
              <option value="Motor">Motor</option>
            </select>
          </div>

          {/* Use Type */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Use Type</label>
            <select
              value={filterUseType}
              onChange={(e) => setFilterUseType(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 outline-none focus:border-blue-600 transition text-xs font-semibold text-slate-700"
            >
              <option value="">All Uses</option>
              <option value="Filled">Filled</option>
              <option value="Standby">Standby</option>
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Status</label>
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 outline-none focus:border-blue-600 transition text-xs font-semibold text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Unpaid">Unpaid</option>
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
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 outline-none focus:border-blue-600 transition text-xs font-semibold text-slate-700 animate-none"
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

      {/* Orders Grid Table */}
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
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 px-2">Customer</th>
                  <th className="pb-3 px-2">Delivery Location</th>
                  <th className="pb-3 px-2">Qty</th>
                  <th className="pb-3 px-2">Tanker</th>
                  <th className="pb-3 px-2">Use</th>
                  <th className="pb-3 px-2 text-right">Price</th>
                  <th className="pb-3 px-2 text-right">Received</th>
                  <th className="pb-3 px-2 text-right">Balance</th>
                  <th className="pb-3 px-2 text-center">Status</th>
                  <th className="pb-3 pl-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  let statusColor = 'text-slate-500 bg-slate-100';
                  if (order.payment_status === 'Paid') statusColor = 'text-emerald-700 bg-emerald-50';
                  else if (order.payment_status === 'Unpaid') statusColor = 'text-rose-700 bg-rose-50';
                  else if (order.payment_status === 'Partially Paid') statusColor = 'text-amber-700 bg-amber-50';

                  const hasOutstanding = order.balance > 0;

                  return (
                    <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                      <td className="py-3.5 pr-2 font-semibold text-slate-900">#{order.id}</td>
                      <td className="py-3.5 px-2">{formatDate(order.order_date)}</td>
                      <td className="py-3.5 px-2 font-semibold text-slate-900">{order.customer_name}</td>
                      <td className="py-3.5 px-2 truncate max-w-[130px]" title={order.delivery_location}>
                        {order.delivery_location}
                      </td>
                      <td className="py-3.5 px-2">{order.quantity || 1}</td>
                      <td className="py-3.5 px-2">{order.tanker_type}</td>
                      <td className="py-3.5 px-2">{order.display_use_type || order.use_type}</td>
                      <td className="py-3.5 px-2 text-right font-bold text-slate-900">
                        {formatCurrency(order.price)}
                      </td>
                      <td className="py-3.5 px-2 text-right font-semibold text-emerald-600">
                        {formatCurrency(order.amount_paid)}
                      </td>
                      <td className={`py-3.5 px-2 text-right font-bold ${hasOutstanding ? 'text-rose-600' : 'text-slate-800'}`}>
                        {formatCurrency(order.balance)}
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${statusColor}`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="py-3.5 pl-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {hasOutstanding && (
                            <button
                              onClick={() => handleRecordPayment(order)}
                              className="flex items-center gap-0.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg transition"
                              title="Record Payment"
                            >
                              <IndianRupee size={12} /> Pay
                            </button>
                          )}
                          <button
                            onClick={() => handleEditOrder(order)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
                            title="Edit Booking"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            className="p-1.5 rounded-lg border border-slate-200 text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Booking"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && !loading && (
                  <tr>
                    <td colSpan="11" className="py-8 text-center text-slate-400">
                      No order bookings match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <OrderModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        onSave={fetchOrders}
        order={selectedOrder}
      />
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSave={fetchOrders}
        defaultCustomerId={paymentCustomerId}
        defaultOrderId={paymentOrderId}
      />
    </div>
  );
}
