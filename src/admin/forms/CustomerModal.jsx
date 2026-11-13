import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { apiRequest } from '../api';

export default function CustomerModal({ isOpen, onClose, onSave, customer = null }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [defaultLocation, setDefaultLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setPhone(customer.phone || '');
      setDefaultLocation(customer.default_location || '');
      setNotes(customer.notes || '');
    } else {
      setName('');
      setPhone('');
      setDefaultLocation('');
      setNotes('');
    }
    setError('');
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Customer name is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        default_location: defaultLocation.trim() || null,
        notes: notes.trim() || null
      };

      let result;
      if (customer) {
        // Edit mode
        result = await apiRequest(`/api/customers/${customer.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        // Create mode
        result = await apiRequest('/api/customers', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      onSave(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[24px] border border-slate-200 bg-white p-6 shadow-soft relative animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <h3 className="font-display text-lg font-semibold text-slate-900">
            {customer ? 'Edit Customer Info' : 'Add New Customer'}
          </h3>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-600">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Customer Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aman Builders, Rahul Sharma"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9814361579"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Default Location / Site Address (Optional)
            </label>
            <input
              type="text"
              value={defaultLocation}
              onChange={(e) => setDefaultLocation(e.target.value)}
              placeholder="e.g. Sector 48, Mohali Phase 7"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Regular bulk buyer, construction contractor"
              rows={3}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm resize-none"
            />
          </div>

          {/* Action buttons */}
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
              {customer ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
