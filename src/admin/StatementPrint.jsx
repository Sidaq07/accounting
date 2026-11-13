import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { apiRequest } from './api';

export default function StatementPrint() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const fromDate = searchParams.get('from') || '';
  const toDate = searchParams.get('to') || '';

  const [customer, setCustomer] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        const data = await apiRequest(`/api/customers/${id}`);
        setCustomer(data.customer);
        
        // Ledger is returned desc, we need it asc for chronological computations
        const rawLedger = [...data.ledger];
        rawLedger.reverse(); // now chronological ascending
        setLedger(rawLedger);
        setLoading(false);
      } catch (err) {
        setError('Failed to load statement ledger.');
        setLoading(false);
      }
    };
    fetchLedger();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-12 text-center bg-white h-screen">
        <p className="text-rose-600 font-semibold">{error || 'Customer not found.'}</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-full text-xs font-semibold">
          Go Back
        </button>
      </div>
    );
  }

  // Calculate opening balance & filtered transactions
  let openingBalance = 0;
  const filteredTransactions = [];
  let periodDebit = 0;
  let periodCredit = 0;

  ledger.forEach(item => {
    const itemDate = item.date;
    if (fromDate && itemDate < fromDate) {
      openingBalance += item.debit;
      openingBalance -= item.credit;
    } else if (toDate && itemDate > toDate) {
      // occur after end date, ignore for this statement period
    } else {
      filteredTransactions.push(item);
      periodDebit += item.debit;
      periodCredit += item.credit;
    }
  });

  // Calculate closing balance
  const closingBalance = openingBalance + periodDebit - periodCredit;

  // Build running balances starting from opening balance
  let runningBal = openingBalance;
  const tableRows = filteredTransactions.map(t => {
    runningBal += t.debit;
    runningBal -= t.credit;
    return {
      ...t,
      runningBalance: runningBal
    };
  });

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

  const getTodayDateString = () => {
    return new Date().toLocaleDateString('en-IN');
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:py-0 print:px-0">
      {/* Control bar */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-50 transition"
        >
          <ArrowLeft size={16} /> Back to Ledger
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 text-sm font-bold bg-blue-600 text-white rounded-xl px-5 py-2.5 hover:bg-blue-700 transition shadow-soft"
        >
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 p-8 sm:p-12 shadow-sm rounded-[24px] print:border-none print:shadow-none print:p-0 print:rounded-none">
        {/* Letterhead Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-start border-b-2 border-slate-900 pb-6 gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 uppercase tracking-tight">Rajindera Water Tanker</h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">Reliable Drinking & Construction Water Supply</p>
            <p className="text-xs text-slate-500 mt-2">Sector 48C, Chandigarh</p>
            <p className="text-xs text-slate-500">Phone: 098143 61579, 098721 54800</p>
          </div>
          <div className="sm:text-right text-xs text-slate-500">
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider mb-2">Customer Account Statement</h2>
            <p><span className="font-semibold text-slate-700">Generated Date:</span> {getTodayDateString()}</p>
            <p>
              <span className="font-semibold text-slate-700">Period:</span>{' '}
              {fromDate ? formatDate(fromDate) : 'Start'} to {toDate ? formatDate(toDate) : 'Today'}
            </p>
          </div>
        </div>

        {/* Customer Address Details */}
        <div className="my-8 grid gap-4 grid-cols-2 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Billing Statement For:</span>
            <p className="text-sm font-bold text-slate-900 capitalize">{customer.name}</p>
            {customer.phone && <p className="text-slate-600 mt-1">Phone: {customer.phone}</p>}
            {customer.default_location && <p className="text-slate-600">Site Location: {customer.default_location}</p>}
          </div>
          <div className="text-right flex flex-col justify-end">
            <p className="text-slate-700 font-semibold"><span className="text-slate-400">Opening Balance:</span> {formatCurrency(openingBalance)}</p>
            <p className="text-slate-700 font-semibold mt-1"><span className="text-slate-400">Total Period Charges:</span> {formatCurrency(periodDebit)}</p>
            <p className="text-slate-700 font-semibold mt-1"><span className="text-slate-400">Total Period Payments:</span> {formatCurrency(periodCredit)}</p>
            <p className="text-sm font-bold text-slate-900 mt-2 pt-2 border-t border-slate-200">
              Outstanding Balance: {formatCurrency(closingBalance)}
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="mt-8">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                <th className="pb-3 text-left">Date</th>
                <th className="pb-3 px-2">Type</th>
                <th className="pb-3 px-2">Description</th>
                <th className="pb-3 px-2">Site Location</th>
                <th className="pb-3 px-2 text-right">Debit (Charge)</th>
                <th className="pb-3 px-2 text-right">Credit (Payment)</th>
                <th className="pb-3 pl-2 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {/* Opening Balance Row */}
              <tr className="border-b border-slate-200 font-bold bg-slate-50/50">
                <td className="py-3 text-slate-500">--</td>
                <td className="py-3 px-2 text-slate-500">--</td>
                <td className="py-3 px-2 text-slate-800">Opening Balance Forward</td>
                <td className="py-3 px-2">--</td>
                <td className="py-3 px-2 text-right">--</td>
                <td className="py-3 px-2 text-right">--</td>
                <td className="py-3 pl-2 text-right text-slate-900">{formatCurrency(openingBalance)}</td>
              </tr>

              {/* Transaction list */}
              {tableRows.map((row) => (
                <tr key={row.id} className="border-b border-slate-200">
                  <td className="py-3 text-slate-500 whitespace-nowrap">{formatDate(row.date)}</td>
                  <td className="py-3 px-2 font-semibold uppercase text-[10px]">{row.type}</td>
                  <td className="py-3 px-2 text-slate-800">{row.description}</td>
                  <td className="py-3 px-2">{row.location || '--'}</td>
                  <td className="py-3 px-2 text-right font-semibold text-slate-900">
                    {row.debit > 0 ? formatCurrency(row.debit) : '--'}
                  </td>
                  <td className="py-3 px-2 text-right font-semibold text-emerald-600">
                    {row.credit > 0 ? formatCurrency(row.credit) : '--'}
                  </td>
                  <td className="py-3 pl-2 text-right font-bold text-slate-900">
                    {formatCurrency(row.runningBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ledger Bottom Totals Summary */}
        <div className="mt-12 border-t-2 border-slate-800 pt-6 grid grid-cols-3 gap-6 text-center text-xs">
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Statement Charges</span>
            <p className="text-base font-bold text-slate-900">{formatCurrency(periodDebit)}</p>
          </div>
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Statement Received</span>
            <p className="text-base font-bold text-emerald-600">{formatCurrency(periodCredit)}</p>
          </div>
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Statement Ending Due</span>
            <p className="text-base font-bold text-rose-600">{formatCurrency(closingBalance)}</p>
          </div>
        </div>

        {/* Footer Notes for Customers */}
        <div className="mt-16 border-t border-slate-200 pt-6 text-center text-[10px] text-slate-400 leading-relaxed font-semibold">
          <p>This is a computer generated statement of account for Rajindera Water Tanker.</p>
          <p className="mt-1">For any queries regarding billing or supply logistics, call us directly at 098143 61579.</p>
        </div>
      </div>
    </div>
  );
}
