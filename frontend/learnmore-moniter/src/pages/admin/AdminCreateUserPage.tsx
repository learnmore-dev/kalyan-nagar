import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, GraduationCap, Crown } from 'lucide-react';

export default function AdminCreateUserPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [role, setRole] = useState<'trainer' | 'admin'>('trainer');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username and Password are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    const fullName = `${firstName} ${lastName}`.trim() || username;

    try {
      const res = await fetch('/api/users/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          name: fullName,
          email: email.trim() || `${username.trim()}@institute.edu`,
          phone: phone.trim(),
          role,
          password,
          designation: role === 'admin' ? 'Institute Admin' : 'Faculty Trainer',
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || (data && data.success === false)) {
        setError(data?.error || 'Failed to create user in database. Username might already exist.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/admin/trainers');
      }, 800);
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to backend database server.');
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <div className="w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white">
          <div className="w-full bg-gradient-to-r from-[#667eea] to-[#764ba2] p-5 text-center text-white">
            <h2 className="text-xl font-bold tracking-tight flex items-center justify-center gap-2">
              ➕ Create User
            </h2>
          </div>

          {error && (
            <div className="m-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="m-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> User Created Successfully! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  FIRST NAME
                </label>
                <input
                  type="text"
                  placeholder="Enter first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  LAST NAME
                </label>
                <input
                  type="text"
                  placeholder="Enter last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                USERNAME *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. john_trainer"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] focus:outline-none transition-all"
              />
              <p className="text-[11px] text-slate-400">Login ke liye use hoga</p>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                EMAIL
              </label>
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] focus:outline-none transition-all"
              />
              <p className="text-[11px] text-slate-400">Leave notifications yahan aayenge</p>
            </div>

            <div className="space-y-1.5 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
              <label className="block font-bold text-emerald-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                📱 WHATSAPP MOBILE NUMBER {role === 'trainer' && '*'}
              </label>
              <input
                type="tel"
                required={role === 'trainer'}
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-emerald-300 bg-white px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all font-mono"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                ROLE *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('trainer')}
                  className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    role === 'trainer'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-sm ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <GraduationCap className="h-4 w-4" /> 🎓 TRAINER
                </button>

                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    role === 'admin'
                      ? 'border-amber-500 bg-amber-50/70 text-amber-800 shadow-sm ring-1 ring-amber-500'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Crown className="h-4 w-4" /> 👑 ADMIN
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                PASSWORD *
              </label>
              <input
                type="password"
                required
                placeholder="Min 8 characters..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                CONFIRM PASSWORD *
              </label>
              <input
                type="password"
                required
                placeholder="Password dobara daalo..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] focus:outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-95 text-white font-bold py-3.5 text-sm shadow-xl shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? 'Creating User...' : '✅ Create User'}
            </button>
          </form>
        </div>
    </main>
  );
}
