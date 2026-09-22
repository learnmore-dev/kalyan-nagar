import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Batch } from '@/lib/types';
import { Plus, Mail, BookOpen, Edit3, MessageSquare, Check, X, Trash2, CheckCircle } from 'lucide-react';

export default function AdminTrainersPage() {
  const [trainers, setTrainers] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [editingTrainerId, setEditingTrainerId] = useState<string | null>(null);
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleDeleteTrainer = async (trainerId: string, trainerName: string) => {
    if (!window.confirm(`Are you sure you want to delete trainer "${trainerName}"?`)) return;
    try {
      await fetch(`/api/users/${trainerId}/`, { method: 'DELETE' });
      setNotice(`🗑️ Trainer "${trainerName}" deleted successfully.`);
      fetchData();
      setTimeout(() => setNotice(null), 3000);
    } catch {
      alert('Failed to delete trainer.');
    }
  };

  const fetchData = () => {
    Promise.all([
      fetch('/api/users?role=trainer').then((r) => r.json()).catch(() => ({ success: false })),
      fetch('/api/batches/').then((r) => r.json()).catch(() => ({ success: false })),
    ]).then(([uData, bData]) => {
      if (uData && uData.success && uData.users) {
        setTrainers(uData.users);
      }
      if (bData && bData.success && bData.batches) {
        setBatches(bData.batches);
      }
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartEdit = (trainer: User) => {
    setEditingTrainerId(trainer.id);
    setNewPhone(trainer.phone || '+91 ');
  };

  const handleSavePhone = async (trainerId: string) => {
    if (!newPhone.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: trainerId,
          phone: newPhone.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotice('✅ WhatsApp Mobile Number Updated Successfully!');
        setEditingTrainerId(null);
        fetchData();
        setTimeout(() => setNotice(null), 3000);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              👥 Faculty Trainer Management & WhatsApp Contacts
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              View faculty profiles, WhatsApp numbers, batch assignments, and radar status.
            </p>
          </div>

          <Link
            to="/admin/users/create"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all self-start"
          >
            <Plus className="h-4 w-4" /> Add New Trainer
          </Link>
        </div>

        {notice && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            {notice}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {trainers.map((trainer) => {
            const assignedBatches = batches.filter((b) => b.trainer_id === trainer.id);
            const isEditing = editingTrainerId === trainer.id;

            return (
              <div
                key={trainer.id}
                className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] text-white font-extrabold text-lg shadow-sm">
                      {trainer.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">{trainer.name}</h3>
                      <p className="text-xs text-slate-400 font-mono">@{trainer.username}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                        {trainer.designation || 'Faculty Trainer'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-[#25D366]" /> WhatsApp Mobile
                      </span>
                      {!isEditing && (
                        <button
                          onClick={() => handleStartEdit(trainer)}
                          className="text-[11px] text-[#128C7E] hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit3 className="h-3 w-3" /> Edit
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="tel"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="flex-1 rounded-lg border border-emerald-400 bg-white px-2.5 py-1 text-xs text-slate-800 font-mono focus:outline-none"
                        />
                        <button
                          onClick={() => handleSavePhone(trainer.id)}
                          disabled={saving}
                          className="p-1.5 rounded-lg bg-[#25D366] hover:bg-[#1eb855] text-white text-xs cursor-pointer"
                          title="Save"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingTrainerId(null)}
                          className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs cursor-pointer"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="font-mono text-xs font-bold text-slate-800 flex items-center justify-between">
                        <span>{trainer.phone || '⚠️ No WhatsApp number added'}</span>
                        {trainer.phone && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            Active
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{trainer.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                      <span><strong>{assignedBatches.length}</strong> Active Batches Assigned</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                  <Link
                    to={`/admin/trainers/${trainer.id}`}
                    className="flex-1 text-center py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    👤 360° Profile & Batches
                  </Link>
                  <Link
                    to={`/admin/live-monitor`}
                    className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs transition-colors"
                    title="Live Radar"
                  >
                    📡 Radar
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDeleteTrainer(trainer.id, trainer.name)}
                    className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-xs transition-colors cursor-pointer"
                    title="Delete Trainer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
    </main>
  );
}
