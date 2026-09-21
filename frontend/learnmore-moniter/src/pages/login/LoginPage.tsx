import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setStoredUser } from '@/lib/auth';
import { User as UserIcon, Lock } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleLogin = async () => {
    const clean = username.trim();
    if (!clean || !password) {
      setError('Please enter your username and password.');
      return;
    }
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: clean, email: clean, password }),
      });

      let data: any = null;
      try { data = await response.json(); } catch { data = null; }

      if (!response.ok || !data?.success) {
        setError(data?.error?.message || data?.message || 'Invalid username or password.');
        return;
      }
      if (!data?.user) {
        setError('Login succeeded but user details were not returned.');
        return;
      }

      setStoredUser(data.user);
      navigate(data.user.role === 'admin' ? '/admin/dashboard' : '/trainer/dashboard', { replace: true });
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleLogin(); }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Decorative blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }} />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)' }} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[440px] bg-white rounded-3xl shadow-2xl p-8 space-y-7">

        {/* Logo + title */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center font-black text-lg text-white"
               style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', boxShadow: '0 4px 14px rgba(37,99,235,0.4)' }}>
            LT
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Learnmore Technologies</h1>
            <p className="text-sm text-slate-400 font-medium mt-0.5">Institute Management Portal</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl text-xs font-medium"
               style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' }}>
            ⚠ {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-400" />
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your username"
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border"
                style={{ background: '#f8fafc', borderColor: '#e2e8f0', color: '#0f172a' }}
                onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                onBlur={(e)  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-400" />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border"
                style={{ background: '#f8fafc', borderColor: '#e2e8f0', color: '#0f172a' }}
                onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                onBlur={(e)  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full mt-1 py-3 rounded-xl text-sm font-bold text-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 60%, #7c3aed 100%)',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
            }}
          >
            {loading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Signing in…
              </>
            ) : 'Sign In'}
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-400">
          🔒 Secure portal · Learnmore Technologies
        </p>
      </div>
    </div>
  );
}
