'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle2, MapPin, AlertCircle, X } from 'lucide-react';

interface WebcamCaptureProps {
  onCapture: (photoBase64: string, coords?: { lat: string; lon: string; address: string }) => void;
  onCancel: () => void;
  title: string;
}

export default function WebcamCapture({ onCapture, onCancel, title }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: string; lon: string; address: string } | null>(null);
  const [locLoading, setLocLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Initialize camera and geolocation
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        setCameraError('Could not access camera. Using selfie placeholder.');
      }
    };

    // High-Accuracy Real Geolocation with Dynamic Reverse Geocoding
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          let realAddress = `GPS: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;

          try {
            // Fetch human readable address from OpenStreetMap Reverse Geocoding
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
              { headers: { 'Accept-Language': 'en' } }
            );
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData && geoData.address) {
                const a = geoData.address;
                const road = a.road || a.suburb || a.neighbourhood || a.commercial || '';
                const city = a.city || a.town || a.village || a.county || a.state_district || '';
                const state = a.state || '';
                const parts = [road, city, state].filter(Boolean);
                if (parts.length > 0) {
                  realAddress = parts.join(', ');
                } else if (geoData.display_name) {
                  realAddress = geoData.display_name.split(',').slice(0, 3).join(', ');
                }
              }
            }
          } catch {
            realAddress = `GPS: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
          }

          setLocation({
            lat: lat.toFixed(5),
            lon: lon.toFixed(5),
            address: realAddress,
          });
          setLocLoading(false);
        },
        async (err) => {
          // IP fallback if GPS permission is denied or unavailable
          try {
            const ipRes = await fetch('https://ipapi.co/json/');
            const ipData = await ipRes.json();
            if (ipData && ipData.latitude && ipData.longitude) {
              const city = ipData.city || '';
              const region = ipData.region || ipData.country_name || '';
              setLocation({
                lat: String(ipData.latitude),
                lon: String(ipData.longitude),
                address: city && region ? `${city}, ${region}` : `Lat: ${ipData.latitude}, Lon: ${ipData.longitude}`,
              });
            } else {
              setLocation(null);
            }
          } catch {
            setLocation(null);
          }
          setLocLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setLocation(null);
      setLocLoading(false);
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const takeSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhoto(dataUrl);
      }
    } else {
      // Fallback
      setPhoto('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400');
    }
  };

  const retake = () => {
    setPhoto(null);
  };

  const submit = () => {
    if (photo) {
      onCapture(photo, location || undefined);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Camera / Photo Area */}
        <div className="p-5 space-y-4">
          <div className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
            {photo ? (
              <img src={photo} alt="Attendance Selfie" className="h-full w-full object-cover" />
            ) : cameraError ? (
              <div className="text-center p-6 space-y-2">
                <AlertCircle className="h-8 w-8 text-amber-400 mx-auto" />
                <p className="text-xs text-slate-300">{cameraError}</p>
                <button
                  onClick={takeSnapshot}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                >
                  Use Demo Snapshot
                </button>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover mirror"
              />
            )}

            <canvas ref={canvasRef} className="hidden" />

            {/* In-view Crosshair overlay */}
            {!photo && !cameraError && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-dashed border-blue-400/50 rounded-full" />
              </div>
            )}
          </div>

          {/* Location Badge */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
            <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              {locLoading ? (
                <span className="text-slate-400">Fetching GPS coordinates...</span>
              ) : (
                <span className="text-slate-200">
                  <span className="font-mono text-emerald-400">{location?.lat}, {location?.lon}</span> • {location?.address}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            {photo ? (
              <>
                <button
                  onClick={retake}
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retake
                </button>
                <button
                  onClick={submit}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-lg shadow-blue-500/25 transition-all"
                >
                  <CheckCircle2 className="h-4 w-4" /> Confirm & Mark
                </button>
              </>
            ) : (
              <button
                onClick={takeSnapshot}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-lg shadow-blue-500/25 transition-all"
              >
                <Camera className="h-4 w-4" /> Take Selfie & Mark
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
