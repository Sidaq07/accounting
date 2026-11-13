import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // If already logged in, redirect to admin dashboard
    if (localStorage.getItem('rajindera_admin_token')) {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials.');
      }

      localStorage.setItem('rajindera_admin_token', data.token);
      localStorage.setItem('rajindera_admin_user', JSON.stringify(data.user));
      
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-[32px] border border-slate-200 bg-white p-8 shadow-soft">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 text-2xl font-bold text-white shadow-soft">
            R
          </div>
          <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight text-slate-900">
            Rajindera Water Tanker
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Secure Admin Accounting Dashboard
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="text-sm font-semibold text-slate-700">
                Username
              </label>
              <div className="relative mt-2">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <User size={18} />
                </span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none ring-0 focus:border-blue-600 transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="relative mt-2">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-12 outline-none ring-0 focus:border-blue-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center items-center gap-2 rounded-full bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-soft transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-slate-300"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Verifying Identity...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </div>
        </form>
        
        <div className="text-center text-xs text-slate-400">
          <a href="/" className="hover:text-blue-600 transition">Back to Main Website</a>
        </div>
      </div>
    </div>
  );
}
