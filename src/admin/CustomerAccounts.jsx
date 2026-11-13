import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ArrowUpDown, Loader2 } from 'lucide-react';
import { apiRequest } from './api';

export default function CustomerAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [sortBy, setSortBy] = useState('highest_outstanding');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const fetchAccounts = async () => {
    try {
      const data = await apiRequest('/api/customers');
      setAccounts(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch accounts data.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Sort logic
  const sortedAccounts = [...accounts].sort((a, b) => {
    switch (sortBy) {
      case 'highest_outstanding':
        return b.outstanding - a.outstanding;
      case 'lowest_outstanding':
        return a.outstanding - b.outstanding;
      case 'highest_business':
        return b.total_business - a.total_business;
      case 'most_orders':
        return b.total_orders - a.total_orders;
      case 'customer_name':
        return a.name.localeCompare(b.name);
      case 'recent_orders':
        return new Date(b.last_order_date || 0) - new Date(a.last_order_date || 0);
      default:
        return 0;
    }
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.round(val));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No orders yet';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm animate-fade-in space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-display font-semibold text-slate-900 text-lg">Customer Account Balances</h3>
          <p className="text-xs text-slate-400 mt-1">Reviewing aggregates of invoices and credit payments per customer</p>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <ArrowUpDown size={14} /> Sort By:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-600 transition text-sm font-semibold text-slate-700"
          >
            <option value="highest_outstanding">Highest Outstanding</option>
            <option value="lowest_outstanding">Lowest Outstanding</option>
            <option value="highest_business">Highest Business</option>
            <option value="most_orders">Most Orders</option>
            <option value="customer_name">Customer Name</option>
            <option value="recent_orders">Recent Orders</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* Accounts Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th className="pb-3 pr-2">Customer Name</th>
              <th className="pb-3 px-2">Phone</th>
              <th className="pb-3 px-2 text-center">Total Orders</th>
              <th className="pb-3 px-2 text-right">Total Business</th>
              <th className="pb-3 px-2 text-right">Amount Received</th>
              <th className="pb-3 px-2 text-right">Outstanding</th>
              <th className="pb-3 px-2">Last Order</th>
              <th className="pb-3 px-2 text-center">Account Status</th>
              <th className="pb-3 pl-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedAccounts.map((account) => {
              const hasOutstanding = account.outstanding > 0;
              return (
                <tr key={account.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                  <td className="py-3.5 pr-2 font-semibold text-slate-900">{account.name}</td>
                  <td className="py-3.5 px-2">{account.phone || '--'}</td>
                  <td className="py-3.5 px-2 text-center font-semibold text-slate-800">{account.total_orders}</td>
                  <td className="py-3.5 px-2 text-right font-semibold text-slate-900">{formatCurrency(account.total_business)}</td>
                  <td className="py-3.5 px-2 text-right font-semibold text-emerald-600">{formatCurrency(account.total_received)}</td>
                  <td className={`py-3.5 px-2 text-right font-bold ${hasOutstanding ? 'text-rose-600' : 'text-slate-900'}`}>
                    {formatCurrency(account.outstanding)}
                  </td>
                  <td className="py-3.5 px-2 text-slate-500">{formatDate(account.last_order_date)}</td>
                  <td className="py-3.5 px-2 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-3xs font-bold uppercase ${
                      hasOutstanding 
                        ? 'text-rose-700 bg-rose-50 border border-rose-100' 
                        : 'text-emerald-700 bg-emerald-50 border border-emerald-100'
                    }`}>
                      {account.account_status}
                    </span>
                  </td>
                  <td className="py-3.5 pl-2 text-center">
                    <button
                      onClick={() => navigate(`/admin/customers/${account.id}`)}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition mx-auto"
                    >
                      <Eye size={12} /> View Ledger
                    </button>
                  </td>
                </tr>
              );
            })}
            {sortedAccounts.length === 0 && (
              <tr>
                <td colSpan="9" className="py-8 text-center text-slate-400">
                  No accounts found. Create a customer or order first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
