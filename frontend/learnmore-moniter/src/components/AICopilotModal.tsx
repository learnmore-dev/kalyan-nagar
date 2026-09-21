'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getStoredUser } from '@/lib/auth';
import { User } from '@/lib/types';
import {
  X,
  Send,
  Sparkles,
  Maximize2,
  Minimize2,
  RefreshCw,
  Shield,
  GraduationCap,
  ChevronRight,
  Globe,
  Calendar,
  AlertCircle,
  Megaphone,
  Clock,
  MapPin,
  Users,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  isLeaveForm?: boolean;
  isBroadcastForm?: boolean;
  actionButtons?: Array<{
    label: string;
    action: string;
    payload?: any;
  }>;
}

type Language = 'en' | 'hi' | 'gu';

export default function AICopilotModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI Voice State (Speech-to-Text & Text-to-Speech)
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Available WhatsApp Groups list for Admin
  const [availableGroups, setAvailableGroups] = useState<Array<{ id: string; name: string; size?: number }>>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('120363231853245188@g.us');
  const [selectedGroupName, setSelectedGroupName] = useState('LEARNMORE-Login-Logout');

  // Leave Form State inside chat (for Trainer)
  const [leaveType, setLeaveType] = useState('sick');
  const [leaveDate, setLeaveDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // Custom Meeting / Broadcast Form State (for Admin)
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingTime, setMeetingTime] = useState('Today at 5:00 PM');
  const [meetingVenue, setMeetingVenue] = useState('Campus Conference Room');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    const savedLang = localStorage.getItem('learnmore_ai_lang') as Language;
    if (savedLang && ['en', 'hi', 'gu'].includes(savedLang)) {
      setLanguage(savedLang);
    }
    const savedVoice = localStorage.getItem('learnmore_ai_voice');
    if (savedVoice !== null) {
      setIsVoiceEnabled(savedVoice === 'true');
    }

    // Fetch WhatsApp groups for Admin dropdown selector
    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/whatsapp/bot');
        if (res.ok) {
          const data = await res.json();
          if (data.bot?.availableGroups && data.bot.availableGroups.length > 0) {
            setAvailableGroups(data.bot.availableGroups);
          }
          if (data.bot?.attendanceGroup?.id) {
            setSelectedGroupId(data.bot.attendanceGroup.id);
            setSelectedGroupName(data.bot.attendanceGroup.name);
          }
        }
      } catch {
        // silent
      }
    };
    fetchGroups();
  }, [isOpen]);

  // Clean markdown and symbols for natural voice speech output
  const cleanTextForSpeech = (rawText: string): string => {
    return rawText
      .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold
      .replace(/\*(.*?)\*/g, '$1') // remove italic
      .replace(/•/g, '')
      .replace(/#{1,6}\s+/g, '') // remove headings
      .replace(/https?:\/\/[^\s]+/g, '') // remove URLs
      .replace(/[^\w\s\u0A80-\u0AFF\u0900-\u097F.,!?]/g, ' ') // keep gujarati & hindi characters
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Text-To-Speech (AI Voice Output)
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!isVoiceEnabled) return;

    window.speechSynthesis.cancel(); // Stop any previous speaking

    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);

    // Set voice language based on current selection
    if (language === 'gu') {
      utterance.lang = 'gu-IN';
    } else if (language === 'hi') {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-IN';
    }

    // Try finding natural local voices
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find((v) =>
      language === 'gu'
        ? v.lang.startsWith('gu')
        : language === 'hi'
        ? v.lang.startsWith('hi')
        : v.lang.startsWith('en-IN') || v.lang.startsWith('en')
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleVoiceOutput = () => {
    const nextState = !isVoiceEnabled;
    setIsVoiceEnabled(nextState);
    localStorage.setItem('learnmore_ai_voice', String(nextState));
    if (!nextState) {
      stopSpeaking();
    }
  };

  // Speech-To-Text (Microphone Voice Input)
  const startVoiceInput = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceNotice('⚠️ Voice Recognition is not supported in this browser. Please use Chrome/Edge.');
      setTimeout(() => setVoiceNotice(null), 4000);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;

      if (language === 'gu') {
        recognition.lang = 'gu-IN';
      } else if (language === 'hi') {
        recognition.lang = 'hi-IN';
      } else {
        recognition.lang = 'en-IN';
      }

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice(
          language === 'gu'
            ? '🎙️ સાંભળી રહ્યું છે... બોલો!'
            : language === 'hi'
            ? '🎙️ Sun raha hoon... Boliye!'
            : '🎙️ Listening... Speak now!'
        );
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setVoiceNotice(`⚠️ Mic error: ${event.error || 'Could not recognize voice'}`);
        setTimeout(() => setVoiceNotice(null), 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
        setVoiceNotice(null);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('learnmore_ai_lang', newLang);

    if (user) {
      const isAdmin = user.role === 'admin';
      let welcomeText = '';
      if (newLang === 'gu') {
        welcomeText = isAdmin
          ? `નમસ્તે એડમિન સર! 🙏 હું **Learnmore AI Copilot** છું.\n\nતમે મને ફેકલ્ટી હાજરી, ૯-કલાક શિફ્ટ પાલન, લાઈવ રડાર, રજા મંજૂરી અથવા WhatsApp જાહેરાતો વિશે બોલી કે લખીને પૂછી શકો છો.`
          : `નમસ્તે ${user.name}! 🙏 હું તમારો **Faculty AI Assistant** છું.\n\nતમે મને તમારો લાઈવ શિફ્ટ ટાઈમ (૯-કલાક ગોલ), માસિક હાજરી સારાંશ, અથવા રજાની અરજી વિશે બોલી કે લખીને પૂછી શકો છો.`;
      } else if (newLang === 'hi') {
        welcomeText = isAdmin
          ? `Namaste Admin Sir! 🙏 Mai **Learnmore AI Copilot** hoon.\n\nAap mujhse faculty attendance, 9-hour shift compliance, live radar, leave approvals ya WhatsApp announcements ke bare me bol kar ya likh kar pooch sakte hain.`
          : `Namaste ${user.name}! 🙏 Mai aapka **Faculty AI Assistant** hoon.\n\nAap mujhse apna live shift time (9-hour goal), monthly attendance summary, ya direct Leave apply karne ke bare me bol kar ya likh kar pooch sakte hain.`;
      } else {
        welcomeText = isAdmin
          ? `Hello Admin! 🙏 I am your **Learnmore AI Copilot**.\n\nYou can ask me by voice or text about faculty attendance, 9-hour shift compliance, live radar, leave approvals, or WhatsApp announcements.`
          : `Hello ${user.name}! 🙏 I am your **Faculty AI Assistant**.\n\nYou can ask me by voice or text about your live shift time (9-hour target), monthly attendance summary, or apply for leave directly.`;
      }

      setMessages([
        {
          id: `msg_welcome_${Date.now()}`,
          sender: 'bot',
          text: welcomeText,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        },
      ]);
      speakText(welcomeText);
    }
  };

  // Set initial welcome greeting in Default English
  useEffect(() => {
    if (user && messages.length === 0) {
      const isAdmin = user.role === 'admin';
      const welcomeText = isAdmin
        ? `Hello Admin! 🙏 I am your **Learnmore AI Copilot** with Voice & Chat.\n\nYou can speak or type to check attendance, 9-hour shift compliance, live radar, or broadcast custom WhatsApp meetings.`
        : `Hello ${user.name}! 🙏 I am your **Faculty AI Assistant** with Voice & Chat.\n\nYou can speak or type to check your shift time, 9-hour goal, monthly attendance, or apply for leave.`;

      setMessages([
        {
          id: 'msg_welcome',
          sender: 'bot',
          text: welcomeText,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        },
      ]);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const isAdmin = user?.role === 'admin';

  // Dynamic quick suggestion prompts based on Language and Role
  const quickPrompts = isAdmin
    ? language === 'gu'
      ? [
          { label: '👥 આજે કોણ હાજર છે?', prompt: 'આજે કોણ કોણ હાજર છે?' },
          { label: '⚠️ ૯-કલાક શિફ્ટ સ્ટેટસ', prompt: 'Faculty 9 hours shift status dikhao' },
          { label: '⏳ પેન્ડિંગ રજાઓ', prompt: 'Kya koi leave request pending hai?' },
          { label: '📡 લાઈવ રડાર', prompt: 'Live faculty radar aur idle status' },
          { label: '📢 WhatsApp મીટિંગ', prompt: 'Broadcast message bhejna hai' },
        ]
      : language === 'hi'
      ? [
          { label: '👥 Aaj kaun aaya hai?', prompt: 'Aaj kaun kaun present hai?' },
          { label: '⚠️ 9 Hours Shift Status', prompt: 'Faculty 9 hours shift status dikhao' },
          { label: '⏳ Pending Leaves', prompt: 'Kya koi leave request pending hai?' },
          { label: '📡 Live Faculty Radar', prompt: 'Live faculty radar aur idle status dikhao' },
          { label: '📢 WhatsApp Meeting', prompt: 'Broadcast message bhejna hai' },
        ]
      : [
          { label: '👥 Who is Present Today?', prompt: 'Who is present today?' },
          { label: '⚠️ 9-Hour Compliance', prompt: 'Show 9-hour shift compliance report' },
          { label: '⏳ Pending Leaves', prompt: 'Are there any pending leaves?' },
          { label: '📡 Live Radar & Idle', prompt: 'Show live faculty radar and idle status' },
          { label: '📢 WhatsApp Meeting Broadcast', prompt: 'Broadcast custom meeting announcement to WhatsApp' },
        ]
    : language === 'gu'
    ? [
        { label: '⏱️ મારો શિફ્ટ ટાઈમ', prompt: 'Mera shift time kitna hua?' },
        { label: '📊 માસિક હાજરી સારાંશ', prompt: 'Mera monthly attendance summary' },
        { label: '📅 મારી બેચ શેડ્યુલ', prompt: 'Meri batches aur schedule dikhao' },
        { label: '📝 રજા માટે અરજી', prompt: 'Mujhe leave apply karni hai' },
      ]
    : language === 'hi'
    ? [
        { label: '⏱️ Mera Shift Time?', prompt: 'Mera shift time kitna hua?' },
        { label: '📊 Monthly Summary', prompt: 'Mera monthly attendance summary' },
        { label: '📅 Aaj ki Batches', prompt: 'Meri batches aur schedule dikhao' },
        { label: '📝 Apply for Leave', prompt: 'Mujhe leave apply karni hai' },
      ]
    : [
        { label: '⏱️ My Shift Time', prompt: 'What is my shift time today?' },
        { label: '📊 Monthly Summary', prompt: 'Show my monthly attendance summary' },
        { label: '📅 My Schedule', prompt: 'Show my assigned batches and schedule' },
        { label: '📝 Apply Leave', prompt: 'Apply for leave' },
      ];

  const sendMessage = async (textToSend?: string) => {
    const msg = textToSend || input;
    if (!msg.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: msg,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          user,
          role: user?.role || 'trainer',
          language,
        }),
      });
      const data = await res.json();

      const lowerMsg = msg.toLowerCase();
      const isLeaveTrigger =
        !isAdmin &&
        (lowerMsg.includes('leave') ||
          lowerMsg.includes('chhutti') ||
          lowerMsg.includes('holiday') ||
          lowerMsg.includes('raja'));

      const isBroadcastTrigger =
        isAdmin &&
        (lowerMsg.includes('broadcast') ||
          lowerMsg.includes('meeting') ||
          lowerMsg.includes('announcement') ||
          lowerMsg.includes('notice'));

      const botReplyText = data.reply || 'Sorry, I could not process your request right now.';

      const botMsg: ChatMessage = {
        id: `msg_bot_${Date.now()}`,
        sender: 'bot',
        text: botReplyText,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        isLeaveForm: isLeaveTrigger,
        isBroadcastForm: isBroadcastTrigger,
        actionButtons: data.actionButtons || [],
      };

      setMessages((prev) => [...prev, botMsg]);

      // Speak response aloud via AI Voice
      speakText(botReplyText);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          sender: 'bot',
          text: '⚠️ Server connection error. Please try again in a moment.',
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionButton = async (btn: { label: string; action: string; payload?: any }) => {
    if (btn.action === 'open_leave_form') {
      const prompt = '📝 Please fill out the Leave Details & Reason below:';
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_leave_form_${Date.now()}`,
          sender: 'bot',
          text: prompt,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          isLeaveForm: true,
        },
      ]);
      speakText(prompt);
      return;
    }

    if (btn.action === 'open_broadcast_form') {
      const prompt = '📢 Please select the target group and enter custom meeting details below:';
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_broadcast_form_${Date.now()}`,
          sender: 'bot',
          text: prompt,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          isBroadcastForm: true,
        },
      ]);
      speakText(prompt);
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: btn.action,
          payload: btn.payload,
          user,
          role: user?.role || 'trainer',
          language,
        }),
      });
      const data = await res.json();
      const reply = data.reply || `Action executed successfully: ${btn.label}`;

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_action_${Date.now()}`,
          sender: 'bot',
          text: reply,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        },
      ]);
      speakText(reply);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) {
      setLeaveError('⚠️ Please enter a specific Reason for taking leave!');
      return;
    }
    setLeaveError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply_leave',
          payload: {
            leaveType,
            startDate: leaveDate,
            endDate: leaveDate,
            reason: leaveReason.trim(),
          },
          user,
          role: user?.role || 'trainer',
          language,
        }),
      });
      const data = await res.json();
      const reply = data.reply || '✅ Leave request submitted successfully and sent to WhatsApp Group!';

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_leave_confirmed_${Date.now()}`,
          sender: 'bot',
          text: reply,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        },
      ]);
      speakText(reply);

      setLeaveReason('');
    } catch {
      setLeaveError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim()) {
      setBroadcastError('⚠️ Please enter the Meeting Name / Topic!');
      return;
    }
    setBroadcastError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'whatsapp_broadcast',
          payload: {
            title: meetingTitle.trim(),
            meetingTime: meetingTime.trim() || 'Today',
            venue: meetingVenue.trim() || 'Conference Room',
            notes: meetingNotes.trim(),
            targetGroupId: selectedGroupId,
            targetGroupName: selectedGroupName,
          },
          user,
          role: user?.role || 'admin',
          language,
        }),
      });
      const data = await res.json();
      const reply = data.reply || `📢 Custom meeting announcement broadcast to "${selectedGroupName}" successfully!`;

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_broadcast_confirmed_${Date.now()}`,
          sender: 'bot',
          text: reply,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        },
      ]);
      speakText(reply);

      setMeetingTitle('');
      setMeetingNotes('');
    } catch {
      setBroadcastError('Server error while sending broadcast. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    stopSpeaking();
    setMessages([]);
  };

  return (
    <>
      {/* Floating Launcher Button in Bottom-Right Corner - Compact Round Circle */}
      <div className="fixed bottom-5 right-5 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="relative flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 ring-4 ring-blue-500/25 group cursor-pointer"
            title="Learnmore AI Copilot"
            aria-label="Open AI Copilot"
          >
            <span className="animate-ping absolute -top-0.5 -right-0.5 inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 opacity-75"></span>
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white"></span>
            <Sparkles className="h-6 w-6 text-yellow-300 group-hover:rotate-12 transition-transform" />
          </button>
        )}
      </div>

      {/* Floating Chat Modal Window */}
      {isOpen && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex flex-col bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden transition-all duration-300 ${
            isExpanded
              ? 'w-[95vw] sm:w-[680px] h-[85vh] max-h-[750px]'
              : 'w-[95vw] sm:w-[460px] h-[640px] max-h-[88vh]'
          }`}
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-xl bg-white shadow-sm flex items-center justify-center">
                <img src="/logo.png" alt="Logo" className="h-7 w-auto object-contain" />
              </div>
              <div>
                <div className="font-extrabold text-sm flex items-center gap-1.5 leading-tight">
                  <span>Learnmore AI Copilot</span>
                  <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                  {isSpeaking && (
                    <span className="flex items-center gap-0.5 text-[10px] text-emerald-300 bg-white/10 px-1.5 py-0.5 rounded-full animate-pulse">
                      <Volume2 className="h-3 w-3 animate-bounce" /> Speaking
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-blue-100 font-medium flex items-center gap-1">
                  {isAdmin ? (
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3 text-emerald-300" /> 👑 Admin Full Control
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3 text-cyan-200" /> 🎓 Faculty Personal Copilot
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Voice Mute / Unmute Button */}
              <button
                onClick={toggleVoiceOutput}
                title={isVoiceEnabled ? 'Mute AI Voice Output' : 'Enable AI Voice Output'}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isVoiceEnabled ? 'bg-emerald-500/30 text-emerald-200 hover:bg-emerald-500/40' : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {isVoiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              <button
                onClick={resetChat}
                title="Restart Chat"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Collapse' : 'Expand'}
                className="hidden sm:block p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => {
                  stopSpeaking();
                  setIsOpen(false);
                }}
                title="Close"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Interactive Language Selector Toolbar */}
          <div className="px-4 py-2 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
              <Globe className="h-3.5 w-3.5 text-blue-600" />
              <span>Language:</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English (Default)
              </button>
              <button
                onClick={() => handleLanguageChange('hi')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                  language === 'hi'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                हिंदी
              </button>
              <button
                onClick={() => handleLanguageChange('gu')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                  language === 'gu'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ગુજરાતી
              </button>
            </div>
          </div>

          {/* Voice Listening Notice Bar */}
          {voiceNotice && (
            <div className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-xs font-bold flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
                <span>{voiceNotice}</span>
              </div>
              {isListening && (
                <button
                  onClick={startVoiceInput}
                  className="px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-[10px] uppercase tracking-wider"
                >
                  Done
                </button>
              )}
            </div>
          )}

          {/* Quick Action Suggestion Chips */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(qp.prompt)}
                disabled={loading}
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[11px] font-bold border border-slate-200 shadow-2xs whitespace-nowrap transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#f8fafc]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs shrink-0 shadow-xs mt-1">
                    🤖
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 text-xs shadow-xs space-y-3 relative group ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white font-medium rounded-tr-xs'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs font-normal'
                  }`}
                >
                  <div className="leading-relaxed space-y-1">
                    {msg.text.split('\n').map((line, lIdx) => {
                      if (!line.trim()) return <div key={lIdx} className="h-1.5" />;

                      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
                      return (
                        <p key={lIdx} className={line.startsWith('•') ? 'pl-2 text-slate-700' : ''}>
                          {parts.map((part, pIdx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return (
                                <strong key={pIdx} className="font-extrabold text-slate-900">
                                  {part.slice(2, -2)}
                                </strong>
                              );
                            }
                            if (part.startsWith('*') && part.endsWith('*')) {
                              return (
                                <em key={pIdx} className="italic text-slate-600">
                                  {part.slice(1, -1)}
                                </em>
                              );
                            }
                            return part;
                          })}
                        </p>
                      );
                    })}
                  </div>

                  {/* Interactive Inline Leave Reason Form (Trainer) */}
                  {msg.isLeaveForm && (
                    <form
                      onSubmit={handleLeaveSubmit}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                    >
                      <div className="text-[11px] font-extrabold text-slate-900 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-blue-600" />
                        <span>Leave Application Form (WhatsApp Notice)</span>
                      </div>

                      {leaveError && (
                        <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-center gap-1.5 animate-shake">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{leaveError}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Leave Type
                          </label>
                          <select
                            value={leaveType}
                            onChange={(e) => setLeaveType(e.target.value)}
                            className="w-full p-2 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                          >
                            <option value="sick">🤒 Sick Leave</option>
                            <option value="casual">🏖️ Casual Leave</option>
                            <option value="emergency">🚨 Emergency Leave</option>
                            <option value="optional_holiday">🎉 Optional Holiday</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            value={leaveDate}
                            onChange={(e) => setLeaveDate(e.target.value)}
                            className="w-full p-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          Reason for Leave (Mandatory) <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={leaveReason}
                          onChange={(e) => {
                            setLeaveReason(e.target.value);
                            if (leaveError) setLeaveError(null);
                          }}
                          placeholder="e.g. Suffering from high viral fever and taking doctor advised rest..."
                          className="w-full p-2 rounded-xl bg-white border border-slate-200 text-[11px] font-medium text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-[11px] shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {loading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <>
                            <span>🚀 Submit Leave & Dispatch WhatsApp Notice</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* Interactive Custom Meeting Broadcast Form (Admin) with Group Selector */}
                  {msg.isBroadcastForm && (
                    <form
                      onSubmit={handleBroadcastSubmit}
                      className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3"
                    >
                      <div className="text-[11px] font-extrabold text-blue-950 flex items-center gap-1">
                        <Megaphone className="h-3.5 w-3.5 text-blue-600" />
                        <span>Custom Meeting Broadcast (to WhatsApp Group)</span>
                      </div>

                      {broadcastError && (
                        <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-center gap-1.5 animate-shake">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{broadcastError}</span>
                        </div>
                      )}

                      {/* Group Selector Dropdown */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                          <Users className="h-3 w-3 text-blue-600" /> Target WhatsApp Group <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={selectedGroupId}
                          onChange={(e) => {
                            setSelectedGroupId(e.target.value);
                            const found = availableGroups.find((g) => g.id === e.target.value);
                            setSelectedGroupName(found ? found.name : 'Selected WhatsApp Group');
                          }}
                          className="w-full p-2 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                        >
                          <option value="">-- Select Target WhatsApp Group --</option>
                          {availableGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                              👥 {g.name} ({g.size || 0} members)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          Meeting Name / Topic <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={meetingTitle}
                          onChange={(e) => {
                            setMeetingTitle(e.target.value);
                            if (broadcastError) setBroadcastError(null);
                          }}
                          placeholder="e.g. All Faculty Weekly Review Meeting"
                          className="w-full p-2 rounded-xl bg-white border border-slate-200 text-[11px] font-semibold text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-blue-600" /> Time
                          </label>
                          <input
                            type="text"
                            value={meetingTime}
                            onChange={(e) => setMeetingTime(e.target.value)}
                            placeholder="e.g. Today at 4:30 PM"
                            className="w-full p-2 rounded-xl bg-white border border-slate-200 text-[11px] font-semibold text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-blue-600" /> Venue / Room
                          </label>
                          <input
                            type="text"
                            value={meetingVenue}
                            onChange={(e) => setMeetingVenue(e.target.value)}
                            placeholder="e.g. Conference Room / Lab 1"
                            className="w-full p-2 rounded-xl bg-white border border-slate-200 text-[11px] font-semibold text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          Agenda / Instructions (Optional)
                        </label>
                        <input
                          type="text"
                          value={meetingNotes}
                          onChange={(e) => setMeetingNotes(e.target.value)}
                          placeholder="e.g. Please bring student attendance & project reports..."
                          className="w-full p-2 rounded-xl bg-white border border-slate-200 text-[11px] font-medium text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white font-extrabold text-[11px] shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {loading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <>
                            <Megaphone className="h-3.5 w-3.5" />
                            <span>📢 Broadcast Custom Meeting to WhatsApp</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* Interactive Action Buttons */}
                  {msg.actionButtons && msg.actionButtons.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2 border-t border-slate-100">
                      {msg.actionButtons.map((btn, bIdx) => (
                        <button
                          key={bIdx}
                          onClick={() => handleActionButton(btn)}
                          disabled={loading}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-[11px] border border-blue-200 shadow-2xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <span>{btn.label}</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[9px]">
                    {msg.sender === 'bot' ? (
                      <button
                        onClick={() => speakText(msg.text)}
                        title="Play audio voice"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                      >
                        <Volume2 className="h-3 w-3" />
                        <span>Listen Voice</span>
                      </button>
                    ) : <span />}

                    <span className={`font-mono ${msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 items-center text-xs text-slate-500 font-medium p-2">
                <div className="h-6 w-6 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xs animate-bounce">
                  🤖
                </div>
                <span className="animate-pulse">
                  {language === 'gu'
                    ? 'Learnmore AI ડેટા તપાસી રહ્યું છે...'
                    : language === 'hi'
                    ? 'Learnmore AI data check kar raha hai...'
                    : 'Learnmore AI is processing your request...'}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box with Voice Mic Controls */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            {/* Real-time Microphone Input Button */}
            <button
              type="button"
              onClick={startVoiceInput}
              title={isListening ? 'Stop Listening' : 'Click to Speak (English / Hindi / Gujarati)'}
              className={`p-2.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-300'
                  : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200'
              }`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isListening
                  ? '🎙️ Listening... Speak now...'
                  : language === 'gu'
                  ? 'બોલો કે લખો (દા.ત. આજે કોણ હાજર છે?)...'
                  : language === 'hi'
                  ? 'Boliye ya likhiye (e.g. Aaj kaun present hai?)...'
                  : 'Speak or type (e.g. Who is present today?)...'
              }
              className={`flex-1 px-4 py-2.5 rounded-2xl border text-xs text-slate-900 placeholder-slate-400 font-semibold focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all ${
                isListening ? 'bg-rose-50/50 border-rose-300' : 'bg-slate-50 border-slate-200'
              }`}
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md shadow-blue-600/20 disabled:opacity-40 transition-all cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
