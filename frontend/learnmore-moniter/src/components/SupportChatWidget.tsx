import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getStoredUser } from '@/lib/auth';
import {
  MessageSquare,
  X,
  Send,
  Paperclip,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Sparkles,
  Bot,
  User as UserIcon,
  Users,
  ShieldAlert,
  Download,
  ChevronDown,
  RefreshCw,
  Search,
  ArrowLeft,
  MessageCircle
} from 'lucide-react';

interface SupportMessage {
  id: string;
  thread_id: string;
  sender_id?: string;
  sender_name: string;
  sender_role: 'trainer' | 'admin' | string;
  message: string;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_data?: string | null;
  attachment_size?: string | null;
  created_at: string;
}

interface SupportThread {
  id: string;
  thread_type: 'admin_support' | 'direct_message' | 'faculty_lounge' | string;
  user_id: string;
  user_name: string;
  user_role: string;
  recipient_id?: string;
  recipient_name?: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | string;
  unread_admin_count: number;
  unread_user_count: number;
  unread_recipient_count?: number;
  last_message?: string | null;
  last_message_at: string;
  created_at: string;
  messages_count?: number;
}

interface ContactUser {
  id: string;
  name: string;
  username: string;
  role: string;
  designation: string;
  avatar?: string;
  email?: string;
  phone?: string;
}

interface AttachedFile {
  name: string;
  type: string;
  sizeStr: string;
  base64: string;
}

type TabType = 'admin_support' | 'direct_message' | 'faculty_lounge';

