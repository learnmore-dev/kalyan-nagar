import React from 'react';
import { Outlet } from 'react-router-dom';
import TrainerSidebar from '@/components/TrainerSidebar';
import TrainerGuard from '@/components/TrainerGuard';

export default function TrainerLayout() {
  return (
    <TrainerGuard>
      <div className="min-h-screen text-slate-800 flex flex-col lg:flex-row" style={{ background: 'var(--background)' }}>
        <TrainerSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <Outlet />
        </div>
      </div>
    </TrainerGuard>
  );
}
