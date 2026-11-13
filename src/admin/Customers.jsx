import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Eye, User, Phone, MapPin, Loader2 } from 'lucide-react';
import { apiRequest } from './api';
import CustomerModal from './forms/CustomerModal';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const navigate = useNavigate();

  const fetchCustomers = async () => {
    try {
      const data = await apiRequest('/api/customers');
      setCustomers(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch customers.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleEditClick = (customer) => {
    setSelectedCustomer(customer);
    setModalOpen(true);
  };

  const handleAddClick = () => {
    setSelectedCustomer(null);
    setModalOpen(true);
  };

  const handleDeleteClick = async (customer) => {
    const message = `Are you absolutely sure you want to delete "${customer.name}"?\n\nThis will PERMANENTLY delete their entire profile, including all of their order bookings and payment history. This action cannot be undone!`;
    if (confirm(message)) {
      try {
        await apiRequest(`/api/customers/${customer.id}`, {
          method: 'DELETE'
        });
        setCustomers(prev => prev.filter(c => c.id !== customer.id));
      } catch (err) {
        alert(err.message || 'Failed to delete customer.');
      }
    }
  };

  const handleSave = () => {
    fetchCustomers();
  };

  // Filter customers by search term
  const filteredCustomers = customers.filter(c => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      c.name.toLowerCase().includes(term) ||
      (c.phone && c.phone.includes(term)) ||
      (c.default_location && c.default_location.toLowerCase().includes(term))
    );
  });

  // Indian currency formatter
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.round(val));
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Search bar */}
        <div className="relative max-w-md w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search customers by name, phone or site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none ring-0 focus:border-blue-600 transition text-sm"
          />
        </div>

        <button
          onClick={handleAddClick}
          className="flex justify-center items-center gap-2 px-5 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-sm shadow-soft"
        >
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* Grid listing */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCustomers.map(customer => (
          <div 
            key={customer.id} 
            className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-col justify-between hover:border-blue-200 transition"
          >
            <div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <User size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 leading-tight">{customer.name}</h3>
                    <p className="text-xs text-slate-400 font-medium">Customer ID: #{customer.id}</p>
                  </div>
                </div>
                
                {/* Account status badge */}
                <span className={`px-2 py-0.5 rounded-full text-3xs font-bold uppercase ${
                  customer.outstanding > 0 
                    ? 'text-rose-700 bg-rose-50 border border-rose-100' 
                    : 'text-emerald-700 bg-emerald-50 border border-emerald-100'
                }`}>
                  {customer.account_status}
                </span>
              </div>

              {/* Details list */}
              <div className="mt-5 space-y-2 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400 shrink-0" />
                  <span>{customer.phone || 'No phone recorded'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{customer.default_location || 'No location recorded'}</span>
                </div>
              </div>

              {/* Outstanding overview */}
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Business Logged</p>
                  <p className="mt-1 font-semibold text-slate-800 text-base">{formatCurrency(customer.total_business)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding</p>
                  <p className={`mt-1 font-bold text-base ${customer.outstanding > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {formatCurrency(customer.outstanding)}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions footer */}
            <div className="mt-6 flex justify-between gap-2 border-t border-slate-100 pt-4">
              <button
                onClick={() => navigate(`/admin/customers/${customer.id}`)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-xl transition"
              >
                <Eye size={14} /> Ledger Summary
              </button>
              
              <div className="flex gap-1">
                <button
                  onClick={() => handleEditClick(customer)}
                  className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
                  aria-label="Edit customer"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDeleteClick(customer)}
                  className="p-2 rounded-xl border border-slate-200 text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition"
                  aria-label="Delete customer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full bg-white border border-slate-200 rounded-[24px] p-12 text-center text-slate-400">
            No customers match your search criteria.
          </div>
        )}
      </div>

      {/* Forms */}
      <CustomerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        customer={selectedCustomer}
      />
    </div>
  );
}
