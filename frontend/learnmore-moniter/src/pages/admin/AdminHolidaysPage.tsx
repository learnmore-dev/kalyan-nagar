import React, { useState, useEffect } from 'react';
import { Holiday, HolidayConfig, User } from '@/lib/types';
import { MANDATORY_HOLIDAYS_2026, OPTIONAL_HOLIDAYS_2026 } from '@/lib/holidays';
import {
  CalendarDays,
  Calendar,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  Clock,
  Users,
  MinusCircle,
  UserCheck,
  ShieldAlert
} from 'lucide-react';

export default function AdminHolidaysPage() {
  const [config, setConfig] = useState<HolidayConfig>({
    mandatory_holidays: MANDATORY_HOLIDAYS_2026,
    optional_holidays: OPTIONAL_HOLIDAYS_2026,
    week_off_pattern: 'sunday',
  });
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Holiday Input state
  const [newMandatory, setNewMandatory] = useState<{ name: string; date: string }>({ name: '', date: '' });
  const [newOptional, setNewOptional] = useState<{ name: string; date: string }>({ name: '', date: '' });

  // Admin User Leave Control state
  const [trainers, setTrainers] = useState<User[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>('');
  const [deductLeaveType, setDeductLeaveType] = useState<'casual' | 'optional_holiday' | 'sick' | 'emergency' | 'weekoff'>('casual');
  const [deductDate, setDeductDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [deductReason, setDeductReason] = useState<string>('');
  const [deductLoading, setDeductLoading] = useState<boolean>(false);
  const [deductMsg, setDeductMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchBalances = async () => {
    try {
      const res = await fetch('/api/leaves/adjust');
      const data = await res.json();
      if (data.success) {
        setBalances(data.balances || []);
      }
    } catch {
      // silent
    }
  };

  const fetchHolidayConfig = async () => {
    try {
      const res = await fetch('/api/holidays');
      const data = await res.json();
      if (data && data.success) {
        if (data.holidayConfig) {
          setConfig({
            mandatory_holidays: Array.isArray(data.holidayConfig.mandatory_holidays) && data.holidayConfig.mandatory_holidays.length > 0
              ? data.holidayConfig.mandatory_holidays
              : MANDATORY_HOLIDAYS_2026,
            optional_holidays: Array.isArray(data.holidayConfig.optional_holidays) && data.holidayConfig.optional_holidays.length > 0
              ? data.holidayConfig.optional_holidays
              : OPTIONAL_HOLIDAYS_2026,
            week_off_pattern: data.holidayConfig.week_off_pattern || 'sunday',
          });
        } else if (Array.isArray(data.holidays)) {
          const mandatory = data.holidays.filter((h: any) => h.type === 'mandatory');
          const optional = data.holidays.filter((h: any) => h.type === 'optional');
          setConfig({
            mandatory_holidays: mandatory.length > 0 ? mandatory : MANDATORY_HOLIDAYS_2026,
            optional_holidays: optional.length > 0 ? optional : OPTIONAL_HOLIDAYS_2026,
            week_off_pattern: data.week_off_pattern || 'sunday',
          });
        }
        if (data.monthlySchedule) {
          setSchedule(data.monthlySchedule);
        }
      }
    } catch {
      // silent fallback to default config
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainers = async () => {
    try {
      const res = await fetch('/api/users?role=trainer');
      const data = await res.json();
      if (data && (data.success || Array.isArray(data.users))) {
        const list = data.users || data.results || data || [];
        setTrainers(Array.isArray(list) ? list : []);
        if (list.length > 0 && !selectedTrainerId) {
          setSelectedTrainerId(list[0].id);
        }
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchHolidayConfig();
    fetchTrainers();
    fetchBalances();
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data && (data.success || data.id || data.message)) {
        setMessage({ text: 'Holiday & Week-Off rules saved successfully!', type: 'success' });
        fetchHolidayConfig();
      } else {
        setMessage({ text: data?.error || 'Failed to save configuration', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Network error while saving', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeductLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainerId) {
      setDeductMsg({ text: 'Please select a trainer first.', type: 'error' });
      return;
    }
    setDeductLoading(true);
    setDeductMsg(null);

    try {
      const selectedTrainer = trainers.find((t) => t.id === selectedTrainerId);
      const trainerName = selectedTrainer?.name || 'Trainer';

      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainer_id: selectedTrainerId,
          leave_type: deductLeaveType,
          start_date: deductDate,
          end_date: deductDate,
          reason: deductReason || 'Leave deducted directly by Admin Control',
          status: 'approved',
        }),
      });
      const data = await res.json();

      if (data && (data.success || data.leave)) {
        setDeductMsg({
          text: `✓ ${deductLeaveType.replace('_', ' ').toUpperCase()} leave deducted for ${trainerName}! Trainer dashboard updated instantly.`,
          type: 'success',
        });
        setDeductReason('');
      } else {
        setDeductMsg({ text: data?.error || 'Failed to deduct leave', type: 'error' });
      }
    } catch (err: any) {
      setDeductMsg({ text: err.message || 'Network error while processing deduction', type: 'error' });
    } finally {
      setDeductLoading(false);
    }
  };

  const addMandatoryHoliday = () => {
    if (!newMandatory.name || !newMandatory.date) return;
    setConfig((prev) => ({
      ...prev,
      mandatory_holidays: [
        ...(prev?.mandatory_holidays || []),
        { name: newMandatory.name, date: newMandatory.date, type: 'mandatory' },
      ],
    }));
    setNewMandatory({ name: '', date: '' });
  };

  const removeMandatoryHoliday = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      mandatory_holidays: (prev?.mandatory_holidays || []).filter((_, i) => i !== index),
    }));
  };

  const addOptionalHoliday = () => {
    if (!newOptional.name || !newOptional.date) return;
    setConfig((prev) => ({
      ...prev,
      optional_holidays: [
        ...(prev?.optional_holidays || []),
        { name: newOptional.name, date: newOptional.date, type: 'optional' },
      ],
    }));
    setNewOptional({ name: '', date: '' });
  };

  const removeOptionalHoliday = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      optional_holidays: (prev?.optional_holidays || []).filter((_, i) => i !== index),
    }));
  };

  const mandatoryList = config?.mandatory_holidays || [];
  const optionalList = config?.optional_holidays || [];

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarDays className="h-7 w-7 text-indigo-600" /> Holiday & User Leave Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Configure Mandatory Holidays, Festival Days, and Direct Admin Leave Deduction for any user.
          </p>
        </div>

        <button
          onClick={handleSaveConfig}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border shadow-xs ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* ADMIN USER LEAVE CONTROL (DIRECT DEDUCT & MINUS BALANCE) CARD */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white shadow-xl space-y-5 border border-indigo-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div>
            <h2 className="text-base font-extrabold flex items-center gap-2 text-indigo-300">
              <MinusCircle className="h-5 w-5 text-amber-400" /> User Leave Control (Admin Direct Deduction)
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Select any trainer/user to deduct/minus a leave or optional holiday. It will automatically reflect and deduct from their user dashboard in real-time.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] font-extrabold self-start sm:self-auto flex items-center gap-1">
            <UserCheck className="h-3.5 w-3.5" /> Real-Time Sync
          </span>
        </div>

        {deductMsg && (
          <div
            className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
              deductMsg.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                : 'bg-rose-500/20 border-rose-400/40 text-rose-200'
            }`}
          >
            {deductMsg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            {deductMsg.text}
          </div>
        )}

        {/* Selected User Live Balance Badge */}
        {selectedTrainerId && (
          <div className="flex flex-wrap items-center gap-3 text-xs bg-indigo-900/60 p-2.5 rounded-xl border border-indigo-400/30">
            <span className="font-bold text-slate-300">Selected User Live Remaining Balance:</span>
            {(() => {
              const tb = balances.find((b) => b.trainer_id === selectedTrainerId || b.id === selectedTrainerId);
              const cLeft = tb ? tb.casual_sick_quota - tb.casual_sick_used : 12;
              const oLeft = tb ? tb.optional_holiday_quota - tb.optional_holiday_used : 5;
              return (
                <>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-extrabold border border-emerald-400/30">
                    Casual/Sick: {cLeft} / {tb?.casual_sick_quota || 12} Left
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-extrabold border border-amber-400/30">
                    Optional: {oLeft} / {tb?.optional_holiday_quota || 5} Left
                  </span>
                </>
              );
            })()}
          </div>
        )}

        <form onSubmit={handleDeductLeave} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Select Trainer */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 block">Select User / Trainer</label>
            <select
              value={selectedTrainerId}
              onChange={(e) => setSelectedTrainerId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-800/90 border border-indigo-500/30 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {trainers.length === 0 && <option value="">Loading trainers...</option>}
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email || t.role})
                </option>
              ))}
            </select>
          </div>

          {/* Leave Type */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 block">Leave / Holiday Type</label>
            <select
              value={deductLeaveType}
              onChange={(e) => setDeductLeaveType(e.target.value as any)}
              className="w-full p-2.5 rounded-xl bg-slate-800/90 border border-indigo-500/30 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="casual">Casual Leave (Minus Monthly Quota)</option>
              <option value="optional_holiday">Optional Holiday (Minus Festival Pool)</option>
              <option value="weekoff">Weekly Off / Scheduled Week Off</option>
              <option value="sick">Sick / Medical Leave</option>
              <option value="emergency">Emergency / Unauthorized Absence</option>
            </select>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 block">Deduction Date</label>
            <input
              type="date"
              value={deductDate}
              onChange={(e) => setDeductDate(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-800/90 border border-indigo-500/30 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 block">Reason / Admin Note</label>
            <input
              type="text"
              placeholder="e.g. Unapproved absence deduction"
              value={deductReason}
              onChange={(e) => setDeductReason(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-800/90 border border-indigo-500/30 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
            />
          </div>

          {/* Submit Button */}
          <div className="space-y-1 flex flex-col justify-end">
            <button
              type="submit"
              disabled={deductLoading || !selectedTrainerId}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <MinusCircle className="h-4 w-4" />
              {deductLoading ? 'Deducting...' : 'Deduct & Minus Balance'}
            </button>
          </div>
        </form>

        {/* ALL USERS LEAVE BALANCES OVERVIEW TABLE */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-300 mb-2.5 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-amber-400" /> All Users & Trainers Live Leave Balances
          </h3>
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60">
            <table className="w-full text-left text-xs text-slate-200 border-collapse">
              <thead>
                <tr className="bg-slate-800/80 border-b border-white/10 text-slate-400 uppercase font-extrabold text-[10px]">
                  <th className="py-2.5 px-3">User / Trainer Name</th>
                  <th className="py-2.5 px-3">Casual & Sick Leave</th>
                  <th className="py-2.5 px-3">Optional Holidays</th>
                  <th className="py-2.5 px-3">Mandatory Holidays</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {trainers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400 text-xs">
                      No trainers/users found.
                    </td>
                  </tr>
                ) : (
                  trainers.map((t) => {
                    const tb = balances.find((b) => b.trainer_id === t.id || b.id === t.id);
                    const cLeft = tb ? tb.casual_sick_quota - tb.casual_sick_used : 12;
                    const oLeft = tb ? tb.optional_holiday_quota - tb.optional_holiday_used : 5;
                    const isSelected = t.id === selectedTrainerId;
                    return (
                      <tr key={t.id} className={`hover:bg-white/5 transition-colors ${isSelected ? 'bg-indigo-900/30' : ''}`}>
                        <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                          👨‍🏫 {t.name} {isSelected && <span className="text-[10px] text-amber-400 font-extrabold">(Selected)</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                          {cLeft} / {tb?.casual_sick_quota || 12} Left
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                          {oLeft} / {tb?.optional_holiday_quota || 5} Left
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-300">
                          5 / 5 Entitled
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTrainerId(t.id)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition-all cursor-pointer"
                          >
                            {isSelected ? 'Selected' : 'Select User'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Current Month Working Days Calculation Card */}
      {schedule && (
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" /> Current Month Schedule ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})
            </h2>
            <span className="text-[11px] font-bold text-slate-500">Auto-Calculated Engine</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-500">Total Calendar Days</div>
              <div className="text-xl font-extrabold text-slate-800 font-mono mt-1">{schedule.totalDays || 30} Days</div>
            </div>
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200">
              <div className="text-[11px] font-bold text-indigo-700">Week-Off Days</div>
              <div className="text-xl font-extrabold text-indigo-900 font-mono mt-1">{schedule.weekOffDays || 4} Days</div>
            </div>
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
              <div className="text-[11px] font-bold text-amber-700">Mandatory Holidays</div>
              <div className="text-xl font-extrabold text-amber-900 font-mono mt-1">{schedule.mandatoryHolidayDays || 0} Days</div>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <div className="text-[11px] font-bold text-emerald-700">Net Working Days</div>
              <div className="text-xl font-extrabold text-emerald-900 font-mono mt-1">{schedule.netWorkingDays || 26} Days</div>
            </div>
          </div>
        </div>
      )}

      {/* Week-Off Rule Configuration */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          ⚙️ Organization Week-Off Policy
        </h2>
        <p className="text-xs text-slate-500">
          Week-off days are automatically excluded from absence calculations, 12 PM non-login alerts, and leave deductions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'sunday', title: 'Sunday Only', desc: 'Every Sunday is a weekly off (Default)' },
            { id: 'sat_sun', title: 'Saturday & Sunday', desc: '5-day working week' },
            { id: 'alternate_sat_sun', title: 'Sunday + 2nd/4th Sat', desc: 'All Sundays + 2nd & 4th Saturdays' },
          ].map((rule) => (
            <label
              key={rule.id}
              onClick={() => setConfig((prev) => ({ ...prev, week_off_pattern: rule.id as any }))}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                config?.week_off_pattern === rule.id
                  ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
              }`}
            >
              <div>
                <div className="font-extrabold text-xs text-slate-900">{rule.title}</div>
                <div className="text-[11px] text-slate-500 mt-1">{rule.desc}</div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-indigo-600">
                {config?.week_off_pattern === rule.id ? '✓ Active Policy' : 'Select'}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 5 Mandatory Holidays & 5 Optional Holidays Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mandatory Holidays */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              🏛️ Mandatory Holidays ({mandatoryList.length} Configured)
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-extrabold">
              Compulsory
            </span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {mandatoryList.map((h, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
              >
                <div>
                  <span className="text-slate-900 font-bold">{h.name}</span>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">📅 {h.date}</div>
                </div>
                <button
                  onClick={() => removeMandatoryHoliday(index)}
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Mandatory */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="text-[11px] font-bold text-slate-700">Add Mandatory Holiday</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Holiday Name (e.g. Republic Day)"
                value={newMandatory.name}
                onChange={(e) => setNewMandatory((p) => ({ ...p, name: e.target.value }))}
                className="p-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 bg-slate-50"
              />
              <input
                type="date"
                value={newMandatory.date}
                onChange={(e) => setNewMandatory((p) => ({ ...p, date: e.target.value }))}
                className="p-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 bg-slate-50"
              />
            </div>
            <button
              type="button"
              onClick={addMandatoryHoliday}
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Mandatory Holiday
            </button>
          </div>
        </div>

        {/* Optional Holidays */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              ✨ Optional Holidays ({optionalList.length} Configured)
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
              Festival Pool
            </span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {optionalList.map((h, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-xl bg-amber-50/40 border border-amber-200 text-xs font-semibold"
              >
                <div>
                  <span className="text-slate-900 font-bold">{h.name}</span>
                  <div className="text-[11px] font-mono text-amber-700 mt-0.5">📅 {h.date}</div>
                </div>
                <button
                  onClick={() => removeOptionalHoliday(index)}
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Optional */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="text-[11px] font-bold text-slate-700">Add Optional Festival Holiday</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Festival Name (e.g. Holi)"
                value={newOptional.name}
                onChange={(e) => setNewOptional((p) => ({ ...p, name: e.target.value }))}
                className="p-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 bg-slate-50"
              />
              <input
                type="date"
                value={newOptional.date}
                onChange={(e) => setNewOptional((p) => ({ ...p, date: e.target.value }))}
                className="p-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 bg-slate-50"
              />
            </div>
            <button
              type="button"
              onClick={addOptionalHoliday}
              className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Optional Holiday
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}


