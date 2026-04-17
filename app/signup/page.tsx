'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '../components/header';

const COUNTRY_OPTIONS = [
  { code: '91', label: 'India' },
  { code: '1', label: 'USA/Canada' },
  { code: '44', label: 'UK' },
  { code: '971', label: 'UAE' },
  { code: '966', label: 'Saudi Arabia' },
  { code: '974', label: 'Qatar' },
  { code: '65', label: 'Singapore' },
  { code: '61', label: 'Australia' },
];

const MAX_UNIQUE_NUMBERS = 3;
const BAN_MS = 4 * 60 * 60 * 1000;

type WaSession = {
  tried_numbers?: string[];
  banned_until?: number;
};

function maskHint(masked: string) {
  if (!masked) return '';
  return `An OTP was sent to WhatsApp number "${masked}".`;
}

function onlyDigits(value: string) {
  return value.replace(/[^\d]/g, '');
}

function getSessionData(): WaSession {
  try {
    return JSON.parse(sessionStorage.getItem('wa_session') || '{}') as WaSession;
  } catch {
    return {};
  }
}

function setSessionData(data: WaSession) {
  sessionStorage.setItem('wa_session', JSON.stringify(data));
}

function buildFullWhatsappNumber(countryCode: string, localNumber: string) {
  return `${onlyDigits(countryCode)}${onlyDigits(localNumber)}`;
}

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
    const [countryCode, setCountryCode] = useState('91');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
    const [otp, setOtp] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    const sessionData = getSessionData();
    const now = Date.now();
    if (sessionData.banned_until && now < sessionData.banned_until) {
      setIsBanned(true);
      setError(`Too many OTP requests for different numbers. Try again after ${new Date(sessionData.banned_until).toLocaleTimeString()}.`);
    }
  }, []);

  const checkAndTrackOtpAttempt = (fullNumber: string) => {
    const sessionData = getSessionData();
    const tried = Array.isArray(sessionData.tried_numbers) ? sessionData.tried_numbers : [];
    if (!tried.includes(fullNumber)) {
      tried.push(fullNumber);
    }

    if (tried.length > MAX_UNIQUE_NUMBERS) {
      sessionData.banned_until = Date.now() + BAN_MS;
      sessionData.tried_numbers = tried;
      setSessionData(sessionData);
      setIsBanned(true);
      setError(`Too many OTP requests for different numbers. Try again after ${new Date(sessionData.banned_until).toLocaleTimeString()}.`);
      return false;
    }

    sessionData.tried_numbers = tried;
    setSessionData(sessionData);
    return true;
  };

  const requestOtp = async () => {
    const fullWhatsappNumber = buildFullWhatsappNumber(countryCode, whatsappNumber);
    if (!fullWhatsappNumber || fullWhatsappNumber.length < 10) {
      setError('Please enter a valid WhatsApp number');
      return;
    }
    if (!checkAndTrackOtpAttempt(fullWhatsappNumber)) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/wa-auth/request-otp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, whatsappNumber: fullWhatsappNumber }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed to send OTP');
      setOtpSentTo(json.masked || 'xxxxx');
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const fullWhatsappNumber = buildFullWhatsappNumber(countryCode, whatsappNumber);
      const res = await fetch('/api/wa-auth/verify-otp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, whatsappNumber: fullWhatsappNumber, otp }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Invalid OTP');
      window.location.href = '/';
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 pt-20 pb-10">
        <div className="mx-auto w-full max-w-[600px]">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl">
            <h2 className="text-center text-2xl font-extrabold text-white" style={{ fontFamily: 'var(--font-en)' }}>
              Sign Up
            </h2>
            <p className="mt-2 text-center text-sm text-[var(--text-muted)]">
              Create your account with WhatsApp OTP.
            </p>

            {error && (
              <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-400">
                {error}
              </div>
            )}

            <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (max 15 characters)"
                maxLength={15}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#90ee90] focus:outline-none focus:ring-1 focus:ring-[#90ee90]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com (max 40 characters)"
                maxLength={40}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#90ee90] focus:outline-none focus:ring-1 focus:ring-[#90ee90]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">WhatsApp Number</label>
              <div className="flex gap-3">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  disabled={isBanned}
                  className="w-20 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-3 text-white"
                >
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country.code} value={country.code}>
                      +{country.code}
                    </option>
                  ))}
                </select>
                <div className="w-28 flex items-center rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-3">
                  <span className="text-white mr-1">+</span>
                  <input
                    value={countryCode}
                    onChange={(e) => setCountryCode(onlyDigits(e.target.value))}
                    disabled={isBanned}
                    inputMode="numeric"
                    placeholder="Code"
                    className="w-full bg-transparent text-white focus:outline-none"
                  />
                </div>
                <input
                  value={whatsappNumber}
                  onChange={(e) => {
                    if (!isBanned) {
                      setWhatsappNumber(onlyDigits(e.target.value));
                    }
                  }}
                  disabled={isBanned}
                  placeholder="xxxxxxxxxx"
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff] disabled:opacity-50"
                />
              </div>
            </div>

            {!otpSentTo ? (
              <button
                type="button"
                disabled={busy}
                onClick={requestOtp}
                className="w-full rounded-xl bg-[#00cfff] px-4 py-3 font-extrabold text-[#0d1117] shadow-md hover:brightness-110 disabled:opacity-60"
              >
                {busy ? 'Sending OTP…' : 'Send OTP'}
              </button>
            ) : (
              <>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-[var(--text-secondary)]">
                  {maskHint(otpSentTo)}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">Enter OTP</label>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && otp.length >= 4) {
                        verifyOtp();
                      }
                    }}
                    inputMode="numeric"
                    placeholder="6-digit OTP"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#ffd42a] focus:outline-none focus:ring-1 focus:ring-[#ffd42a]"
                  />
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={verifyOtp}
                  className="w-full rounded-xl bg-[#ffd42a] px-4 py-3 font-extrabold text-[#0d1117] shadow-md hover:brightness-110 disabled:opacity-60"
                >
                  {busy ? 'Verifying…' : 'Verify & Create Account'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setOtpSentTo(null);
                    setOtp('');
                  }}
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 font-bold text-[var(--text-secondary)] hover:bg-white/5 disabled:opacity-60"
                >
                  Change number
                </button>
              </>
            )}
            </div>

            <div className="mt-6 text-center text-sm text-[var(--text-muted)]">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-[#90ee90] hover:underline">
                Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
