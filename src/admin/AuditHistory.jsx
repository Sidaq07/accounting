import { useState, useEffect } from 'react';
import { History, Eye, EyeOff, Loader2 } from 'lucide-react';
import { apiRequest } from './api';

export default function AuditHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchLogs = async () => {
    try {
      const data = await apiRequest('/api/audit?limit=100');
      setLogs(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch audit log trail.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const toggleExpand = (id) => {
    if (expandedLogId === id) {
      setExpandedLogId(null);
    } else {
      setExpandedLogId(id);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    // Format is YYYY-MM-DD HH:MM:SS from SQLite UTC
    const date = new Date(dateStr.replace(' ', 'T') + 'Z'); // parse as UTC
    return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  };

  const getActionBadge = (action) => {
    let color = 'bg-slate-100 text-slate-700';
    if (action.startsWith('CREATE')) color = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
    else if (action.startsWith('EDIT')) color = 'bg-blue-50 text-blue-700 border border-blue-100';
    else if (action.startsWith('DELETE') || action.includes('REVERSE')) color = 'bg-rose-50 text-rose-700 border border-rose-100';
    else if (action.includes('PASSWORD')) color = 'bg-amber-50 text-amber-700 border border-amber-100';
    
    return (
      <span className={`inline-flex px-2.5 py-1 rounded-full text-3xs font-bold uppercase tracking-wider ${color}`}>
        {action.replace('_', ' ')}
      </span>
    );
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
      <div>
        <h3 className="font-display font-semibold text-slate-900 text-lg flex items-center gap-2">
          <History size={20} className="text-slate-500" /> Administrative Audit Trail
        </h3>
        <p className="text-xs text-slate-400 mt-1">Reviewing the last 100 system edits and deletion records for verification</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* Logs list */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th className="pb-3 pr-2">Date/Time (IST)</th>
              <th className="pb-3 px-2">Operator</th>
              <th className="pb-3 px-2">Operation type</th>
              <th className="pb-3 px-2 text-center">Affected ID</th>
              <th className="pb-3 pl-2 text-center">Inspect</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <>
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition">
                    <td className="py-3.5 pr-2 font-medium text-slate-500">{formatDate(log.created_at)}</td>
                    <td className="py-3.5 px-2 font-semibold text-slate-800 capitalize">{log.username}</td>
                    <td className="py-3.5 px-2">{getActionBadge(log.action)}</td>
                    <td className="py-3.5 px-2 text-center font-bold text-slate-600">#{log.record_id}</td>
                    <td className="py-3.5 pl-2 text-center">
                      <button
                        onClick={() => toggleExpand(log.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition"
                      >
                        {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </td>
                  </tr>
                  {/* Expanded JSON diff area */}
                  {isExpanded && (
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <td colSpan="5" className="p-4">
                        <div className="grid gap-4 md:grid-cols-2 text-xs">
                          <div>
                            <span className="font-bold text-[10px] uppercase text-slate-400 block mb-1">Previous state (Old)</span>
                            <pre className="p-3 bg-white border border-slate-200 rounded-xl overflow-x-auto font-mono max-h-48 text-slate-600 leading-relaxed">
                              {log.old_value ? JSON.stringify(log.old_value, null, 2) : 'NULL (Newly Created Record)'}
                            </pre>
                          </div>
                          <div>
                            <span className="font-bold text-[10px] uppercase text-slate-400 block mb-1">Resulting state (New)</span>
                            <pre className="p-3 bg-white border border-slate-200 rounded-xl overflow-x-auto font-mono max-h-48 text-slate-600 leading-relaxed">
                              {log.new_value ? JSON.stringify(log.new_value, null, 2) : 'NULL (Record Deleted/Voided)'}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan="5" className="py-8 text-center text-slate-400">
                  No actions logged yet in the audit database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
