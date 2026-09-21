import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Video, ArrowRight, User } from 'lucide-react';
import { LiveClassRoom } from '@/components/LiveClassRoom';

export default function StudentDirectJoinPage() {
  const params = useParams();
  const batchId = params.batchId || 'general-batch';
  const [studentName, setStudentName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;
    setHasJoined(true);
  };

  if (hasJoined) {
    return (
      <LiveClassRoom
        batchId={batchId}
        batchName={`Batch ${batchId.toUpperCase()}`}
        userName={studentName}
        isTrainer={false}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
        <div className="inline-flex p-3 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
          <Video className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-white">Learnmore Live Class</h1>
          <p className="text-xs text-slate-400 mt-1">
            Joining Batch: <span className="text-blue-400 font-bold">{batchId}</span>
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              તમારું પૂરું નામ લખો (Enter Your Name)
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Meet Patel"
                className="w-full bg-slate-700/50 border border-slate-600 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3.5 text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Join Class Directly</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[11px] text-slate-500">
          🔒 Official Portal • No password required for students with invite link
        </p>
      </div>
    </div>
  );
}
