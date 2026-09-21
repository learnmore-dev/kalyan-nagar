'use client';

import React, { useEffect, useState, useRef } from 'react';
import { User, LiveActivity } from '@/lib/types';
import { AlertCircle, Clock, CheckCircle2, Play, Flame } from 'lucide-react';

interface IdleTrackerAgentProps {
  user: User;
  onStatusChange?: () => void;
}

export default function IdleTrackerAgent({ user, onStatusChange }: IdleTrackerAgentProps) {
  const [isIdle, setIsIdle] = useState(false);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [currentActivity, setCurrentActivity] = useState<LiveActivity | null>(null);
  const lastActiveRef = useRef<number>(Date.now());
  const idleIntervalRef = useRef<any>(null);

  // Poll current activity state
  const fetchActivity = async () => {
    try {
      const res = await fetch('/api/live-activity');
      const data = await res.json();
      if (data.success) {
        const myAct = data.activities.find((a: any) => a.id === user.id)?.activity;
        if (myAct) {
          setCurrentActivity(myAct);
          setIsIdle(myAct.status === 'idle');
        }
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 5000);
    return () => clearInterval(interval);
  }, [user.id]);

  // Activity listeners for 1-minute idle detection
  useEffect(() => {
    const handleActivity = () => {
      lastActiveRef.current = Date.now();
      if (isIdle) {
        // If trainer resumes activity, we can report active heartbeat
        fetch('/api/live-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'heartbeat', trainer_id: user.id }),
        });
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    // 1-Second Timer loop to track idle time
    idleIntervalRef.current = setInterval(async () => {
      const elapsedSec = Math.floor((Date.now() - lastActiveRef.current) / 1000);
      setIdleSeconds(elapsedSec);

      // Trigger 1-minute idle threshold
      if (elapsedSec >= 60 && currentActivity?.status !== 'idle' && currentActivity?.status !== 'break') {
        setIsIdle(true);
        // Alert server that teacher is idle for 1 minute
        await fetch('/api/live-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_status',
            trainer_id: user.id,
            status: 'idle',
            current_task_title: `Idle for ${Math.floor(elapsedSec / 60)} min (No mouse/keyboard activity detected)`,
          }),
        });
        if (onStatusChange) onStatusChange();
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
    };
  }, [isIdle, currentActivity?.status, user.id]);

  const resumeTask = async (taskName: string) => {
    lastActiveRef.current = Date.now();
    setIsIdle(false);
    await fetch('/api/live-activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_status',
        trainer_id: user.id,
        status: 'working_task',
        current_task_title: taskName,
      }),
    });
    fetchActivity();
    if (onStatusChange) onStatusChange();
  };

  if (!isIdle && idleSeconds < 45) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-green" />
          <span className="text-slate-300 font-medium">1-Minute Activity Guard Active</span>
        </div>
        <div className="text-slate-400 font-mono">
          Last active: {idleSeconds}s ago
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl p-4 border transition-all ${
        isIdle
          ? 'bg-rose-950/40 border-rose-500/50 text-rose-200 pulse-red'
          : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className={`h-5 w-5 mt-0.5 ${isIdle ? 'text-rose-400 animate-bounce' : 'text-amber-400'}`} />
          <div>
            <div className="font-semibold text-sm">
              {isIdle
                ? `⚠️ Idle Alert: You have been inactive for ${Math.floor(idleSeconds / 60)} min ${idleSeconds % 60}s`
                : `Notice: Approaching 1-minute idle threshold (${60 - idleSeconds}s remaining)`}
            </div>
            <p className="text-xs text-slate-300 mt-1">
              The institute tracking system logs every minute of idle time. Start a task or resume teaching.
            </p>

            {isIdle && (
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => resumeTask('Student Doubt Solving')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 shadow"
                >
                  <Play className="h-3.5 w-3.5" /> Start Doubt Solving
                </button>
                <button
                  onClick={() => resumeTask('Test Paper Checking')}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center gap-1.5 shadow"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Check Papers
                </button>
                <button
                  onClick={() => resumeTask('Student Follow-up Calling')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow"
                >
                  <Flame className="h-3.5 w-3.5" /> Calling / Counseling
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
