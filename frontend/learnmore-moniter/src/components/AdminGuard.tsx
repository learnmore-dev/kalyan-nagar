import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser } from '@/lib/auth';
import { ShieldAlert } from 'lucide-react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const currentUser = getStoredUser();

    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }

    if (currentUser.role !== 'admin') {
      setDenied(true);
      const timer = setTimeout(() => {
        navigate('/trainer/dashboard', { replace: true });
      }, 1500);
      return () => clearTimeout(timer);
    }

    setAuthorized(true);
  }, [navigate]);

  if (denied) {
    return (
      <div className="min-h-screen w-full bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center animate-bounce">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Access Restricted (Admin Only)</h1>
        <p className="text-sm text-slate-300 max-w-md">
          You are logged in as a Trainer / Faculty user. Admin pages are restricted to Institute Management only.
        </p>
        <div className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20">
          Redirecting to your Trainer Portal...
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col items-center justify-center space-y-3 text-slate-600">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Verifying Admin Rights...</p>
      </div>
    );
  }

  return <>{children}</>;
}
