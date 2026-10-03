import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setStoredUser } from '@/lib/auth';
import {
  User as UserIcon,
  Lock,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();

  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password Flow States: 'login' | 'forgot'
  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);

  // Forgot Password Fields
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // User details returned from server
  const [resetUserMeta, setResetUserMeta] = useState<{
    name?: string;
    username?: string;
    masked_email?: string | null;
    masked_phone?: string | null;
  } | null>(null);

  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // ----------------------------------------------------
  // LOGIN HANDLER
  // ----------------------------------------------------
  const handleLogin = async () => {
    const clean = username.trim();
    if (!clean || !password) {
      setError('Please enter your username and password.');
      return;
    }
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: clean, email: clean, password }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || !data?.success) {
        const errMsg =
          typeof data?.error === 'string'
            ? data.error
            : data?.error?.message || data?.message || 'Invalid username or password.';
        setError(errMsg);
        return;
      }
      if (!data?.user) {
        setError('Login succeeded but user details were not returned.');
        return;
      }

      setStoredUser(data.user);
      navigate(data.user.role === 'admin' ? '/admin/dashboard' : '/trainer/dashboard', {
        replace: true,
      });
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin();
    }
  };

  // ----------------------------------------------------
  // FORGOT PASSWORD STEP 1: REQUEST OTP
  // ----------------------------------------------------
  const handleRequestResetOtp = async (overrideIdentifier?: string) => {
    const ident = (overrideIdentifier || resetIdentifier).trim();
    if (!ident) {
      setResetError('Please enter your username or registered email address.');
      return;
    }

    setResetLoading(true);
    setResetError(null);
    setResetSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: ident }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        setResetError(data?.error || 'Account not found. Please verify your details.');
        return;
      }

      setResetToken(data.token);
      setResetUserMeta({
        name: data.name,
        username: data.username,
        masked_email: data.masked_email,
        masked_phone: data.masked_phone,
      });

      // Advance to Step 2
      setForgotStep(2);
      setResetSuccessMsg(
        data.masked_email
          ? `Verification code has been sent to ${data.masked_email}`
          : `Verification code generated for ${data.name || data.username}.`
      );
    } catch {
      setResetError('Could not reach server to generate reset code.');
    } finally {
      setResetLoading(false);
    }
  };

  // ----------------------------------------------------
  // FORGOT PASSWORD STEP 2: VERIFY & SET NEW PASSWORD
  // ----------------------------------------------------
  const handleResetPassword = async () => {
    const cleanOtp = resetOtp.trim();
    if (!cleanOtp) {
      setResetError('Please enter the 6-digit verification code from your email.');
      return;
    }
    if (!newPassword) {
      setResetError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 4) {
      setResetError('Password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please check and retype.');
      return;
    }

    setResetLoading(true);
    setResetError(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken,
          identifier: resetUserMeta?.username || resetIdentifier,
          otp: cleanOtp,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        setResetError(data?.error || 'Failed to reset password. Please verify the OTP code.');
        return;
      }

      // Step 3: Success Screen
      setForgotStep(3);
      setResetSuccessMsg('Your password has been reset successfully!');
      if (data.username) {
        setUsername(data.username);
      }
      setPassword(newPassword);
    } catch {
      setResetError('Network error while resetting password. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const switchToForgotPassword = () => {
    setError(null);
    setResetError(null);
    setResetSuccessMsg(null);
    setResetIdentifier(username.trim());
    setResetOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotStep(1);
    setView('forgot');
  };

  const switchToLogin = () => {
    setError(null);
    setResetError(null);
    setView('login');
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
        }}
      />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-[460px] bg-white rounded-3xl shadow-2xl p-7 md:p-8 space-y-6 transition-all duration-300">
        {/* Logo + title */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="h-13 w-13 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
              boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
            }}
          >
            LT
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Learnmore Technologies
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Institute Management Portal
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* VIEW 1: SIGN IN FORM */}
        {/* ========================================================= */}
        {view === 'login' && (
          <>
            {/* Error Message */}
            {error && (
              <div
                className="flex items-center gap-2.5 p-3.5 rounded-xl text-xs font-medium animate-fadeIn"
                style={{
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  color: '#9f1239',
                }}
              >
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <div className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Username or Email
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-400" />
                  <input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleLoginKeyDown}
                    placeholder="Enter your username"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border"
                    style={{
                      background: '#f8fafc',
                      borderColor: '#e2e8f0',
                      color: '#0f172a',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleLoginKeyDown}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full pl-10 pr-10 py-3 rounded-xl text-sm font-medium outline-none transition-all border"
                    style={{
                      background: '#f8fafc',
                      borderColor: '#e2e8f0',
                      color: '#0f172a',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Forgot password below input field */}
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={switchToForgotPassword}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl text-sm font-bold text-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 60%, #7c3aed 100%)',
                  boxShadow: loading ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
                }}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: FORGOT PASSWORD FLOW */}
        {/* ========================================================= */}
        {view === 'forgot' && (
          <div className="space-y-4">
            {/* Header / Breadcrumb */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={switchToLogin}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </button>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                Step {forgotStep} of 3
              </span>
            </div>

            {/* Error Message */}
            {resetError && (
              <div
                className="flex items-center gap-2.5 p-3 rounded-xl text-xs font-medium"
                style={{
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  color: '#9f1239',
                }}
              >
                <span>⚠</span>
                <span>{resetError}</span>
              </div>
            )}

            {/* Success Message */}
            {resetSuccessMsg && forgotStep !== 3 && (
              <div
                className="flex items-center gap-2.5 p-3 rounded-xl text-xs font-medium"
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                }}
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                <span>{resetSuccessMsg}</span>
              </div>
            )}

            {/* --------------------------------------------- */}
            {/* FORGOT STEP 1: Enter Username/Email */}
            {/* --------------------------------------------- */}
            {forgotStep === 1 && (
              <div className="space-y-4">
                <div className="text-left space-y-1">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-blue-600" />
                    Reset your password
                  </h2>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Enter your registered <strong>Username</strong> or <strong>Email</strong>. We
                    will email you a 6-digit verification code.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Username / Registered Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-400" />
                    <input
                      type="text"
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRequestResetOtp();
                      }}
                      placeholder="e.g. admin or rahul.trainer"
                      disabled={resetLoading}
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border"
                      style={{
                        background: '#f8fafc',
                        borderColor: '#e2e8f0',
                        color: '#0f172a',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRequestResetOtp()}
                  disabled={resetLoading}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                    boxShadow: resetLoading ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
                  }}
                >
                  {resetLoading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Sending code to email…
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </button>
              </div>
            )}

            {/* --------------------------------------------- */}
            {/* FORGOT STEP 2: Enter Code & Set New Password */}
            {/* --------------------------------------------- */}
            {forgotStep === 2 && (
              <div className="space-y-4">
                {/* Account info pill */}
                {resetUserMeta && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                        {resetUserMeta.name?.[0] || 'U'}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-slate-800">
                          {resetUserMeta.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {resetUserMeta.masked_email || `@${resetUserMeta.username}`}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                )}

                {/* OTP Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Enter 6-Digit Email Code
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRequestResetOtp()}
                      disabled={resetLoading}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`h-3 w-3 ${resetLoading ? 'animate-spin' : ''}`} /> Resend Email
                    </button>
                  </div>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-400" />
                    <input
                      type="text"
                      maxLength={6}
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 123456"
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-mono tracking-wider font-semibold outline-none transition-all border text-center"
                      style={{
                        background: '#f8fafc',
                        borderColor: '#e2e8f0',
                        color: '#0f172a',
                        letterSpacing: '0.25em',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Check your email inbox (or spam folder) for the 6-digit verification code.
                  </p>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 4 characters"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm font-medium outline-none transition-all border"
                      style={{
                        background: '#f8fafc',
                        borderColor: '#e2e8f0',
                        color: '#0f172a',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleResetPassword();
                      }}
                      placeholder="Retype your new password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm font-medium outline-none transition-all border"
                      style={{
                        background: '#f8fafc',
                        borderColor:
                          confirmPassword && newPassword !== confirmPassword
                            ? '#fca5a5'
                            : '#e2e8f0',
                        color: '#0f172a',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor =
                          confirmPassword && newPassword !== confirmPassword
                            ? '#fca5a5'
                            : '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword === confirmPassword && (
                    <p className="text-[11px] text-green-600 font-medium flex items-center gap-1 mt-1">
                      <CheckCircle2 className="h-3 w-3" /> Passwords match!
                    </p>
                  )}
                </div>

                {/* Submit Reset Button */}
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resetLoading}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                    boxShadow: resetLoading ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
                  }}
                >
                  {resetLoading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Resetting password…
                    </>
                  ) : (
                    'Set New Password'
                  )}
                </button>
              </div>
            )}

            {/* --------------------------------------------- */}
            {/* FORGOT STEP 3: SUCCESS CONFIRMATION */}
            {/* --------------------------------------------- */}
            {forgotStep === 3 && (
              <div className="py-4 text-center space-y-4">
                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-800">Password Changed!</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Your password has been successfully updated. You can now sign in with your new password.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={switchToLogin}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all cursor-pointer shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)',
                    boxShadow: '0 4px 14px rgba(22,163,74,0.35)',
                  }}
                >
                  Proceed to Sign In
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400">
          🔒 Secure portal · Learnmore Technologies
        </p>
      </div>
    </div>
  );
}
