'use client';

import React, { useState } from 'react';
import { User, LiveActivity } from '@/lib/types';
import { Clock, Coffee, UserCheck, Zap, SendHorizonal } from 'lucide-react';

interface TeacherStatusCardProps {
  trainer: User & { activity: LiveActivity };
  onAssignTask?: (trainerId: string, taskTitle: string) => void;
}

export default function TeacherStatusCard({ trainer, onAssignTask }: TeacherStatusCardProps) {
  const [taskInput, setTaskInput]   = useState('');
  const [showAssign, setShowAssign] = useState(false);

  if (!trainer) return null;

  const trainerName = trainer.name || (trainer as any).trainer_name || (trainer as any).username || 'Faculty Trainer';
  const trainerDesignation = trainer.designation || (trainer as any).role || 'Faculty Trainer';
  const trainerId = trainer.id || (trainer as any).trainer_id || 'usr_trainer';

  const act      = trainer.activity || (trainer as any) || {};
  const isInClass = act.status === 'in_class';
  const isIdle    = act.status === 'idle';
  const isOnBreak = act.status === 'break' || isIdle;

  const startTimeStr = act.status_started_at
    ? new Date(act.status_started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '—';

  const teachingMin = act.total_teaching_today_minutes || 0;
  const breakMin    = act.total_idle_today_minutes     || 0;
  const totalMin    = teachingMin + (act.total_task_today_minutes || 0);

  const fmt = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getAvatarUrl = (name?: string) => {
    const safeName = (name || trainerName || '').toLowerCase();
    if (safeName.includes('rahul')) return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
    if (safeName.includes('priya')) return 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80';
    if (safeName.includes('amit'))  return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80';
    return trainer.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trainer.username || trainerId}`;
  };

  const handleAssign = () => {
    if (taskInput.trim() && onAssignTask) {
      onAssignTask(trainerId, taskInput.trim());
      setTaskInput('');
      setShowAssign(false);
    }
  };

  /* Status accent color */
  const accentColor = isInClass ? '#2563eb' : isIdle ? '#dc2626' : '#d97706';

  return (
    <div className="pro-card overflow-hidden"
         style={{ borderLeft: `3px solid ${accentColor}` }}>

      {/* ── Top: avatar + name + status ─── */}
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src={getAvatarUrl(trainerName)}
              alt={trainerName}
              className="h-10 w-10 rounded-full object-cover"
              style={{ border: '2px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
            />
            {/* Online dot */}
            <span
              className="absolute bottom-0 right-0 h-3 w-3 rounded-full"
              style={{
                background: isInClass ? '#059669' : isIdle ? '#dc2626' : '#d97706',
                border: '2px solid #ffffff',
              }}
            />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-slate-900 text-sm leading-tight truncate">{trainerName}</h4>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
              {trainerDesignation}
            </p>
          </div>
        </div>

        {/* Status pill */}
        {isInClass ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0"
                style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
            <UserCheck className="h-3 w-3" /> In Class
          </span>
        ) : isIdle ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0"
                style={{ background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3' }}>
            <Zap className="h-3 w-3" /> Idle
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0"
                style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }}>
            <Coffee className="h-3 w-3" /> On Break
          </span>
        )}
      </div>

      {/* ── Dark focus box ────────────────── */}
      <div className="mx-4 mb-4 p-3.5 rounded-xl space-y-2"
           style={{ background: '#0f172a' }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: '#64748b' }}>Current Focus</span>
          <span className="flex items-center gap-1 text-[10px] font-mono"
                style={{ color: '#475569' }}>
            <Clock className="h-3 w-3" /> {startTimeStr}
          </span>
        </div>
        <p className="text-xs font-medium leading-relaxed"
           style={{ color: '#e2e8f0' }}>
          {act.current_task_title ||
            (isInClass ? 'Teaching session in progress' : 'Not currently active')}
        </p>
      </div>

      {/* ── 3 stat counters ──────────────── */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        {[
          { label: 'Teaching', value: fmt(teachingMin), color: '#34d399' },
          { label: 'Break',    value: fmt(breakMin),    color: '#94a3b8' },
          { label: 'Total',    value: fmt(totalMin),    color: '#e2e8f0' },
        ].map((stat) => (
          <div key={stat.label}
               className="p-2.5 rounded-xl text-center"
               style={{ background: '#1e293b' }}>
            <div className="text-[9px] font-bold uppercase tracking-widest mb-1"
                 style={{ color: '#64748b' }}>{stat.label}</div>
            <div className="text-xs font-mono font-bold"
                 style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── Assign task (idle only) ───────── */}
      {isIdle && onAssignTask && (
        <div className="px-4 pb-4">
          {!showAssign ? (
            <button
              onClick={() => setShowAssign(true)}
              className="w-full py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer interactive"
              style={{ background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3' }}
            >
              + Assign Task
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAssign()}
                placeholder="Task title…"
                className="flex-1 px-3 py-2 rounded-xl text-xs font-medium outline-none transition-all"
                style={{
                  background: '#f8fafc', border: '1.5px solid var(--border)', color: '#0f172a',
                }}
                autoFocus
              />
              <button
                onClick={handleAssign}
                disabled={!taskInput.trim()}
                className="px-3 py-2 rounded-xl text-white text-xs font-semibold cursor-pointer disabled:opacity-50 transition-all interactive"
                style={{ background: '#2563eb' }}
              >
                <SendHorizonal className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { setShowAssign(false); setTaskInput(''); }}
                className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid var(--border)' }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
