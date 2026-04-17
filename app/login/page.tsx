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

export default function LoginPage() {
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
        body: JSON.stringify({ whatsappNumber: fullWhatsappNumber }),
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
        body: JSON.stringify({ whatsappNumber: fullWhatsappNumber, otp }),
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
              Login
            </h2>
            <p className="mt-2 text-center text-sm text-[var(--text-muted)]">
              Use WhatsApp OTP to continue.
            </p>

            {error && (
              <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-400">
                {error}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
              {/* COUNTRY CODE */}
              <label className="block text-sm mb-1">Country Code</label>
              <input
                type="text"
                maxLength={4}
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                placeholder="+91"
              />

              {!countryCode && error === 'country' && (
                <p className="text-red-500 text-sm mt-1">
                  Enter your country code
                </p>
              )}
              </div>

              {!otpSentTo ? (
              <>
                <div>
                  {/* WHATSAPP NUMBER */}
                  <label className="block text-sm mt-3 mb-1">WhatsApp Number</label>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="flex-1 p-2 rounded bg-gray-800 border border-gray-600" 
                      placeholder="Enter number"
                    />

                    {/* PLUS BUTTON */}
                    <button
                      type="button"
                      className="bg-blue-600 px-4 rounded text-white text-lg"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={requestOtp}
                  className="w-full rounded-xl bg-[#00cfff] px-4 py-3 font-extrabold text-[#0d1117] shadow-md hover:brightness-110 disabled:opacity-60"
                >
                  {busy ? 'Sending OTP…' : 'Send OTP'}
                </button>
              </>
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
                  {busy ? 'Verifying…' : 'Verify & Login'}
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
              New here?{' '}
              <Link href="/signup" className="font-bold text-[#90ee90] hover:underline">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
