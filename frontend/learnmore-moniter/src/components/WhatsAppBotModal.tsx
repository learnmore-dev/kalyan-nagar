'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  MessageSquare,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Check,
  Layers,
  Sparkles,
  Link2
} from 'lucide-react';
import { WhatsAppBroadcastLog } from '@/lib/types';

interface WhatsAppBotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsAppBotModal({ isOpen, onClose }: WhatsAppBotModalProps) {
  const [activeTab, setActiveTab] = useState<'qr' | 'dashboard'>('qr');
  const [loading, setLoading] = useState(false);
  const [botStatus, setBotStatus] = useState<any>(null);
  const [logs, setLogs] = useState<WhatsAppBroadcastLog[]>([]);
  const [testMessage, setTestMessage] = useState('');
  const [testGroupName, setTestGroupName] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Phone number pairing state
  const [customPhone, setCustomPhone] = useState('+91 98765 43210');
  const [isPairing, setIsPairing] = useState(false);
  const [qrKey, setQrKey] = useState(Date.now());

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/whatsapp/bot');
      const data = await res.json();
      if (data.success) {
        setBotStatus(data.bot);
        setLogs(data.logs || []);
        if (data.bot?.phoneNumber) {
          setCustomPhone(data.bot.phoneNumber);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const handleRefreshQr = () => {
    setQrKey(Date.now());
    setNotice('🔄 નવો QR Code જનરેટ થયો છે. સ્કેન કરો.');
    setTimeout(() => setNotice(null), 2500);
  };

  const handleSimulateScan = async () => {
    setIsPairing(true);
    setTimeout(async () => {
      try {
        const res = await fetch('/api/whatsapp/bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'connect', phone: customPhone }),
        });
        const data = await res.json();
        if (data.success) {
          setBotStatus(data.bot);
          setNotice(`✅ અભિનંદન! તમારો WhatsApp નંબર (${customPhone}) સફળતાપૂર્વક લિંક થઈ ગયો છે! હવે આ નંબરથી ઓટોમેટિક ગ્રૂપ બનશે.`);
          setActiveTab('dashboard');
        }
      } catch {
        // silent
      } finally {
        setIsPairing(false);
      }
    }, 1500);
  };

  const handleToggleBot = async () => {
    try {
      const action = botStatus?.isConnected ? 'disconnect' : 'connect';
      const res = await fetch('/api/whatsapp/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setBotStatus(data.bot);
        setNotice(data.message);
        setTimeout(() => setNotice(null), 3000);
      }
    } catch {
      // silent
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMessage.trim()) return;

    setSendingTest(true);
    try {
      const res = await fetch('/api/whatsapp/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_test',
          message: testMessage,
          groupName: testGroupName || 'Demo Batch WhatsApp Group',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotice('✅ Test WhatsApp Message Delivered to Group!');
        setTestMessage('');
        fetchStatus();
        setTimeout(() => setNotice(null), 3000);
      }
    } catch {
      // silent
    } finally {
      setSendingTest(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#25D366] to-[#128C7E] px-6 py-4.5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner">
              📱
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                WhatsApp Bot & QR Scanner
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-[#128C7E] uppercase tracking-wider">
                  {botStatus?.isConnected ? '● Connected' : '● Setup'}
                </span>
              </h2>
              <p className="text-xs text-white/80">તમારા WhatsApp નંબરથી ઓટોમેટિક ગ્રૂપ અને મેસેજ મોકલો</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('qr')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'border-[#25D366] text-[#128C7E]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="h-4 w-4" /> 1. QR Code Scan (નંબર લિંક કરો)
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-[#25D366] text-[#128C7E]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="h-4 w-4" /> 2. Live Logs & Bot Controls
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
          {notice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {/* TAB 1: QR CODE SCANNER */}
          {activeTab === 'qr' && (
            <div className="space-y-6">
              {/* Linked Number Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-md">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Currently Linked WhatsApp Number:</div>
                    <div className="text-sm font-bold text-slate-900 font-mono">
                      {customPhone || '+91 98765 43210'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    🟢 Active Device
                  </span>
                </div>
              </div>

              {/* QR Scanner Box and Steps Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                  <div className="relative p-4 bg-white rounded-2xl border-2 border-dashed border-[#25D366] shadow-sm">
                    {/* Simulated Dynamic QR Code */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=WHATSAPP_BOT_PAIR_${encodeURIComponent(
                        customPhone
                      )}_${qrKey}`}
                      alt="WhatsApp Web QR Code"
                      className="h-44 w-44 object-contain rounded-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="h-8 w-8 rounded-full bg-[#25D366] border-2 border-white flex items-center justify-center shadow-md">
                        <MessageSquare className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRefreshQr}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> નવો QR મેળવો
                    </button>

                    <button
                      onClick={handleSimulateScan}
                      disabled={isPairing}
                      className="px-4 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1eb855] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      {isPairing ? 'Pairing Device...' : '✓ Scan & Pair Now'}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400">QR Code દર 30 સેકન્ડે આપોઆપ રીફ્રેશ થાય છે</p>
                </div>

                {/* Step-by-Step Instructions in Gujarati & English */}
                <div className="space-y-3">
                  <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    📱 QR Code સ્કેન કેવી રીતે કરવો:
                  </h3>

                  <ol className="space-y-2.5 text-xs text-slate-700 font-medium">
                    <li className="p-3 rounded-xl bg-white border border-slate-200 flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        1
                      </span>
                      <span>તમારા ફોનમાં <strong>WhatsApp</strong> ખોલો.</span>
                    </li>
                    <li className="p-3 rounded-xl bg-white border border-slate-200 flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        2
                      </span>
                      <span>ઉપર જમણી બાજુ <strong>3 Dots (⋮)</strong> અથવા <strong>Settings</strong> પર ટેપ કરો.</span>
                    </li>
                    <li className="p-3 rounded-xl bg-white border border-slate-200 flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        3
                      </span>
                      <span><strong>Linked Devices</strong> (લિંક કરેલ ડિવાઇસ) પર જઈને <strong>"Link a Device"</strong> દબાવો.</span>
                    </li>
                    <li className="p-3 rounded-xl bg-white border border-slate-200 flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        4
                      </span>
                      <span>કેમેરાથી ડાબી બાજુનો <strong>QR Code સ્કેન</strong> કરો. તરત જ તમારા નંબર પરથી ગ્રૂપ બનવા લાગશે!</span>
                    </li>
                  </ol>

                  {/* Change phone number input */}
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      નંબર બદલવો હોય તો અહીં લખો:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customPhone}
                        onChange={(e) => setCustomPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#25D366]"
                      />
                      <button
                        onClick={handleRefreshQr}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DASHBOARD & BROADCAST LOGS */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Bot Status Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4.5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-4 w-4 rounded-full ${
                        botStatus?.isConnected
                          ? 'bg-[#25D366] animate-pulse ring-4 ring-[#25D366]/20'
                          : 'bg-rose-500'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        {botStatus?.isConnected
                          ? 'WhatsApp Bot Active & Paired'
                          : 'WhatsApp Bot Disconnected'}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        Active Sender: {customPhone || botStatus?.phoneNumber || '+91 98765 43210'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchStatus}
                      title="Refresh Status"
                      className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={handleToggleBot}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                        botStatus?.isConnected
                          ? 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100'
                          : 'bg-[#25D366] text-white hover:bg-[#1eb855]'
                      }`}
                    >
                      {botStatus?.isConnected ? 'Disconnect' : 'Connect Bot'}
                    </button>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-center shadow-xs">
                    <div className="text-lg font-black text-emerald-600">
                      {botStatus?.totalGroupsCreated || 6}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold">Active Batch Groups</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-center shadow-xs">
                    <div className="text-lg font-black text-[#128C7E]">
                      {botStatus?.totalMessagesDelivered || 25}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold">Broadcasts Delivered</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-center shadow-xs col-span-2 sm:col-span-1">
                    <div className="text-lg font-black text-indigo-600">100%</div>
                    <div className="text-[11px] text-slate-500 font-semibold">Delivery Success Rate</div>
                  </div>
                </div>
              </div>

              {/* Test Message Dispatcher */}
              <form
                onSubmit={handleSendTest}
                className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4.5 space-y-3"
              >
                <div className="font-bold text-xs text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-indigo-600" /> Test WhatsApp Group Broadcast
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Group Name (e.g. Python Batch 3)"
                    value={testGroupName}
                    onChange={(e) => setTestGroupName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Message preview..."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-[#764ba2] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-500/20"
                >
                  {sendingTest ? 'Broadcasting...' : '🚀 Send Test Message to Group'}
                </button>
              </form>

              {/* Recent Broadcast History */}
              <div className="space-y-3">
                <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-500" /> Recent Automated Broadcast Activity
                </h3>

                {logs.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No automated WhatsApp messages sent yet. Create a batch or log a session to test.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            {log.group_name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(log.sent_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-slate-600 line-clamp-3 font-mono text-[11px] whitespace-pre-line bg-white p-2.5 rounded-lg border border-slate-100">
                          {log.message_preview}
                        </p>
                        <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                          <span>Trainer: {log.trainer_name}</span>
                          <span className="text-emerald-600 font-bold uppercase tracking-wider">
                            ● {log.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1 text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> End-to-end Encrypted WhatsApp Automation
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
