import React, { useState, useEffect } from 'react';
import {
  Building,
  MapPin,
  Save,
  CheckCircle2
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [instituteName, setInstituteName] = useState('Learnmore Technologies');
  const [address, setAddress] = useState('4th Floor, Alpha Complex, CG Road, Ahmedabad, Gujarat');
  const [shiftHours, setShiftHours] = useState('9');
  const [gpsRadius, setGpsRadius] = useState('200');
  const [latitude, setLatitude] = useState('23.0225');
  const [longitude, setLongitude] = useState('72.5714');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('institute_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.instituteName) setInstituteName(parsed.instituteName);
        if (parsed.address) setAddress(parsed.address);
        if (parsed.shiftHours) setShiftHours(parsed.shiftHours);
        if (parsed.gpsRadius) setGpsRadius(parsed.gpsRadius);
        if (parsed.latitude) setLatitude(parsed.latitude);
        if (parsed.longitude) setLongitude(parsed.longitude);
      }
    } catch {}
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const settings = {
      instituteName,
      address,
      shiftHours,
      gpsRadius,
      latitude,
      longitude,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem('institute_settings', JSON.stringify(settings));
    } catch {}
    setNotice('✅ Institute Settings saved successfully!');
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">
            SYSTEM CONFIGURATION
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          ⚙️ Institute Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Configure campus GPS coordinates, shift requirements, and institute metadata.
        </p>
      </div>

      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-600" /> Institute Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Institute Name
              </label>
              <input
                type="text"
                required
                value={instituteName}
                onChange={(e) => setInstituteName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Daily Full-Time Shift (Hours)
              </label>
              <input
                type="number"
                required
                min="4"
                max="12"
                value={shiftHours}
                onChange={(e) => setShiftHours(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Campus Address
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-600" /> Geo-Fencing & Selfie GPS Validation
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Campus Latitude
              </label>
              <input
                type="text"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Campus Longitude
              </label>
              <input
                type="text"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Allowed Geofence Radius (Meters)
              </label>
              <input
                type="number"
                required
                min="50"
                max="5000"
                value={gpsRadius}
                onChange={(e) => setGpsRadius(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Save className="h-4 w-4" /> Save Settings
          </button>
        </div>
      </form>
    </main>
  );
}
