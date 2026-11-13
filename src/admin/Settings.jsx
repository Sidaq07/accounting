import { useState, useEffect } from 'react';
import { Settings, Lock, Loader2 } from 'lucide-react';
import { apiRequest } from './api';

export default function SettingsView() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [adminUser, setAdminUser] = useState({ username: 'Admin' });

  useEffect(() => {
    const userStr = localStorage.getItem('rajindera_admin_user');
    if (userStr) {
      try {
        setAdminUser(JSON.parse(userStr));
      } catch (e) {}
    }
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          oldPassword,
          newPassword
        })
      });

      setSuccess('Your password has been changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to change password. Make sure current password is correct.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Overview */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
        <h3 className="font-display font-semibold text-slate-900 text-base flex items-center gap-1.5 mb-1">
          <Settings size={18} className="text-slate-500" /> Account Settings
        </h3>
        <p className="text-xs text-slate-400 mb-6">Manage login credentials and review administrator configurations</p>
        
        <div className="space-y-4 text-sm border-t border-slate-100 pt-4">
          <div className="flex justify-between items-center py-2 border-b border-slate-50">
            <span className="font-semibold text-slate-500">Current Login Operator</span>
            <span className="font-bold text-slate-800 capitalize">{adminUser.username}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-50">
            <span className="font-semibold text-slate-500">Operator Role</span>
            <span className="font-bold text-slate-800 uppercase tracking-wider text-xs">System Admin</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="font-semibold text-slate-500">Database Engine</span>
            <span className="font-bold text-blue-600">Neon Postgres (Cloud)</span>
          </div>
        </div>
      </div>

      {/* Change Password Form */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
        <h3 className="font-display font-semibold text-slate-900 text-base flex items-center gap-1.5 mb-1">
          <Lock size={18} className="text-slate-500" /> Change Password
        </h3>
        <p className="text-xs text-slate-400 mb-6">Update credentials to maintain dashboard security</p>

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 font-semibold mb-4">
            {success}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Current Password</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm font-mono"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-600 transition text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-sm disabled:bg-slate-300 shadow-soft"
            >
              {loading && <Loader2 className="animate-spin" size={14} />}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
