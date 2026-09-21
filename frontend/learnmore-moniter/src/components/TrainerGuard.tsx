import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser } from '@/lib/auth';

export default function TrainerGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const currentUser = getStoredUser();

    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }

    if (currentUser.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }

    setAuthorized(true);
  }, [navigate]);

  if (!authorized) {
    return (
      <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col items-center justify-center space-y-3 text-slate-600">
        <div className="h-9 w-9 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Loading Faculty Portal...</p>
      </div>
    );
  }

  return <>{children}</>;
}
