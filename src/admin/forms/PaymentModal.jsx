import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { apiRequest } from '../api';

export default function PaymentModal({ isOpen, onClose, onSave, defaultCustomerId = '', defaultOrderId = '' }) {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  
  // Outstanding orders of the selected customer for manual allocation override
  const [unpaidOrders, setUnpaidOrders] = useState([]);
  const [allocatedOrderId, setAllocatedOrderId] = useState('');
  const [loadingLedger, setLoadingLedger] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper to format today's date in YYYY-MM-DD
  const getTodayDateString = () => {
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    return formatter.format(new Date());
  };

  // Fetch customers list
  const fetchCustomers = async () => {
    try {
      const data = await apiRequest('/api/customers');
      setCustomers(data);
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      setSelectedCustomerId(defaultCustomerId);
      setAmount('');
      setPaymentDate(getTodayDateString());
      setPaymentMethod('Cash');
      setNotes('');
      setAllocatedOrderId(defaultOrderId ? String(defaultOrderId) : '');
      setUnpaidOrders([]);
      setError('');
    }
  }, [isOpen, defaultCustomerId, defaultOrderId]);

  // Fetch outstanding orders when selected customer changes
  useEffect(() => {
    if (selectedCustomerId) {
      const fetchCustomerOrders = async () => {
        setLoadingLedger(true);
        try {
          const data = await apiRequest(`/api/customers/${selectedCustomerId}`);
          // Filter out orders that are already fully paid
          const outstanding = data.orders.filter(o => o.payment_status !== 'Paid');
          setUnpaidOrders(outstanding);
          
          if (defaultOrderId && outstanding.some(o => String(o.id) === String(defaultOrderId))) {
            setAllocatedOrderId(String(defaultOrderId));
            const targetOrder = outstanding.find(o => String(o.id) === String(defaultOrderId));
            if (targetOrder) {
              setAmount(String(targetOrder.balance));
            }
          }
        } catch (err) {
          console.error('Error fetching customer details for payment allocation:', err);
        } finally {
          setLoadingLedger(false);
        }
      };
      fetchCustomerOrders();
    } else {
      setUnpaidOrders([]);
      setAllocatedOrderId('');
    }
  }, [selectedCustomerId, defaultOrderId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedCustomerId) {
      setError('Please select a customer.');
      return;
    }
    if (amount === '' || parseFloat(amount) <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }
    if (!paymentDate) {
      setError('Please select a payment date.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        amount: parseFloat(amount),
        paymentDate,
        paymentMethod,
        notes: notes.trim() || null,
        allocatedOrderId: allocatedOrderId || null
      };

      const result = await apiRequest('/api/payments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      onSave(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg rounded-[24px] border border-slate-200 bg-white p-6 shadow-soft relative animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <h3 className="font-display text-lg font-semibold text-slate-900">
            Record Customer Payment
          </h3>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 transition"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Select Customer *
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Received */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Amount Received (₹) *
            </label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm"
            />
          </div>

          {/* Date & Payment Method */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Allocation Override */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              Apply Payment to Order
              {loadingLedger && <Loader2 size={12} className="animate-spin text-blue-600" />}
            </label>
            <select
              value={allocatedOrderId}
              onChange={(e) => setAllocatedOrderId(e.target.value)}
              disabled={!selectedCustomerId || unpaidOrders.length === 0}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Apply to oldest unpaid orders first (FIFO)</option>
              {unpaidOrders.map(o => (
                <option key={o.id} value={o.id}>
                  Order #{o.id} ({o.order_date}) - {o.delivery_location} [Owes: ₹{o.balance}]
                </option>
              ))}
            </select>
            {selectedCustomerId && unpaidOrders.length === 0 && !loadingLedger && (
              <p className="mt-1 text-xs text-emerald-600 font-semibold">
                Customer has no unpaid orders. This payment will be credited as an advance payment.
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Notes / Transaction ID (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. UPI Ref: 123456789, Cheque clearance pending"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-100 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-sm disabled:bg-slate-300 shadow-soft"
            >
              {loading && <Loader2 className="animate-spin" size={14} />}
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
