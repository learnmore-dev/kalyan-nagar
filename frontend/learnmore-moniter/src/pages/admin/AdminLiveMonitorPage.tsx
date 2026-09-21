import React, { useState, useEffect } from 'react';
import TeacherStatusCard from '@/components/TeacherStatusCard';
import { Radio, AlertOctagon, RefreshCw, Sparkles, Plus, Clock } from 'lucide-react';

export default function AdminLiveMonitorPage() {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [lastSync, setLastSync] = useState<string>('');
  const [audioAlert, setAudioAlert] = useState(true);

  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/live-activity');
      const data = await res.json();
      if (data.success) {
        setTrainers(data.activities || []);
        setLastSync(new Date().toLocaleTimeString());
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2500); // 2.5s high-frequency radar
    return () => clearInterval(interval);
  }, []);

  const handleAssignTask = async (trainerId: string, taskTitle: string) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        trainer_id: trainerId,
        title: taskTitle,
        category: 'other',
      }),
    });
    fetchTelemetry();
  };

  const idleCount = trainers.filter(
    (t) => t.activity?.status === 'idle' && (t.activity?.idle_minutes_current >= 1 || t.activity?.total_idle_today_minutes > 0)
  ).length;

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Radar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-rose-600">
              HIGH FREQUENCY 60-SECOND TELEMETRY
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            📡 1-Minute Live Teacher Tracker
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Real-time radar flags any teacher who is inactive or free for ≥ 1 minute.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start">
          <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm text-xs font-mono font-semibold text-slate-600">
            ⚡ Synced: {lastSync || 'Connecting...'}
          </span>
          <button
            onClick={fetchTelemetry}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm transition-colors cursor-pointer"
            title="Refresh Radar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Live Idle Alert Banner */}
      {idleCount > 0 ? (
        <div className="p-4 rounded-3xl bg-rose-50 border-2 border-rose-400 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600 text-white font-bold text-lg animate-bounce">
              ⚠️
            </div>
            <div>
              <div className="font-extrabold text-sm text-rose-800">
                {idleCount} Trainer(s) Currently Free / Idle!
              </div>
              <div className="text-xs text-rose-600">
                Assign micro-tasks below or review batch lecture schedules.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3.5 px-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> All faculty trainers are actively engaged in lectures or assigned tasks!
        </div>
      )}

      {/* Trainer Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {trainers.map((trainer, idx) => (
          <TeacherStatusCard
            key={trainer.id || trainer.trainer_id || idx}
            trainer={trainer}
            onAssignTask={handleAssignTask}
          />
        ))}
      </div>
    </main>
  );
}
