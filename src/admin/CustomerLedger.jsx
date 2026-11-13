import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Phone, 
  MapPin, 
  Calendar, 
  IndianRupee, 
  MessageSquare, 
  Printer, 
  Plus, 
  ArrowLeft,
  Loader2,
  Trash2
} from 'lucide-react';
import { apiRequest } from './api';
import PaymentModal from './forms/PaymentModal';

export default function CustomerLedger() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  
  // Date statement filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const fetchLedgerData = async () => {
    try {
      const data = await apiRequest(`/api/customers/${id}`);
      setCustomer(data.customer);
      setLedger(data.ledger);
      setOrders(data.orders);
      setPayments(data.payments);
      setLoading(false);
    } catch (err) {
      setError('Failed to retrieve ledger statements.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgerData();
  }, [id]);

  const handlePaymentRecorded = () => {
    fetchLedgerData();
  };

  const handleDeletePayment = async (paymentId) => {
    if (confirm('Are you sure you want to delete this payment record? This will reverse all order allocations.')) {
      try {
        await apiRequest(`/api/payments/${paymentId}`, {
          method: 'DELETE'
        });
        fetchLedgerData();
      } catch (err) {
        alert(err.message || 'Failed to delete payment.');
      }
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (confirm('Are you sure you want to delete this order booking? Outstanding balances will update.')) {
      try {
        await apiRequest(`/api/orders/${orderId}`, {
          method: 'DELETE'
        });
        fetchLedgerData();
      } catch (err) {
        alert(err.message || 'Failed to delete order.');
      }
    }
  };

  // WhatsApp sender
  const handleSendWhatsApp = () => {
    if (!customer) return;
    
    const message = `*Rajindera Water Tanker*\n*Account Summary*\n\n*Customer:* ${customer.name}\n\n*Total Business:* ${formatCurrency(customer.total_business)}\n*Amount Received:* ${formatCurrency(customer.total_received)}\n*Outstanding Balance:* ${formatCurrency(customer.outstanding)}\n\nThank you.`;
    
    // Clear non-digits from phone
    const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, '') : '';
    // Append country code 91 if it's 10 digits
    const targetPhone = (cleanPhone.length === 10) ? `91${cleanPhone}` : cleanPhone;
    
    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  // Print Statement trigger
  const handlePrint = () => {
    // Navigate to a dedicated print screen or let window.print handle it.
    // We will navigate to /admin/statement-print/:customerId?from=...&to=... which renders a clean invoice page
    navigate(`/admin/statement-print/${id}?from=${fromDate}&to=${toDate}`);
  };

  // Currency Formatter
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.round(val));
  };

  // Date Formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Apply filters on the ledger
  const filteredLedger = ledger.filter(item => {
    if (fromDate && item.date < fromDate) return false;
    if (toDate && item.date > toDate) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-600">
        <p className="font-semibold">{error || 'Customer not found.'}</p>
        <button onClick={() => navigate('/admin/customers')} className="mt-4 flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
          <ArrowLeft size={16} /> Back to Customer List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in print:p-0">
      {/* Top back navigation */}
      <div className="flex justify-between items-center print:hidden">
        <button 
          onClick={() => navigate('/admin/customers')} 
          className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft size={16} /> Back to Customer Directory
        </button>

        <div className="flex gap-2">
          <button
            onClick={handleSendWhatsApp}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 transition text-xs"
          >
            <MessageSquare size={14} /> WhatsApp Statement
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-blue-200 bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition text-xs"
          >
            <Printer size={14} /> Print Statement
          </button>
          <button
            onClick={() => setPaymentModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-xs shadow-soft"
          >
            <Plus size={14} /> Record Payment
          </button>
        </div>
      </div>

      {/* Customer Header info */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 capitalize">{customer.name}</h2>
          <p className="text-xs text-slate-400 font-medium mt-1">Customer Account Reference ID: #{customer.id}</p>
          
          <div className="mt-6 space-y-2.5 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-slate-400" />
              <span>{customer.phone || 'No phone number'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-slate-400" />
              <span>{customer.default_location || 'No default address'}</span>
            </div>
            {customer.notes && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl mt-3 text-xs leading-relaxed text-slate-500">
                <span className="font-bold block text-[10px] uppercase text-slate-400 mb-1">Internal Notes:</span>
                {customer.notes}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Aggregates Card */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 p-5 rounded-2xl h-fit">
          <div className="border-r border-slate-200/60 pr-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-800">{customer.total_orders}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Business</p>
            <p className="mt-2 text-2xl font-extrabold text-blue-600">{formatCurrency(customer.total_business)}</p>
          </div>
          <div className="border-t border-r border-slate-200/60 pt-3 pr-2 mt-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Received</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-600">{formatCurrency(customer.total_received)}</p>
          </div>
          <div className="border-t border-slate-200/60 pt-3 mt-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Balance</p>
            <p className={`mt-2 text-2xl font-extrabold ${customer.outstanding > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {formatCurrency(customer.outstanding)}
            </p>
          </div>
        </div>
      </div>

      {/* Statement Date Range Filters */}
      <div className="bg-white border border-slate-200 rounded-[20px] p-5 shadow-sm print:hidden flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statement From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-600 transition text-sm"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statement To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-600 transition text-sm"
          />
        </div>
        {(fromDate || toDate) && (
          <button 
            onClick={() => { setFromDate(''); setToDate(''); }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition h-[38px]"
          >
            Clear Date Range
          </button>
        )}
      </div>

      {/* Ledger statement list */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
        <h3 className="font-display font-semibold text-slate-900 text-base mb-6">Account Transaction History</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pr-2">Date</th>
                <th className="pb-3 px-2">Type</th>
                <th className="pb-3 px-2">Description</th>
                <th className="pb-3 px-2">Delivery Location</th>
                <th className="pb-3 px-2 text-right">Debit (Charge)</th>
                <th className="pb-3 px-2 text-right">Credit (Paid)</th>
                <th className="pb-3 px-2 text-right">Running Balance</th>
                <th className="pb-3 px-2 text-center">Status</th>
                <th className="pb-3 pl-2 text-center print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.map((tx) => {
                let rowColor = '';
                let statusColor = 'text-slate-500 bg-slate-100';
                
                if (tx.type === 'Order') {
                  rowColor = '';
                  if (tx.payment_status === 'Paid') statusColor = 'text-emerald-700 bg-emerald-50';
                  else if (tx.payment_status === 'Unpaid') statusColor = 'text-rose-700 bg-rose-50';
                  else if (tx.payment_status === 'Partially Paid') statusColor = 'text-amber-700 bg-amber-50';
                } else if (tx.type === 'Payment') {
                  rowColor = 'bg-emerald-50/20';
                  statusColor = '';
                }

                return (
                  <tr key={tx.id} className={`border-b border-slate-100 hover:bg-slate-50/50 transition ${rowColor}`}>
                    <td className="py-3.5 pr-2 font-medium">{formatDate(tx.date)}</td>
                    <td className="py-3.5 px-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-3xs font-bold uppercase ${
                        tx.type === 'Order' ? 'text-blue-700 bg-blue-50' : 'text-emerald-700 bg-emerald-50'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 font-medium text-slate-800">{tx.description}</td>
                    <td className="py-3.5 px-2 truncate max-w-[120px]">{tx.location || '--'}</td>
                    <td className="py-3.5 px-2 text-right font-semibold text-slate-900">
                      {tx.debit > 0 ? formatCurrency(tx.debit) : '--'}
                    </td>
                    <td className="py-3.5 px-2 text-right font-semibold text-emerald-600">
                      {tx.credit > 0 ? formatCurrency(tx.credit) : '--'}
                    </td>
                    <td className="py-3.5 px-2 text-right font-bold text-slate-900">
                      {formatCurrency(tx.runningBalance)}
                    </td>
                    <td className="py-3.5 px-2 text-center">
                      {tx.type === 'Order' ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-3xs font-bold uppercase ${statusColor}`}>
                          {tx.payment_status}
                        </span>
                      ) : '--'}
                    </td>
                    <td className="py-3.5 pl-2 text-center print:hidden">
                      {tx.type === 'Order' ? (
                        <button 
                          onClick={() => handleDeleteOrder(tx.dbId)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                          title="Delete Order"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleDeletePayment(tx.dbId)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                          title="Delete/Reverse Payment"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredLedger.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    No transactions recorded for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Bottom Totals */}
        <div className="mt-8 border-t border-slate-100 pt-6 grid gap-4 sm:grid-cols-3 text-center bg-slate-50 p-4 rounded-2xl">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Business Logged</p>
            <p className="mt-1.5 text-lg font-bold text-blue-600">{formatCurrency(customer.total_business)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Payments Received</p>
            <p className="mt-1.5 text-lg font-bold text-emerald-600">{formatCurrency(customer.total_received)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Balance</p>
            <p className={`mt-1.5 text-lg font-bold ${customer.outstanding > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {formatCurrency(customer.outstanding)}
            </p>
          </div>
        </div>
      </div>

      {/* Record Payment pre-filled Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSave={handlePaymentRecorded}
        defaultCustomerId={id}
      />
    </div>
  );
}
