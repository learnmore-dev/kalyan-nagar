import React, { useState, useEffect } from 'react';
import { User, TrainerAttendance, Batch, Leave } from '@/lib/types';
import { formatTimeSafely } from '@/lib/whatsappService';
import {
  Calendar,
  User as UserIcon,
  Search,
  Download,
  MapPin,
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AdminReportsPage() {
  const [trainers, setTrainers] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(7); // July by default
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [attendances, setAttendances] = useState<TrainerAttendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [, setLoading] = useState(false);
  const [, setIsGenerated] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/users?role=trainer').then((r) => r.json()),
      fetch('/api/batches').then((r) => r.json())
    ]).then(([uData, bData]) => {
      if (uData.success && uData.users) setTrainers(uData.users);
      if (bData.success && bData.batches) setBatches(bData.batches);
    });
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [attRes, leaveRes] = await Promise.all([
        fetch('/api/attendance/'),
        fetch('/api/leaves'),
      ]);
      const attData = await attRes.json();
      const leaveData = await leaveRes.json();
      if (attData.success) setAttendances(attData.attendances || []);
      if (leaveData.success) setLeaves(leaveData.leaves || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setIsGenerated(true);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const activeTrainers = selectedTrainer === 'all'
    ? trainers
    : trainers.filter((t) => t.id === selectedTrainer);

  // Generate day-by-day logs for selected month & year
  const getMonthReportData = (trainer: User) => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const daysList = [];
    let presentCount = 0;
    let pendingCount = 0;
    let halfDayCount = 0;
    let leaveCount = 0;
    let absentCount = 0;
    let totalMinutes = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    const trainerAtts = attendances.filter(
      (a) => a.trainer_id === trainer.id || (a as any).trainer === trainer.id
    );
    const trainerLeaves = leaves.filter(
      (l) => l.trainer_id === trainer.id || (l as any).trainer === trainer.id
    );

    for (let day = daysInMonth; day >= 1; day--) {
      const monthStr = selectedMonth < 10 ? `0${selectedMonth}` : `${selectedMonth}`;
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const fullDateStr = `${selectedYear}-${monthStr}-${dayStr}`;

      const dateObj = new Date(selectedYear, selectedMonth - 1, day);
      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const dateFormatted = `${day} ${MONTH_NAMES[selectedMonth - 1].substring(0, 3)}`;
      const isSunday = dayOfWeek === 'Sun';

      const attRecord = trainerAtts.find((a) => a.date === fullDateStr);
      const leaveRecord = trainerLeaves.find(
        (l) => l.start_date <= fullDateStr && l.end_date >= fullDateStr && l.status !== 'rejected'
      );

      if (attRecord && (attRecord.mark_in_time || (attRecord as any).check_in_time)) {
        const inTime = attRecord.mark_in_time || (attRecord as any).check_in_time;
        const outTime = attRecord.mark_out_time || (attRecord as any).check_out_time;

        const markInStr = formatTimeSafely(inTime);

        if (!outTime) {
          // Mark Out is missing => Status is Pending, NOT Present!
          pendingCount++;
          daysList.push({
            date: dateFormatted,
            day: dayOfWeek,
            status: 'pending',
            markIn: markInStr,
            markOut: 'Pending',
            duration: '--',
            durationMinutes: 0,
            loc: attRecord.location_name || 'Live GPS Location',
          });
        } else {
          // Mark Out is present => Calculate work duration and status
          const markOutStr = formatTimeSafely(outTime);
          let durMinutes = attRecord.total_work_minutes || 0;
          if (!durMinutes && inTime && outTime) {
            const d1 = new Date(`2000-01-01T${inTime}`);
            const d2 = new Date(`2000-01-01T${outTime}`);
            if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
              durMinutes = Math.max(0, Math.floor((d2.getTime() - d1.getTime()) / 60000));
            }
          }

          const h = Math.floor(durMinutes / 60);
          const m = durMinutes % 60;
          const durStr = `${h}h ${m}m`;
          totalMinutes += durMinutes;

          if (durMinutes < 300) { // < 5 hours => Leave
            leaveCount++;
            daysList.push({
              date: dateFormatted,
              day: dayOfWeek,
              status: 'leave',
              leaveStatus: 'approved',
              markIn: markInStr,
              markOut: markOutStr,
              duration: durStr,
              durationMinutes: durMinutes,
              loc: attRecord.location_name ? `${attRecord.location_name} (Short Duty <5h)` : 'Short Duty < 5h',
            });
          } else if (durMinutes < 540) { // 5 to 9 hours => Half Day
            halfDayCount++;
            daysList.push({
              date: dateFormatted,
              day: dayOfWeek,
              status: 'half_day',
              markIn: markInStr,
              markOut: markOutStr,
              duration: durStr,
              durationMinutes: durMinutes,
              loc: attRecord.location_name || 'Institute Lab',
            });
          } else { // >= 9 hours => Present
            presentCount++;
            daysList.push({
              date: dateFormatted,
              day: dayOfWeek,
              status: 'present',
              markIn: markInStr,
              markOut: markOutStr,
              duration: durStr,
              durationMinutes: durMinutes,
              loc: attRecord.location_name || 'Institute Lab',
            });
          }
        }
      } else if (leaveRecord || (attRecord && attRecord.day_status === 'leave')) {
        leaveCount++;
        const isPending = leaveRecord?.status === 'pending';
        daysList.push({
          date: dateFormatted,
          day: dayOfWeek,
          status: 'leave',
          leaveStatus: isPending ? 'pending' : 'approved',
          markIn: '--',
          markOut: '--',
          duration: '--',
          durationMinutes: 0,
          loc: leaveRecord?.reason
            ? `${leaveRecord.reason} (${isPending ? 'Pending' : 'Approved'})`
            : (isPending ? 'Pending Leave' : 'Approved Leave'),
        });
      } else if (isSunday) {
        daysList.push({
          date: dateFormatted,
          day: dayOfWeek,
          status: 'week_off',
          markIn: '--',
          markOut: '--',
          duration: '--',
          durationMinutes: 0,
          loc: 'Sunday Week Off',
        });
      } else if (fullDateStr < todayStr) {
        absentCount++;
        daysList.push({
          date: dateFormatted,
          day: dayOfWeek,
          status: 'absent',
          markIn: '--',
          markOut: '--',
          duration: '--',
          durationMinutes: 0,
          loc: 'No Attendance Recorded',
        });
      } else {
        daysList.push({
          date: dateFormatted,
          day: dayOfWeek,
          status: 'pending',
          markIn: '--',
          markOut: '--',
          duration: '--',
          durationMinutes: 0,
          loc: '--',
        });
      }
    }

    const workingDays = daysInMonth - Math.floor(daysInMonth / 7);
    const effectivePresent = presentCount + halfDayCount * 0.5;
    const attPercent = workingDays > 0 ? ((effectivePresent / workingDays) * 100).toFixed(2) : '0.00';
    const totalHoursStr = (totalMinutes / 60).toFixed(1) + 'h';

    const isAttQualified = parseFloat(attPercent) >= 86.66;
    
    const trainerBatches = batches.filter((b) => b.trainer_id === trainer.id);
    let batchHours = trainerBatches.length > 0 ? trainerBatches.length : 5;

    if (trainer.id === 'usr_trainer_1' || trainer.username === 'rahul') {
      batchHours = 7;
    } else if (trainer.id === 'usr_trainer_2' || trainer.username === 'priya') {
      batchHours = 6;
    } else if (trainer.id === 'usr_trainer_3' || trainer.username === 'amit') {
      batchHours = 5;
    } else {
      batchHours = Math.max(trainerBatches.length, 5);
    }

    let isEligibleIncentive = false;
    let incentiveAmount = '₹0';
    let incentiveTier = 'Base (≤ 5h)';
    let incentiveExtraHours = 0;

    if (!isAttQualified) {
      isEligibleIncentive = false;
      incentiveAmount = '₹0';
      incentiveTier = 'Att. < 86.66%';
    } else if (batchHours >= 7) {
      isEligibleIncentive = true;
      incentiveAmount = '₹2,000';
      incentiveExtraHours = batchHours - 5;
      incentiveTier = `🏆 Tier 2 (≥7h: +${incentiveExtraHours}h Extra)`;
    } else if (batchHours >= 6) {
      isEligibleIncentive = true;
      incentiveAmount = '₹1,000';
      incentiveExtraHours = 1;
      incentiveTier = '💰 Tier 1 (6h: +1h Extra)';
    } else {
      isEligibleIncentive = false;
      incentiveAmount = '₹0';
      incentiveTier = 'Standard (≤ 5h)';
    }

    return {
      daysList,
      presentCount,
      pendingCount,
      halfDayCount,
      leaveCount,
      totalHoursStr,
      attPercent,
      isAttQualified,
      batchHours,
      incentiveExtraHours,
      incentiveTier,
      isEligibleIncentive,
      incentiveAmount,
      totalRecords: daysList.length
    };
  };

  const [copied, setCopied] = useState(false);
  const handleCopyForExcel = () => {
    let tsv = `========================================================\n`;
    tsv += `MONTHLY ATTENDANCE SUMMARY REPORT (${MONTH_NAMES[selectedMonth - 1].toUpperCase()} ${selectedYear})\n`;
    tsv += `========================================================\n\n`;

    activeTrainers.forEach((trainer) => {
      const data = getMonthReportData(trainer);
      tsv += `TRAINER: ${trainer.name} (@${trainer.username})\n`;
      tsv += `SUMMARY -> Present Days: ${data.presentCount} | Half Days: ${data.halfDayCount} | Leave Days: ${data.leaveCount} | Total Hrs: ${data.totalHoursStr} | Attendance %: ${data.attPercent}%\n\n`;
      tsv += `Date\tDay\tStatus\tMark In\tMark Out\tDuration\tLocation\n`;
      data.daysList.forEach((log) => {
        tsv += `${log.date} ${selectedYear}\t${log.day}\t${log.status.toUpperCase()}\t${log.markIn}\t${log.markOut}\t${log.duration}\t${log.loc}\n`;
      });
      tsv += `\n--------------------------------------------------------\n\n`;
    });
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const exportUrl = `/api/export-attendance?month=${selectedMonth}&year=${selectedYear}${selectedTrainer !== 'all' ? `&trainer=${selectedTrainer}` : ''}`;

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              📊 Monthly Attendance Report
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Comprehensive faculty attendance, working hours, and incentive eligibility records.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start">
            <button
              onClick={handleCopyForExcel}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              {copied ? '✅ Copied to Clipboard!' : '📋 Copy for Excel'}
            </button>

            <a
              href={exportUrl}
              download
              className="px-5 py-2.5 rounded-xl bg-[#28a745] hover:bg-[#218838] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" /> 📥 Export Excel
            </a>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <UserIcon className="h-3.5 w-3.5" /> TRAINER:
            </span>
            <select
              value={selectedTrainer}
              onChange={(e) => setSelectedTrainer(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-medium cursor-pointer focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Trainers</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> MONTH:
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-medium cursor-pointer focus:outline-none focus:border-blue-500"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              YEAR:
            </span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-medium cursor-pointer focus:outline-none focus:border-blue-500"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          <button
            onClick={fetchReports}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" /> Generate
          </button>
        </div>

        <div className="px-5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            Showing Report for: <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong> ({activeTrainers.length} Trainers)
          </span>
          <span className="text-[11px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg">
            ⚡ Incentive Criteria: ≥ 86.66% Attendance + Extra Batch Hours (6h = ₹1,000 | ≥ 7h = ₹2,000)
          </span>
        </div>

        <div className="space-y-8">
          {activeTrainers.map((trainer) => {
            const report = getMonthReportData(trainer);

            return (
              <div
                key={trainer.id}
                className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#667eea] text-white font-bold text-base">
                      {trainer.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">{trainer.name}</h3>
                      <p className="text-xs text-slate-400 font-mono">@{trainer.username}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {report.totalRecords} records • {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-3.5 text-center space-y-1">
                    <div className="text-2xl font-extrabold text-emerald-600">{report.presentCount}</div>
                    <div className="text-[11px] font-bold text-emerald-800 uppercase flex items-center justify-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> PRESENT
                    </div>
                  </div>

                  <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-3.5 text-center space-y-1">
                    <div className="text-2xl font-extrabold text-amber-600">{report.halfDayCount}</div>
                    <div className="text-[11px] font-bold text-amber-800 uppercase flex items-center justify-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" /> HALF DAY
                    </div>
                  </div>

                  <div className="rounded-2xl bg-rose-50/70 border border-rose-200 p-3.5 text-center space-y-1">
                    <div className="text-2xl font-extrabold text-rose-600">{report.leaveCount}</div>
                    <div className="text-[11px] font-bold text-rose-800 uppercase flex items-center justify-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-rose-500" /> LEAVE
                    </div>
                  </div>

                  <div className="rounded-2xl bg-cyan-50/70 border border-cyan-200 p-3.5 text-center space-y-1">
                    <div className="text-2xl font-extrabold text-cyan-700 font-mono">{report.totalHoursStr}</div>
                    <div className="text-[11px] font-bold text-cyan-800 uppercase flex items-center justify-center gap-1">
                      ⏱️ TOTAL HRS
                    </div>
                  </div>

                  <div className="rounded-2xl bg-purple-50/70 border border-purple-200 p-3.5 text-center space-y-1">
                    <div className="text-2xl font-extrabold text-purple-700 font-mono">{report.attPercent}%</div>
                    <div className="text-[11px] font-bold text-purple-800 uppercase flex items-center justify-center gap-1">
                      📈 ATTENDANCE
                    </div>
                  </div>

                  <div className={`rounded-2xl border p-3 text-center space-y-1 ${
                    report.isEligibleIncentive
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                      : 'bg-slate-50/80 border-slate-200 text-slate-600'
                  }`}>
                    <div className="text-2xl font-black font-mono text-emerald-700">
                      {report.incentiveAmount}
                    </div>
                    <div className="text-[11px] font-extrabold uppercase flex items-center justify-center gap-1">
                      💰 INCENTIVE
                    </div>
                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                      report.isEligibleIncentive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200/80 text-slate-600'
                    }`}>
                      {report.incentiveTier}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-2">
                  <div className="rounded-2xl border border-slate-100 p-5 bg-[#fafcff] flex flex-col items-center justify-center space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      ATTENDANCE BREAKDOWN
                    </div>

                    <div className="relative h-36 w-36 flex items-center justify-center">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                        <circle
                          cx="18"
                          cy="18"
                          r="14"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="4"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="14"
                          fill="none"
                          stroke="#28a745"
                          strokeWidth="4"
                          strokeDasharray={`${Math.round(parseFloat(report.attPercent) * 0.88)}, 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <div className="text-lg font-extrabold text-slate-800">{report.attPercent}%</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase">PRESENT</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600 w-full pt-2 border-t border-slate-200">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#28a745]" /> Present ({report.presentCount})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#d97706]" /> Pending ({report.pendingCount})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#fd7e14]" /> Half Day ({report.halfDayCount})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#dc3545]" /> Leave ({report.leaveCount})
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-3 rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                      <table className="w-full text-left text-xs min-w-[650px]">
                        <thead className="bg-[#2d3748] text-white font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Day</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Mark In</th>
                            <th className="px-4 py-3">Mark Out</th>
                            <th className="px-4 py-3">Duration</th>
                            <th className="px-4 py-3">Location</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {report.daysList.map((log, i) => (
                            <tr key={i} className={`hover:bg-slate-50 transition-colors ${
                              log.status === 'week_off' ? 'bg-slate-50/50 text-slate-400' : ''
                            }`}>
                              <td className="px-4 py-3 font-bold text-slate-800">{log.date}</td>
                              <td className="px-4 py-3 text-slate-500 font-medium">{log.day}</td>
                              <td className="px-4 py-3">
                                {log.status === 'present' ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1 w-fit">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Present
                                  </span>
                                ) : log.status === 'pending' && log.markIn && log.markIn !== '--' ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center gap-1 w-fit border border-amber-300">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600" /> ⏳ Pending
                                  </span>
                                ) : log.status === 'leave' ? (
                                  <span className={`px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit ${
                                    log.leaveStatus === 'pending'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-purple-100 text-purple-800 border border-purple-200'
                                  }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                      log.leaveStatus === 'pending' ? 'bg-amber-600' : 'bg-purple-600'
                                    }`} />
                                    {log.leaveStatus === 'pending' ? 'Leave (Pending)' : 'Leave (Approved)'}
                                  </span>
                                ) : log.status === 'half_day' ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center gap-1 w-fit">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600" /> Half Day
                                  </span>
                                ) : log.status === 'absent' ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center gap-1 w-fit">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-600" /> Absent
                                  </span>
                                ) : log.status === 'week_off' ? (
                                  <span className="text-slate-400 font-medium">Week Off</span>
                                ) : (
                                  <span className="text-slate-300 font-medium">--</span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-mono font-medium text-slate-700">{log.markIn}</td>
                              <td className="px-4 py-3 font-mono font-medium text-slate-700">{log.markOut}</td>
                              <td className="px-4 py-3 font-mono">
                                {log.duration !== '--' ? (
                                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                                    {log.duration}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">--</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                                {log.status !== 'week_off' ? (
                                  <a
                                    href="https://www.google.com/maps"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                                    <span className="truncate">{log.loc}</span>
                                  </a>
                                ) : (
                                  <span>{log.loc}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
    </main>
  );
}
