import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import AdminGuard from '@/components/AdminGuard';

export default function AdminLayout() {
  return (
    <div className="min-h-screen text-slate-800 flex" style={{ background: 'var(--background)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <Outlet />
      </div>
    </div>
  );
}