export default function SupportChatWidget() {
  const user = getStoredUser();
  const isAdmin = user?.role === 'admin';

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('admin_support');

  // Threads & Messages
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);

  // Direct chat contacts
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [contactSearch, setContactSearch] = useState<string>('');
  const [selectedContact, setSelectedContact] = useState<ContactUser | null>(null);

  // Form input & attachments
  const [inputText, setInputText] = useState<string>('');
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [unreadTotal, setUnreadTotal] = useState<number>(0);

  // Dropdown states
  const [showThreadPicker, setShowThreadPicker] = useState<boolean>(false);
  const [showStatusMenu, setShowStatusMenu] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Refs for stable background polling
  const selectedThreadRef = useRef<SupportThread | null>(null);
  selectedThreadRef.current = selectedThread;

  const activeTabRef = useRef<TabType>(activeTab);
  activeTabRef.current = activeTab;

  const isOpenRef = useRef<boolean>(isOpen);
  isOpenRef.current = isOpen;

  const isPollingRef = useRef<boolean>(false);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch contacts directory
  const fetchContacts = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/support/contacts?user_id=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.contacts)) {
        setContacts(data.contacts);
      }
    } catch {
      // silent
    }
  };

  // Fetch threads for the active channel
  const fetchThreads = useCallback(async (tab: TabType, recipientId?: string, silent = false) => {
    if (!user) return;
    try {
      if (!silent) setLoading(true);
      let url = `/api/support/threads?user_id=${encodeURIComponent(user.id)}&role=${encodeURIComponent(user.role || 'trainer')}&thread_type=${tab}`;
      if (recipientId) {
        url += `&recipient_id=${encodeURIComponent(recipientId)}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.success && Array.isArray(data.threads)) {
        setThreads((prevThreads) => {
          if (JSON.stringify(prevThreads) === JSON.stringify(data.threads)) {
            return prevThreads;
          }
          return data.threads;
        });

        // Unread badge count across threads
        let totalUnread = 0;
        data.threads.forEach((t: SupportThread) => {
          if (t.thread_type === 'admin_support') {
            totalUnread += isAdmin ? (t.unread_admin_count || 0) : (t.unread_user_count || 0);
          } else if (t.thread_type === 'direct_message') {
            if (t.user_id === user.id) totalUnread += (t.unread_user_count || 0);
            else if (t.recipient_id === user.id) totalUnread += (t.unread_recipient_count || 0);
          }
        });
        setUnreadTotal(totalUnread);

        const currentSel = selectedThreadRef.current;
        if (data.threads.length > 0) {
          if (!currentSel || currentSel.thread_type !== tab) {
            setSelectedThread(data.threads[0]);
          } else {
            const updated = data.threads.find((t: SupportThread) => t.id === currentSel.id);
            if (updated && (updated.status !== currentSel.status || updated.unread_admin_count !== currentSel.unread_admin_count || updated.unread_user_count !== currentSel.unread_user_count)) {
              setSelectedThread(updated);
            }
          }
        } else if (tab === 'direct_message' && !recipientId) {
          setSelectedThread(null);
        }
      }
    } catch {
      // silent
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user?.id, user?.role, isAdmin]);

  // Fetch messages for active thread
  const fetchMessages = useCallback(async (threadId: string) => {
    if (!threadId || !user) return;
    try {
      const url = `/api/support/threads/${threadId}/messages?user_id=${encodeURIComponent(user.id)}&role=${encodeURIComponent(user.role || 'trainer')}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages((prevMsgs) => {
          if (prevMsgs.length === data.messages.length && JSON.stringify(prevMsgs[prevMsgs.length - 1]) === JSON.stringify(data.messages[data.messages.length - 1])) {
            return prevMsgs;
          }
          setTimeout(() => scrollToBottom('smooth'), 100);
          return data.messages;
        });

        if (data.thread && selectedThreadRef.current?.id === threadId) {
          const t = data.thread;
          setSelectedThread((prev) => (prev?.status !== t.status ? t : prev));
        }
      }
    } catch {
      // silent
    }
  }, [user?.id, user?.role]);

  // Initial load & Polling cycle
  useEffect(() => {
    fetchContacts();
    fetchThreads(activeTab, selectedContact?.id, false);

    const pollTimer = setInterval(() => {
      if (document.hidden) return;
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      fetchThreads(activeTabRef.current, selectedContact?.id, true).then(() => {
        const activeThread = selectedThreadRef.current;
        if (activeThread && isOpenRef.current) {
          fetchMessages(activeThread.id);
        }
      }).finally(() => {
        isPollingRef.current = false;
      });
    }, 5000);

    return () => clearInterval(pollTimer);
  }, [activeTab, selectedContact?.id, fetchThreads, fetchMessages]);

  // When tab changes, reset selection appropriately
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setShowThreadPicker(false);
    setShowStatusMenu(false);
    setMessages([]);
    if (tab === 'direct_message') {
      setSelectedThread(null);
      setSelectedContact(null);
    } else {
      setSelectedContact(null);
      fetchThreads(tab, undefined, false);
    }
  };

  // When a contact is selected in Direct Message tab
  const handleSelectContact = (contact: ContactUser) => {
    setSelectedContact(contact);
    fetchThreads('direct_message', contact.id, false);
  };

  // Fetch messages when thread is selected
  useEffect(() => {
    if (selectedThread?.id && isOpen) {
      fetchMessages(selectedThread.id);
      setTimeout(() => scrollToBottom('auto'), 150);
    }
  }, [selectedThread?.id, isOpen, fetchMessages]);

  // File upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('File size should not exceed 8MB.');
      return;
    }

    const sizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        type: file.type,
        sizeStr,
        base64: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text && !attachedFile) return;
    if (sending || !user) return;

    setSending(true);

    try {
      const payload: any = {
        thread_id: selectedThread?.id,
        thread_type: activeTab,
        user_id: user.id,
        recipient_id: selectedContact?.id,
        sender_name: user.name || user.username || (isAdmin ? 'Admin' : 'Trainer'),
        sender_role: user.role || 'trainer',
        message: text,
        subject:
          activeTab === 'faculty_lounge'
            ? 'Faculty Community Lounge'
            : activeTab === 'direct_message'
            ? `Direct Chat with ${selectedContact?.name || 'Faculty'}`
            : `Doubt / Query from ${user.name || 'Trainer'}`,
        attachment_name: attachedFile ? attachedFile.name : undefined,
        attachment_type: attachedFile ? attachedFile.type : undefined,
        attachment_data: attachedFile ? attachedFile.base64 : undefined,
        attachment_size: attachedFile ? attachedFile.sizeStr : undefined,
      };

      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
        if (data.thread) {
          setSelectedThread(data.thread);
        }
        setInputText('');
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => scrollToBottom('smooth'), 100);
        fetchThreads(activeTab, selectedContact?.id, true);
      } else {
        alert(data.error || 'Failed to send message.');
      }
    } catch {
      alert('Network error while sending message.');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: 'open' | 'in_progress' | 'resolved') => {
    if (!selectedThread) return;
    setShowStatusMenu(false);
    try {
      const res = await fetch(`/api/support/threads/${selectedThread.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success && data.thread) {
        setSelectedThread(data.thread);
        setThreads((prev) =>
          prev.map((t) => (t.id === data.thread.id ? data.thread : t))
        );
      }
    } catch {
      // silent
    }
  };

  const sendQuickChip = (chipText: string) => {
    setInputText(chipText);
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.designation.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.role.toLowerCase().includes(contactSearch.toLowerCase())
  );

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {!isOpen && (
          <div
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-slate-900/90 text-white text-xs font-semibold px-3.5 py-2 rounded-full shadow-lg border border-slate-700/60 backdrop-blur-md cursor-pointer hover:bg-slate-900 transition-all hover:scale-105"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            <span>{isAdmin ? 'Trainer Helpdesk & Chat' : 'Faculty Chat & Doubts'}</span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Support & Community Chat"
          className="relative h-14 w-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 50%, #7c3aed 100%)',
            boxShadow: '0 8px 25px rgba(79, 70, 229, 0.45), 0 0 0 2px rgba(255, 255, 255, 0.2)',
          }}
        >
          {isOpen ? (
            <X className="h-6 w-6 transition-transform duration-200 rotate-90" />
          ) : (
            <>
              <MessageSquare className="h-6 w-6" />
              {unreadTotal > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white shadow-md animate-bounce">
                  {unreadTotal > 9 ? '9+' : unreadTotal}
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Chat Window Modal */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[390px] sm:w-[440px] max-w-[calc(100vw-32px)] h-[600px] max-h-[calc(100vh-120px)] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
          style={{
            boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Header */}
          <div
            className="p-3.5 text-white relative flex flex-col gap-2.5 shadow-md select-none"
            style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
            }}
          >
            {/* Top Row: User Avatar & Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-400 flex items-center justify-center text-white shadow-inner">
                    {activeTab === 'faculty_lounge' ? (
                      <Users className="h-4.5 w-4.5" />
                    ) : activeTab === 'direct_message' ? (
                      <UserIcon className="h-4.5 w-4.5" />
                    ) : isAdmin ? (
                      <Bot className="h-4.5 w-4.5" />
                    ) : (
                      <ShieldAlert className="h-4.5 w-4.5" />
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold tracking-tight truncate max-w-[190px]">
                    {activeTab === 'faculty_lounge'
                      ? 'Faculty Community Lounge'
                      : activeTab === 'direct_message'
                      ? selectedContact
                        ? `Chat with ${selectedContact.name}`
                        : 'Direct Trainer Chats'
                      : isAdmin
                      ? selectedThread
                        ? `Trainer: ${selectedThread.user_name}`
                        : 'Trainer Doubt Helpdesk'
                      : 'Learnmore Admin Support'}
                  </h3>
                  <p className="text-[10px] text-indigo-200 font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {activeTab === 'faculty_lounge'
                      ? 'All Faculty & Staff Channel'
                      : activeTab === 'direct_message'
                      ? selectedContact
                        ? selectedContact.designation
                        : 'Peer-to-Peer Faculty Chat'
                      : isAdmin
                      ? 'Live Doubt Resolution'
                      : 'Ask doubt or solve issues'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {isAdmin && activeTab === 'admin_support' && threads.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowThreadPicker(!showThreadPicker)}
                    className="p-1 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-all text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    title="Switch Trainer"
                  >
                    <span>Trainers ({threads.length})</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    fetchThreads(activeTab, selectedContact?.id, false);
                    if (selectedThread?.id) fetchMessages(selectedThread.id);
                  }}
                  className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Bottom Row: 3 Communication Channel Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-black/20 p-1 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => handleTabChange('admin_support')}
                className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer truncate ${
                  activeTab === 'admin_support'
                    ? 'bg-white text-indigo-950 shadow-sm'
                    : 'text-indigo-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <ShieldAlert className="h-3 w-3 shrink-0" />
                <span className="truncate">Admin Support</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('direct_message')}
                className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer truncate ${
                  activeTab === 'direct_message'
                    ? 'bg-white text-indigo-950 shadow-sm'
                    : 'text-indigo-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <UserIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">Direct (1-on-1)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('faculty_lounge')}
                className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer truncate ${
                  activeTab === 'faculty_lounge'
                    ? 'bg-white text-indigo-950 shadow-sm'
                    : 'text-indigo-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Users className="h-3 w-3 shrink-0" />
                <span className="truncate">Faculty Lounge</span>
              </button>
            </div>
          </div>

          {/* Admin Thread Picker Dropdown if open */}
          {isAdmin && showThreadPicker && activeTab === 'admin_support' && (
            <div className="bg-slate-900 text-white p-2.5 max-h-48 overflow-y-auto border-b border-slate-700/60 shadow-lg space-y-1 z-20">
              <p className="text-[10px] font-bold text-slate-400 uppercase px-2 mb-1">
                Select Trainer Doubt Conversation
              </p>
              {threads.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedThread(t);
                    setShowThreadPicker(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    selectedThread?.id === t.id
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold text-white">{t.user_name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{t.last_message || 'No messages'}</div>
                  </div>
                  {t.unread_admin_count > 0 && (
                    <span className="h-4 px-1.5 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                      {t.unread_admin_count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Status Bar for Admin Support */}
          {activeTab === 'admin_support' && selectedThread && (
            <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-2 flex items-center justify-between text-xs relative">
              <div className="flex items-center gap-1.5 font-medium text-slate-600">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    selectedThread.status === 'resolved'
                      ? 'bg-emerald-500'
                      : selectedThread.status === 'in_progress'
                      ? 'bg-amber-500'
                      : 'bg-indigo-500'
                  }`}
                />
                <span className="capitalize text-slate-700 font-bold text-[11px]">
                  Status: {selectedThread.status === 'in_progress' ? 'In Progress' : selectedThread.status === 'resolved' ? 'Resolved' : 'Open'}
                </span>
              </div>

              {isAdmin ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    className="text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Change Status</span>
                    <ChevronDown className="h-3 w-3 text-slate-500" />
                  </button>

                  {showStatusMenu && (
                    <div className="absolute right-0 top-8 bg-white rounded-xl shadow-xl border border-slate-200 py-1 w-32 z-30">
                      <button
                        type="button"
                        onClick={() => handleStatusChange('open')}
                        className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange('in_progress')}
                        className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-600 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        In Progress
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange('resolved')}
                        className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Resolved
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                selectedThread.status === 'resolved' && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Resolved
                  </span>
                )
              )}
            </div>
          )}

          {/* Direct Message Contacts List (when no contact is actively open) */}
          {activeTab === 'direct_message' && !selectedContact ? (
            <div className="flex-1 flex flex-col bg-[#f8fafc] overflow-hidden">
              {/* Search Bar */}
              <div className="p-3 bg-white border-b border-slate-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Search faculty trainers & colleagues…"
                    className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-slate-100 border border-slate-200 outline-none focus:bg-white focus:border-indigo-500 transition-all font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Contacts Stream */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 mb-1">
                  Select a colleague to message ({filteredContacts.length})
                </p>
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium">
                    No colleagues found.
                  </div>
                ) : (
                  filteredContacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectContact(c)}
                      className="w-full bg-white hover:bg-indigo-50/80 border border-slate-200/80 hover:border-indigo-300 p-3 rounded-2xl flex items-center justify-between transition-all group shadow-sm text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 truncate">
                            {c.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 truncate">
                            {c.designation} · <span className="capitalize">{c.role}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center text-indigo-600 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        <MessageCircle className="h-4 w-4" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Chat Messages Stream (for Admin Support, Direct Chat with selected contact, or Faculty Lounge) */
            <>
              {/* Back to contacts header if in Direct Message */}
              {activeTab === 'direct_message' && selectedContact && (
                <div className="bg-indigo-50/70 border-b border-indigo-100 px-3 py-1.5 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedContact(null);
                      setSelectedThread(null);
                      setMessages([]);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back to Faculty List
                  </button>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Direct Chat
                  </span>
                </div>
              )}

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
                {loading && messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                    <p className="text-xs font-semibold">Connecting to channel…</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {activeTab === 'faculty_lounge'
                          ? 'Welcome to Faculty Lounge!'
                          : activeTab === 'direct_message'
                          ? `Start a conversation with ${selectedContact?.name}`
                          : isAdmin
                          ? 'No Doubts or Queries Yet'
                          : 'How can Admin help you today?'}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-[280px] mt-1">
                        {activeTab === 'faculty_lounge'
                          ? 'Discuss syllabus updates, lecture timings, student progress and share materials with colleagues.'
                          : activeTab === 'direct_message'
                          ? 'Send notes, syllabus files, batch adjustments or chat directly with your colleague.'
                          : isAdmin
                          ? 'When trainers post doubts or issues, they will show up here.'
                          : 'Ask any doubt regarding batch syllabus, student attendance, leaves or technical questions.'}
                      </p>
                    </div>

                    {activeTab === 'admin_support' && !isAdmin && (
                      <div className="flex flex-wrap gap-1.5 justify-center max-w-[320px] pt-2">
                        <button
                          type="button"
                          onClick={() => sendQuickChip('Batch syllabus & topics completion query')}
                          className="text-[11px] bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200 hover:border-indigo-300 px-2.5 py-1.5 rounded-xl font-medium transition-all text-left cursor-pointer"
                        >
                          📚 Syllabus doubt
                        </button>
                        <button
                          type="button"
                          onClick={() => sendQuickChip('Attendance check-in / check-out adjustment issue')}
                          className="text-[11px] bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200 hover:border-indigo-300 px-2.5 py-1.5 rounded-xl font-medium transition-all text-left cursor-pointer"
                        >
                          🕒 Attendance issue
                        </button>
                        <button
                          type="button"
                          onClick={() => sendQuickChip('Need help with student assignments & document')}
                          className="text-[11px] bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200 hover:border-indigo-300 px-2.5 py-1.5 rounded-xl font-medium transition-all text-left cursor-pointer"
                        >
                          📄 Document help
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === user?.id || (m.sender_role === user?.role && m.sender_name === user?.name);
                    const isSenderAdmin = m.sender_role === 'admin';

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        {/* Sender badge */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 px-1 font-semibold">
                          <span>{isMe ? 'You' : m.sender_name}</span>
                          {isSenderAdmin && (
                            <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black px-1.5 py-0.2 rounded-md">
                              Admin
                            </span>
                          )}
                          <span>·</span>
                          <span className="flex items-center gap-0.5 text-slate-400">
                            <Clock className="h-2.5 w-2.5" />
                            {formatTime(m.created_at)}
                          </span>
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                            isMe
                              ? 'bg-indigo-600 text-white rounded-br-none'
                              : isSenderAdmin
                              ? 'bg-white text-slate-900 border-2 border-indigo-200 rounded-bl-none shadow-indigo-100'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                          }`}
                        >
                          {/* Text */}
                          {m.message && <p className="whitespace-pre-wrap">{m.message}</p>}

                          {/* Attachment */}
                          {m.attachment_data && (
                            <div
                              className={`mt-2.5 p-2.5 rounded-xl flex items-center justify-between gap-2.5 ${
                                isMe ? 'bg-indigo-700/60 text-white' : 'bg-slate-100 text-slate-900'
                              }`}
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                {m.attachment_type?.startsWith('image/') ? (
                                  <ImageIcon className="h-4 w-4 shrink-0 text-indigo-300" />
                                ) : (
                                  <FileText className="h-4 w-4 shrink-0 text-indigo-400" />
                                )}
                                <div className="truncate">
                                  <p className="font-bold truncate text-[11px]">
                                    {m.attachment_name || 'Document'}
                                  </p>
                                  {m.attachment_size && (
                                    <p className="text-[9px] opacity-75">{m.attachment_size}</p>
                                  )}
                                </div>
                              </div>

                              <a
                                href={m.attachment_data}
                                download={m.attachment_name || 'document'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                                  isMe
                                    ? 'hover:bg-indigo-800 text-white'
                                    : 'hover:bg-slate-200 text-slate-700'
                                }`}
                                title="Download / View Attachment"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachment Preview Bar before sending */}
              {attachedFile && (
                <div className="bg-indigo-50 border-t border-indigo-100 px-4 py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 overflow-hidden text-indigo-950">
                    <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span className="font-semibold truncate text-[11px]">{attachedFile.name}</span>
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-200/70 px-1.5 py-0.5 rounded">
                      {attachedFile.sizeStr}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 hover:bg-indigo-200 rounded-md text-indigo-700 transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                  title="Attach Document / Image"
                >
                  <Paperclip className="h-4 w-4" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    activeTab === 'faculty_lounge'
                      ? 'Share with all faculty & staff…'
                      : activeTab === 'direct_message'
                      ? `Message ${selectedContact?.name || 'colleague'}…`
                      : isAdmin
                      ? 'Type your solution / reply to trainer…'
                      : 'Describe your doubt or problem…'
                  }
                  disabled={sending}
                  className="flex-1 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-slate-900 px-3.5 py-2.5 rounded-xl text-xs font-medium outline-none border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />

                <button
                  type="submit"
                  disabled={sending || (!inputText.trim() && !attachedFile)}
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-indigo-200 transition-all cursor-pointer"
                >
                  {sending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
