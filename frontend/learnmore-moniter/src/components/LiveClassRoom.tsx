import React, { useEffect, useRef, useState } from 'react';
import { Disc, Square, Clock, Share2, ArrowLeft, PhoneOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LiveClassRoomProps {
  batchId: string;
  batchName: string;
  userName: string;
  isTrainer?: boolean;
}

export function LiveClassRoom({
  batchId,
  batchName,
  userName,
  isTrainer = false,
}: LiveClassRoomProps) {
  const navigate = useNavigate();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  const handleExitMeeting = () => {
    try {
      localStorage.removeItem('active_live_meeting');
    } catch {}
    if (apiRef.current) {
      try {
        apiRef.current.dispose();
      } catch {}
    }
    navigate(isTrainer ? '/trainer/dashboard' : '/');
  };

  // Time Tracking
  const [startTime, setStartTime] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Initialize start time and timer on client only
  useEffect(() => {
    setStartTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => setElapsedSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Embed Jitsi Inside Container
  useEffect(() => {
    const domain = 'meet.jit.si';
    const cleanId = batchId.replace(/[^a-zA-Z0-9]/g, '_');
    const roomName = `LearnmoreClass_${cleanId}`;

    let api: any = null;

    const initJitsi = () => {
      if (!jitsiContainerRef.current) return;
      jitsiContainerRef.current.innerHTML = '';
      const options = {
        roomName,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: `${userName} ${isTrainer ? '(Trainer)' : ''}`,
        },
        configOverwrite: {
          startWithAudioMuted: !isTrainer,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
          enableWelcomePage: false,
          defaultRemoteDisplayName: 'Student',
          videoQuality: {
            preferredCodec: 'VP9',
            maxBitratesVideo: {
              low: 200000,
              standard: 700000,
              high: 2500000,
            },
          },
          disableTileView: false,
          startScreenSharing: false,
          channelLastN: -1,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'desktop',
            'chat',
            'raisehand',
            'tileview',
            'hangup',
            'fullscreen',
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          APP_NAME: 'Learnmore Live Classroom',
          VERTICAL_FILMSTRIP: true,
          OPTIMAL_BROWSING_EXPERIENCE: true,
        },
      };
      api = new (window as any).JitsiMeetExternalAPI(domain, options);
      apiRef.current = api;

      api.addEventListener('screenSharingStatusChanged', (event: any) => {
        if (event.on) {
          try {
            api.executeCommand('setTileView', false);
          } catch {}
        }
      });

      try {
        localStorage.setItem(
          'active_live_meeting',
          JSON.stringify({
            batchId,
            batchName,
            isTrainer,
            url: window.location.pathname,
            startedAt: new Date().toISOString(),
          })
        );
      } catch {}

      const handleMeetingEnd = () => {
        try {
          localStorage.removeItem('active_live_meeting');
        } catch {}
        if (api) {
          try {
            api.dispose();
          } catch {}
        }
        navigate(isTrainer ? '/trainer/dashboard' : '/');
      };

      api.addEventListener('videoConferenceLeft', handleMeetingEnd);
      api.addEventListener('readyToClose', handleMeetingEnd);
    };

    const loadJitsiScript = () => {
      if ((window as any).JitsiMeetExternalAPI) {
        initJitsi();
      } else {
        const existingScript = document.getElementById('jitsi-external-api');
        if (existingScript) {
          existingScript.onload = initJitsi;
          return;
        }
        const script = document.createElement('script');
        script.id = 'jitsi-external-api';
        script.src = `https://${domain}/external_api.js`;
        script.async = true;
        script.onload = initJitsi;
        document.body.appendChild(script);
      }
    };

    loadJitsiScript();

    return () => {
      if (api) {
        try {
          api.dispose();
        } catch {}
      }
    };
  }, [batchId, userName, isTrainer, navigate]);

  // Screen & Audio Recording (Browser MediaRecorder)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });
      recordedChunksRef.current = [];

      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Lecture_${batchName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.webm`;
        a.click();
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting screen recording:', err);
      alert('Screen recording permission was cancelled or not supported.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  // WhatsApp 1-Click Invite
  const shareViaWhatsApp = () => {
    const joinUrl = `${window.location.origin}/live/join/${batchId}`;
    const text = encodeURIComponent(
      `📢 *Learnmore Technologies - Live Class Started!* \n\n` +
      `Batch: *${batchName}*\n` +
      `Trainer: *${userName}*\n\n` +
      `👉 Join Class directly: ${joinUrl}\n\n` +
      `(No login required. Click link and enter your name)`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-white overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="h-12 sm:h-16 bg-slate-900 border-b border-slate-800 px-2 sm:px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-black tracking-tight text-white flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span className="truncate">{batchName}</span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400 hidden xs:block">
              Started: <span className="text-slate-200">{startTime}</span>
            </p>
          </div>
        </div>

        {/* Live Timer & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          {isTrainer && (
            <>
              {/* Screen Recorder Button */}
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] sm:text-xs font-extrabold cursor-pointer animate-pulse"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Stop</span>
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-400 text-[11px] sm:text-xs font-extrabold cursor-pointer transition-colors"
                  title="Record Lecture"
                >
                  <Disc className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Record</span>
                </button>
              )}

              {/* 1-Click WhatsApp Invite */}
              <button
                onClick={shareViaWhatsApp}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-extrabold cursor-pointer shadow-sm transition-colors"
                title="Send WhatsApp Invite"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Invite</span>
              </button>

              {/* End / Leave Class Button */}
              <button
                onClick={handleExitMeeting}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white text-[11px] sm:text-xs font-extrabold cursor-pointer shadow-sm transition-colors"
                title="End & Leave Class"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leave</span>
              </button>
            </>
          )}

          {!isTrainer && (
            <button
              onClick={handleExitMeeting}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white text-[11px] sm:text-xs font-extrabold cursor-pointer shadow-sm transition-colors"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Leave</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Jitsi Container */}
      <main className="flex-1 w-full h-full relative">
        <div ref={jitsiContainerRef} className="w-full h-full" />
      </main>
    </div>
  );
}
