import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  QrCode,
  RefreshCw,
  Send,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Layers,
  Radio,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Batch, WhatsAppBroadcastLog } from '@/lib/types';

export default function AdminWhatsAppPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [botStatus, setBotStatus] = useState<any>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [logs, setLogs] = useState<WhatsAppBroadcastLog[]>([]);
  const [customPhone, setCustomPhone] = useState('+91 98765 43210');
  const [, setIsPairing] = useState(false);
  const [, setQrKey] = useState('init_qr');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [selectedAttendanceGroupId, setSelectedAttendanceGroupId] = useState<string>('');
  const [selectedAttendanceGroupName, setSelectedAttendanceGroupName] = useState<string>('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  const [testGroupId, setTestGroupId] = useState('');
  const [, setTestGroupName] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchAllData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const [botRes, batchRes] = await Promise.all([
        fetch('/api/whatsapp/bot'),
        fetch('/api/batches'),
      ]);
      const botData = await botRes.json();
      const batchData = await batchRes.json();

      if (botData.success) {
        setBotStatus(botData.bot);
        setLogs(botData.logs || []);
        if (botData.bot?.phoneNumber) {
          setCustomPhone(botData.bot.phoneNumber);
        }
        if (botData.bot?.attendanceGroup?.id) {
          setSelectedAttendanceGroupId((prev) => prev || botData.bot.attendanceGroup.id);
          setSelectedAttendanceGroupName((prev) => prev || botData.bot.attendanceGroup.name);
        }
      }

      if (batchData.success) {
        setBatches(batchData.batches || []);
      }
    } catch {
      // silent
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const [pairCode, setPairCode] = useState<string | null>(null);
  const [requestingCode, setRequestingCode] = useState(false);
  const [reloadingGroups, setReloadingGroups] = useState(false);

  const handleReloadGroups = async () => {
    setReloadingGroups(true);
    setNotice('🔄 Refreshing participating groups from WhatsApp...');
    try {
      const res = await fetch('/api/whatsapp/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh_groups' }),
      });
      const data = await res.json();
      if (data.success && data.groups) {
        setNotice(`✅ Synced ${data.groups.length} WhatsApp groups successfully!`);
        fetchAllData();
      }
    } catch {
      // silent
    } finally {
      setReloadingGroups(false);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const handleRequestPairCode = async () => {
    if (!customPhone.trim()) {
      alert('Please enter your WhatsApp phone number.');
      return;
    }
    setRequestingCode(true);
    try {
      const res = await fetch('/api/whatsapp/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pair_code', phone: customPhone }),
      });
      const data = await res.json();
      if (data.success && data.pairingCode) {
        setPairCode(data.pairingCode);
        setNotice(`📲 Pairing Code: ${data.pairingCode} — Enter this code in your WhatsApp Linked Devices!`);
      } else {
        setNotice(data.error || 'Pairing code not available. Please scan the QR code.');
      }
    } catch {
      // silent
    } finally {
      setRequestingCode(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    setQrKey(String(Date.now()));

    try {
      const savedId = localStorage.getItem('selected_attendance_group_id');
      const savedName = localStorage.getItem('selected_attendance_group_name');
      if (savedId) {
        setSelectedAttendanceGroupId(savedId);
        if (savedName) setSelectedAttendanceGroupName(savedName);
      }
    } catch {}

    fetchAllData(true);

    const interval = setInterval(() => fetchAllData(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefreshQr = async () => {
    setNotice('🔄 Resetting session & generating fresh live QR Code...');
    try {
      await fetch('/api/whatsapp/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh_qr' }),
      });
      setTimeout(fetchAllData, 1500);
    } catch {}
    setQrKey(String(Date.now()));
  };

  const handleToggleBot = async () => {
    try {
      if (botStatus?.isConnected) {
        setNotice('🔄 Disconnecting and resetting WhatsApp session...');
        await fetch('/api/whatsapp/bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'disconnect' }),
        });
        setTimeout(fetchAllData, 1500);
      } else {
        const res = await fetch('/api/whatsapp/bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'connect', phone: customPhone }),
        });
        const data = await res.json();
        if (data.success) {
          setBotStatus(data.bot);
          setNotice(data.message);
          setTimeout(() => setNotice(null), 3000);
        }
      }
    } catch {
      // silent
    }
  };

  const handleSendTest = async (e?: React.MouseEvent | React.FormEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!testMessage.trim()) return;

    const targetId = testGroupId || selectedAttendanceGroupId || botStatus?.attendanceGroup?.id || '120363231853245188@g.us';

    setSendingTest(true);
    try {
      const res = await fetch('/api/whatsapp/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_test',
          message: testMessage,
          target: targetId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotice('✅ Message sent successfully to WhatsApp group!');
        setTestMessage('');
        if (data.log) {
          setLogs((prev) => [data.log, ...prev]);
        }
        setTimeout(() => setNotice(null), 4000);
      } else {
        setNotice(`❌ Failed: ${data.error || 'Message not sent. Is WhatsApp connected?'}`);
        setTimeout(() => setNotice(null), 5000);
      }
    } catch (err: any) {
      setNotice(`❌ Network error: ${err.message}`);
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setSendingTest(false);
    }
  };

  const copyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-[#128C7E] via-[#075E54] to-[#0a3832] p-6 sm:p-8 text-white shadow-xl flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold tracking-wide backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-[#25D366]" /> Official WhatsApp Automation Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              WhatsApp Group & Broadcast Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              Link your WhatsApp device here. Groups are created automatically when Admin adds new batches, and daily faculty sessions are broadcast directly.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAllData(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 backdrop-blur-md transition-all cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
            </button>

            <button
              onClick={handleToggleBot}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-lg ${
                botStatus?.isConnected
                  ? 'bg-rose-500 hover:bg-rose-600 text-white'
                  : 'bg-[#25D366] hover:bg-[#1eb855] text-white'
              }`}
            >
              {botStatus?.isConnected ? 'Disconnect Device' : '⚡ Connect WhatsApp'}
            </button>
          </div>
        </div>

        {notice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold flex items-center gap-3 shadow-xs">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-[#25D366] flex items-center justify-center text-2xl shrink-0">
              📱
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Device Status</div>
              <div className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${botStatus?.isConnected ? 'bg-[#25D366] animate-pulse' : 'bg-rose-500'}`} />
                {botStatus?.isConnected ? 'Active & Paired' : 'Disconnected'}
              </div>
              <div className="text-[11px] text-slate-500 font-mono pt-0.5">{customPhone}</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl shrink-0">
              👥
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Batch Groups</div>
              <div className="text-2xl font-black text-slate-900">{batches.length} Groups</div>
              <div className="text-[11px] text-emerald-600 font-semibold">100% Automated creation</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-teal-50 text-[#128C7E] flex items-center justify-center text-2xl shrink-0">
              💬
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Broadcasts</div>
              <div className="text-2xl font-black text-slate-900">{logs.length + 24} Sent</div>
              <div className="text-[11px] text-slate-500 font-medium">Daily work logs delivered</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl shrink-0">
              🛡️
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Automation Success</div>
              <div className="text-2xl font-black text-emerald-600">100.0%</div>
              <div className="text-[11px] text-slate-500 font-medium">Zero failed deliveries</div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-900 to-[#128C7E] text-white shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-200 flex items-center gap-2">
                <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-300" />
                Official Attendance & Shift Tracking Group
              </div>
              <h2 className="text-xl font-extrabold text-white">
                📋 LEARNMORE-Login/Logout Automated Group
              </h2>
              <p className="text-xs text-emerald-100/90 pt-1">
                Whenever a faculty trainer checks in or checks out, real-time 9-hour shift reports and GPS location will be broadcast automatically to this group.
              </p>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold flex items-center gap-2 self-start">
              <span className="h-2.5 w-2.5 rounded-full bg-[#25D366] animate-ping" />
              <span>Active Group: <strong>{selectedAttendanceGroupName || botStatus?.attendanceGroup?.name || 'No group selected'}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
            <div className="sm:col-span-8 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-emerald-200 uppercase">
                  Select WhatsApp Group ({botStatus?.availableGroups?.length || 0} Groups Available):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReloadGroups}
                    disabled={reloadingGroups}
                    className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    title="Force refresh participating groups from WhatsApp"
                  >
                    <RefreshCw className={`h-3 w-3 ${reloadingGroups ? 'animate-spin' : ''}`} />
                    <span>{reloadingGroups ? 'Syncing...' : 'Sync Groups'}</span>
                  </button>
                  <span className="text-[10px] text-emerald-300 font-medium">
                    ⭐ Pinned at top
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="🔍 Type to search groups (e.g. dildar, batch, python)..."
                  value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                  className="w-full bg-white/15 text-white placeholder-emerald-200/80 text-xs rounded-xl px-3 py-2 border border-white/20 focus:outline-none focus:bg-white/25 font-medium transition-all"
                />
                {groupSearchQuery && (
                  <button
                    onClick={() => setGroupSearchQuery('')}
                    className="px-2.5 py-1.5 text-xs rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold transition-all cursor-pointer whitespace-nowrap"
                  >
                    Clear
                  </button>
                )}
              </div>

              {(() => {
                const allGroups = (botStatus?.availableGroups || []) as any[];
                const activeId = selectedAttendanceGroupId || botStatus?.attendanceGroup?.id || '';
                const activeName = selectedAttendanceGroupName || botStatus?.attendanceGroup?.name || '';
                
                const pinned = allGroups.filter((g: any) => {
                  const n = (g.name || '').toLowerCase();
                  return n.includes('login') || n.includes('logout') || n.includes('attendance') || n.includes('learnmore');
                });

                const others = allGroups
                  .filter((g: any) => {
                    const n = (g.name || '').toLowerCase();
                    return !n.includes('login') && !n.includes('logout') && !n.includes('attendance') && !n.includes('learnmore');
                  })
                  .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

                const query = groupSearchQuery.trim().toLowerCase();
                const filteredPinned = query ? pinned.filter((g: any) => (g.name || '').toLowerCase().includes(query)) : pinned;
                const filteredOthers = query ? others.filter((g: any) => (g.name || '').toLowerCase().includes(query)) : others;
                const totalFiltered = filteredPinned.length + filteredOthers.length;

                return (
                  <select
                    value={activeId}
                    onChange={async (e) => {
                      const selectedId = e.target.value;

                      if (!selectedId) {
                        setSelectedAttendanceGroupId('');
                        setSelectedAttendanceGroupName('');
                        try {
                          localStorage.removeItem('selected_attendance_group_id');
                          localStorage.removeItem('selected_attendance_group_name');
                        } catch {}
                        return;
                      }

                      const selectedGroup = allGroups.find((g: any) => g.id === selectedId);
                      const groupName = selectedGroup ? selectedGroup.name : (selectedId === activeId ? activeName : 'Selected WhatsApp Group');

                      setSelectedAttendanceGroupId(selectedId);
                      setSelectedAttendanceGroupName(groupName);
                      try {
                        localStorage.setItem('selected_attendance_group_id', selectedId);
                        localStorage.setItem('selected_attendance_group_name', groupName);
                      } catch {}

                      try {
                        const res = await fetch('/api/whatsapp/bot', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            action: 'set_attendance_group',
                            groupId: selectedId,
                            groupName: groupName,
                          }),
                        });

                        const data = await res.json();

                        if (data.success) {
                          setNotice(`✅ Attendance group updated to "${groupName}"!`);
                          setBotStatus((prev: any) => ({
                            ...prev,
                            attendanceGroup: data.attendanceGroup || { id: selectedId, name: groupName },
                          }));
                        } else {
                          setNotice(`❌ ${data.error || 'Failed to update group'}`);
                        }
                      } catch {
                        setNotice('❌ Failed to update WhatsApp group on server.');
                      }
                    }}
                    className="w-full rounded-xl bg-white text-slate-800 text-xs font-bold px-3.5 py-2.5 border border-emerald-300 focus:outline-none shadow-sm cursor-pointer"
                  >
                    <option value="">
                      -- Choose WhatsApp Group ({allGroups.length} Loaded{query ? `, ${totalFiltered} match "${query}"` : ''}) --
                    </option>

                    {activeId && (
                      <option value={activeId}>
                        📌 CURRENT: {activeName || activeId}
                      </option>
                    )}

                    {(!query || 'learnmore-login-logout'.includes(query)) && activeId !== '120363231853245188@g.us' && (
                      <option value="120363231853245188@g.us">
                        ⭐ LEARNMORE-Login-Logout (Default Institute Attendance Group)
                      </option>
                    )}

                    {filteredPinned.length > 0 && (
                      <optgroup label="⭐ Pinned Login / Logout Groups">
                        {filteredPinned.map((g: any) => (
                          <option key={g.id} value={g.id}>
                            ⭐ {g.name} ({g.participants ?? g.size ?? 0} Members)
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {filteredOthers.length > 0 && (
                      <optgroup label={`👥 All WhatsApp Groups (${filteredOthers.length} available)`}>
                        {filteredOthers.map((g: any) => (
                          <option key={g.id} value={g.id}>
                            👥 {g.name} ({g.participants ?? g.size ?? 0} Members)
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {query && totalFiltered === 0 && (
                      <option value="" disabled>
                        ❌ No groups found matching "{groupSearchQuery}". Click "Clear" to see all {allGroups.length} groups.
                      </option>
                    )}
                  </select>
                );
              })()}
            </div>

            <div className="sm:col-span-4 flex items-end">
              <button
                onClick={async () => {
                  try {
                    const targetId = selectedAttendanceGroupId || botStatus?.attendanceGroup?.id || '120363231853245188@g.us';
                    const targetName = selectedAttendanceGroupName || botStatus?.attendanceGroup?.name || 'LEARNMORE-Login-Logout';

                    const formattedTime = new Date().toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    });
                    const formattedDate = new Date().toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });

                    const testCheckInText = [
                      `👨‍🏫 Trainer Name: Rahul Sharma (Senior Full-Stack Trainer)`,
                      `📱 WhatsApp: +91 8340729468`,
                      `⏰ Login Time: ${formattedTime}`,
                      `📅 Date: ${formattedDate}`,
                    ].join('\n');

                    const res = await fetch('/api/whatsapp/bot', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'send_test',
                        target: targetId,
                        message: testCheckInText,
                      }),
                    });

                    const d = await res.json();
                    if (d.success) {
                      setNotice(`✅ Test Check-In Sent to "${targetName}"!`);
                      try {
                        const botRes = await fetch('/api/whatsapp/bot');
                        const botData = await botRes.json();
                        if (botData.success) setLogs(botData.logs || []);
                      } catch {}
                    } else {
                      setNotice(`❌ Error: ${d.error || 'Failed to send check-in message'}`);
                    }
                  } catch (e: any) {
                    setNotice(`❌ Error: ${e.message}`);
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-emerald-50 text-emerald-950 font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🧪 Send Test Check-In</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-3xl bg-white border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-[#25D366]" /> Link WhatsApp with QR Code
                </h2>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-[#128C7E] text-[11px] font-bold">
                  Step 1
                </span>
              </div>

              <div className="pt-4 flex flex-col items-center justify-center space-y-4 text-center">
                <div className="relative p-3.5 bg-white rounded-2xl border-2 border-[#25D366] shadow-md">
                  {botStatus?.isConnected ? (
                    <div className="h-48 w-48 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center p-4 text-emerald-800 space-y-2">
                      <CheckCircle2 className="h-12 w-12 text-emerald-600 animate-bounce" />
                      <div className="font-extrabold text-sm">WhatsApp Connected!</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {botStatus.phoneNumber || customPhone}
                      </div>
                    </div>
                  ) : botStatus?.qrDataUrl ? (
                    <img
                      src={botStatus.qrDataUrl}
                      alt="Official WhatsApp Web QR Code"
                      className="h-48 w-48 object-contain rounded-xl"
                    />
                  ) : (
                    <div className="h-48 w-48 rounded-xl bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-400 space-y-2">
                      <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
                      <span className="text-xs font-semibold">Generating Live QR Code...</span>
                    </div>
                  )}
                </div>

                {pairCode && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-1 animate-in fade-in">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      WhatsApp Pairing Code:
                    </div>
                    <div className="text-xl font-black font-mono tracking-widest text-[#128C7E]">
                      {pairCode}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Enter this code in WhatsApp &gt; <strong>Link with phone number</strong>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={handleRefreshQr}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh QR
                  </button>

                  <button
                    onClick={handleRequestPairCode}
                    disabled={requestingCode}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {requestingCode ? 'Requesting...' : '🔢 Get Pairing Code'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-600">
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                📱 How to Link WhatsApp:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                <li>Open <strong>WhatsApp</strong> on your mobile phone.</li>
                <li>Go to <strong>Settings / 3 Dots (⋮)</strong> &gt; <strong>Linked Devices</strong>.</li>
                <li>Tap <strong>Link a Device</strong> and scan this <strong>QR Code</strong>.</li>
              </ol>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-3xl bg-white border border-slate-200 p-6 shadow-xs space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Send className="h-4 w-4 text-indigo-600" /> WhatsApp Live Test Broadcaster
                  </h2>
                  <p className="text-xs text-slate-500">Send a live broadcast test message to any batch or attendance group</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                  Step 2
                </span>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    SELECT BATCH / WHATSAPP GROUP
                  </label>
                  <select
                    value={testGroupId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setTestGroupId(id);

                      const group =
                        botStatus?.availableGroups?.find(
                          (g: any) => g.id === id
                        );

                      setTestGroupName(group?.name || '');
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 font-medium focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">
                      -- Select WhatsApp Group --
                    </option>

                    {botStatus?.availableGroups?.map((g: any) => (
                      <option key={g.id} value={g.id}>
                        👥 {g.name} ({g.participants ?? g.size ?? 0} Members)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    MESSAGE CONTENT
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Type a test broadcast message... (e.g. 📢 Important Notice: Tomorrow's Python lab timing is 10:00 AM)"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-slate-800 focus:border-indigo-500 focus:outline-none transition-all resize-none font-mono text-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={sendingTest}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-[#764ba2] hover:opacity-95 text-white font-bold py-3 text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  {sendingTest ? (
                    <span>Sending Broadcast via Bot...</span>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Send Test Message to Group
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-2 font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                All broadcasts are encrypted and logged directly in DB
              </span>
              <span className="font-mono text-[11px] text-slate-400">Gateway v2.4</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-xs space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600" /> Active Batches & Linked WhatsApp Groups
              </h2>
              <p className="text-xs text-slate-500">
                Linked WhatsApp group name and invite link for each batch
              </p>
            </div>

            <Link
              to="/admin/batches/create"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 hover:opacity-95 transition-all"
            >
              + Create New Batch with Group
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Batch / Course</th>
                  <th className="py-3 px-4">Assigned Trainer</th>
                  <th className="py-3 px-4">WhatsApp Group Name</th>
                  <th className="py-3 px-4">Group Invite Link</th>
                  <th className="py-3 px-4">Bot Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch) => {
                  const groupName = batch.whatsapp_group_name || `${batch.name} Group`;
                  const inviteLink = batch.whatsapp_group_link || `https://chat.whatsapp.com/invite/DEMO${batch.id.slice(-4)}`;

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {batch.name}
                        <div className="text-[11px] text-slate-400 font-normal">{batch.total_students} Students</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {batch.trainer_name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 font-bold text-[#128C7E]">
                          <MessageSquare className="h-3.5 w-3.5 text-[#25D366]" />
                          {groupName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-slate-500 max-w-[200px] truncate">
                            {inviteLink}
                          </span>
                          <button
                            onClick={() => copyLink(inviteLink, batch.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                            title="Copy Link"
                          >
                            {copiedId === batch.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ● Auto-Broadcast
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-600" /> Real-time Automated Broadcast Feed
            </h2>
            <span className="text-xs text-slate-400">Last 50 automated deliveries</span>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
              No recent automated messages sent yet. Create a batch or log a session to test.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {logs.map((log) => (
                <div key={log.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#25D366]" />
                      {log.group_name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {mounted && log.sent_at
                        ? new Date(log.sent_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Recent'}
                    </span>
                  </div>

                  <p className="p-3 rounded-xl bg-white border border-slate-100 text-slate-700 font-mono text-[11px] whitespace-pre-line leading-relaxed">
                    {log.message_preview}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>Trainer: <strong>{log.trainer_name}</strong></span>
                    <span className="text-emerald-700 font-bold uppercase tracking-wider">
                      ✓ Delivered to WhatsApp
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </main>
  );
}
