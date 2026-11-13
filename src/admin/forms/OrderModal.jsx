import { useState, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { apiRequest } from '../api';
import CustomerModal from './CustomerModal';

export default function OrderModal({ isOpen, onClose, onSave, order = null }) {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [tankerType, setTankerType] = useState('Normal');
  const [useType, setUseType] = useState('Filled');
  const [quantity, setQuantity] = useState('1');
  const [filledQty, setFilledQty] = useState('1');
  const [standbyQty, setStandbyQty] = useState('0');
  const [price, setPrice] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [notes, setNotes] = useState('');
  
  // Payment fields (only used during creation)
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');
  const [amountPaid, setAmountPaid] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

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
      if (order) {
        setSelectedCustomerId(order.customer_id || '');
        setDeliveryLocation(order.delivery_location || '');
        setTankerType(order.tanker_type || 'Normal');
        setUseType(order.use_type || 'Filled');
        setQuantity(String(order.quantity || 1));
        const breakdown = order.use_breakdown ? JSON.parse(order.use_breakdown) : {};
        const hasMixed = Number(breakdown.filled || 0) > 0 && Number(breakdown.standby || 0) > 0;
        setUseType(hasMixed ? 'Mixed' : (order.use_type || 'Filled'));
        setFilledQty(String(breakdown.filled || (order.use_type === 'Filled' ? order.quantity || 1 : 0)));
        setStandbyQty(String(breakdown.standby || (order.use_type === 'Standby' ? order.quantity || 1 : 0)));
        setPrice(String(order.price) || '');
        setOrderDate(order.order_date || '');
        setNotes(order.notes || '');
      } else {
        setSelectedCustomerId('');
        setDeliveryLocation('');
        setTankerType('Normal');
        setUseType('Filled');
        setQuantity('1');
        setFilledQty('1');
        setStandbyQty('0');
        setPrice('1500'); // Reasonable default tanker price
        setOrderDate(getTodayDateString());
        setNotes('');
        setPaymentStatus('Unpaid');
        setAmountPaid('0');
        setPaymentMethod('Cash');
      }
      setError('');
    }
  }, [order, isOpen]);

  // When customer changes, autofill their default location if empty
  useEffect(() => {
    if (!order && selectedCustomerId) {
      const customer = customers.find(c => String(c.id) === String(selectedCustomerId));
      if (customer && customer.default_location) {
        setDeliveryLocation(customer.default_location);
      }
    }
  }, [selectedCustomerId, customers, order]);

  // Auto-fill amount paid based on payment status selection
  useEffect(() => {
    if (paymentStatus === 'Paid' && price) {
      setAmountPaid(price);
    } else if (paymentStatus === 'Unpaid') {
      setAmountPaid('0');
    }
  }, [paymentStatus, price]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedCustomerId) {
      setError('Please select a customer.');
      return;
    }
    if (!deliveryLocation.trim()) {
      setError('Please enter a delivery location.');
      return;
    }
    const qtyNum = Number(quantity) || 0;
    if (!Number.isInteger(qtyNum) || qtyNum < 1) {
      setError('Please enter a valid quantity greater than 0.');
      return;
    }
    if (price === '' || parseFloat(price) < 0) {
      setError('Please enter a valid positive price.');
      return;
    }
    if (!orderDate) {
      setError('Please select an order date.');
      return;
    }

    const mixedBreakdown = useType === 'Mixed'
      ? { filled: Number(filledQty) || 0, standby: Number(standbyQty) || 0 }
      : null;

    if (useType === 'Mixed') {
      const filled = Number(filledQty) || 0;
      const standby = Number(standbyQty) || 0;
      if (filled + standby !== qtyNum) {
        setError('For a mixed order, the filled and standby quantities must add up to the total tanker quantity.');
        return;
      }
    }

    setLoading(true);
    try {
      const prcNum = parseFloat(price);
      let result;

      if (order) {
        const payload = {
          customerId: selectedCustomerId,
          deliveryLocation: deliveryLocation.trim(),
          tankerType,
          useType,
          quantity: qtyNum,
          useBreakdown: mixedBreakdown,
          price: prcNum,
          orderDate,
          notes: notes.trim() || null
        };
        result = await apiRequest(`/api/orders/${order.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        const amtPaidNum = parseFloat(amountPaid) || 0;
        if (paymentStatus === 'Partially Paid' && (amtPaidNum <= 0 || amtPaidNum >= prcNum)) {
          throw new Error('Partially Paid amount must be greater than 0 and less than price.');
        }

        const payload = {
          customerId: selectedCustomerId,
          deliveryLocation: deliveryLocation.trim(),
          tankerType,
          useType,
          quantity: qtyNum,
          useBreakdown: mixedBreakdown,
          price: prcNum,
          orderDate,
          paymentStatus,
          amountPaid: paymentStatus === 'Unpaid' ? 0 : amtPaidNum,
          paymentMethod: paymentStatus === 'Unpaid' ? null : paymentMethod,
          notes: notes.trim() || null
        };
        result = await apiRequest('/api/orders', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      onSave(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save order.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerCreated = (newCustomer) => {
    // Refresh customers and auto-select new customer
    setCustomers(prev => [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedCustomerId(newCustomer.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg rounded-[24px] border border-slate-200 bg-white p-6 shadow-soft relative my-8 animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <h3 className="font-display text-lg font-semibold text-slate-900">
            {order ? `Edit Order #${order.id}` : 'Add Tanker Order'}
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
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Select Customer *
              </label>
              <button
                type="button"
                onClick={() => setCustomerModalOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
              >
                <Plus size={14} /> Add New Customer
              </button>
            </div>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              disabled={!!order} // Prevent changing customer for existing order directly
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Delivery Location */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Delivery Location *
            </label>
            <input
              type="text"
              required
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              placeholder="e.g. Sector 48C, Chandigarh Construction Site"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm"
            />
          </div>

          {/* Quantity, Tanker Type & Use Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Tanker Quantity
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Tanker Type
              </label>
              <select
                value={tankerType}
                onChange={(e) => setTankerType(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm"
              >
                <option value="Normal">Normal</option>
                <option value="Motor">Motor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Order Type / Use
            </label>
            <select
              value={useType}
              onChange={(e) => setUseType(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm"
            >
              <option value="Filled">Filled</option>
              <option value="Standby">Standby</option>
              <option value="Mixed">Mixed (Filled + Standby)</option>
            </select>
          </div>

          {useType === 'Mixed' && (
            <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Filled Tankers
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={filledQty}
                  onChange={(e) => setFilledQty(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Standby Tankers
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={standbyQty}
                  onChange={(e) => setStandbyQty(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm"
                />
              </div>
            </div>
          )}

          {/* Price & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Price (₹) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1500"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Delivery Date *
              </label>
              <input
                type="date"
                required
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm"
              />
            </div>
          </div>

          {/* Payment Section (ONLY displayed when creating a new order) */}
          {!order && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Immediate Payment Setting</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-600 transition text-sm font-medium"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>

                {paymentStatus !== 'Unpaid' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-600 transition text-sm font-medium"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}
              </div>

              {paymentStatus === 'Partially Paid' && (
                <div>
                  <label className="text-xs font-semibold text-slate-600">Amount Received (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    max={price ? parseFloat(price) - 1 : 99999}
                    required
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="e.g. 500"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-600 transition text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Notes / Remarks (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sent driver Ramesh, payment pending on verification"
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
              {order ? 'Save Updates' : 'Add Order'}
            </button>
          </div>
        </form>

        {/* Embedded Add Customer Dialog */}
        <CustomerModal
          isOpen={customerModalOpen}
          onClose={() => setCustomerModalOpen(false)}
          onSave={handleCustomerCreated}
        />
      </div>
    </div>
  );
}
