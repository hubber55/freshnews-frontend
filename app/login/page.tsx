export const runtime = 'edge';
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '../components/header';

const COUNTRY_OPTIONS = [
  { code: '91', label: 'India (+91)' },
  { code: '971', label: 'UAE (+971)' },
  { code: '966', label: 'Saudi Arabia (+966)' },
  { code: '974', label: 'Qatar (+974)' },
  { code: '965', label: 'Kuwait (+965)' },
  { code: '968', label: 'Oman (+968)' },
  { code: '973', label: 'Bahrain (+973)' },
  { code: '44', label: 'UK (+44)' },
  { code: '1', label: 'USA/Canada (+1)' },
  { code: '61', label: 'Australia (+61)' },
  { code: '60', label: 'Malaysia (+60)' },
  { code: '65', label: 'Singapore (+65)' },
  { code: '49', label: 'Germany (+49)' },
  { code: '353', label: 'Ireland (+353)' },
  { code: '', label: 'Other (+)' },
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

function validatePhoneNumber(countryCode: string, phoneNumber: string): { valid: boolean; error?: string } {
  const digits = onlyDigits(phoneNumber);
  const code = onlyDigits(countryCode);
  
  if (!code) {
    return { valid: false, error: 'Please select or enter a country code' };
  }
  
  if (!digits) {
    return { valid: false, error: 'Please enter your WhatsApp number' };
  }
  
  // India (+91) must be exactly 10 digits
  if (code === '91') {
    if (digits.length !== 10) {
      return { valid: false, error: 'Indian numbers must be exactly 10 digits' };
    }
  } else {
    // Other countries: max 15 digits
    if (digits.length > 15) {
      return { valid: false, error: 'Phone number cannot exceed 15 digits' };
    }
    if (digits.length < 7) {
      return { valid: false, error: 'Phone number must be at least 7 digits' };
    }
  }
  
  return { valid: true };
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
  const [customCountryCode, setCustomCountryCode] = useState('');
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
    // Use custom country code if "Other" is selected
    const effectiveCountryCode = countryCode === '' ? customCountryCode : countryCode;
    
    const validation = validatePhoneNumber(effectiveCountryCode, whatsappNumber);
    if (!validation.valid) {
      setError(validation.error || 'Please enter a valid WhatsApp number');
      return;
    }
    
    const fullWhatsappNumber = buildFullWhatsappNumber(effectiveCountryCode, whatsappNumber);
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
      const effectiveCountryCode = countryCode === '' ? customCountryCode : countryCode;
      const fullWhatsappNumber = buildFullWhatsappNumber(effectiveCountryCode, whatsappNumber);
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
              Login / Signup
            </h2>
            <p className="mt-2 text-center text-sm text-[#00ffff] font-medium">
              Enter your WhatsApp number to receive an OTP and continue.
            </p>

            {error && (
              <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-400">
                {error}
              </div>
            )}

            <div className="mt-8 space-y-5">
              {!otpSentTo ? (
              <>
                {/* COUNTRY CODE SELECT */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Country Code</label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    disabled={isBanned}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff] disabled:opacity-50"
                  >
                    {COUNTRY_OPTIONS.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* CUSTOM COUNTRY CODE INPUT (for "Other" option) */}
                {countryCode === '' && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Enter Country Code</label>
                    <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3">
                      <span className="text-white mr-2">+</span>
                      <input
                        type="text"
                        value={customCountryCode}
                        onChange={(e) => setCustomCountryCode(onlyDigits(e.target.value).slice(0, 3))}
                        maxLength={3}
                        inputMode="numeric"
                        placeholder="e.g. 92"
                        className="flex-1 bg-transparent text-white focus:outline-none"
                      />
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Enter country code without + (max 3 digits)</p>
                  </div>
                )}

                {/* WHATSAPP NUMBER */}
                <div>
                  <label className="block text-sm font-medium text-[#ffd42a] mb-2">
                    WhatsApp Number
                    <span className="ml-2 text-xs text-[var(--text-muted)]">
                      {(countryCode === '' ? customCountryCode : countryCode) === '91' ? '(exactly 10 digits)' : '(7-15 digits)'}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => {
                      const effectiveCode = countryCode === '' ? customCountryCode : countryCode;
                      setWhatsappNumber(onlyDigits(e.target.value).slice(0, effectiveCode === '91' ? 10 : 15));
                    }}
                    maxLength={15}
                    inputMode="numeric"
                    disabled={isBanned}
                    placeholder={(countryCode === '' ? customCountryCode : countryCode) === '91' ? '9876543210' : 'Enter number'}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff] disabled:opacity-50"
                  />
                </div>

                <button
                  type="button"
                  disabled={busy || isBanned}
                  onClick={requestOtp}
                  className="w-full rounded-xl bg-[#00cfff] px-4 py-3 font-extrabold text-[#0d1117] shadow-md hover:brightness-110 disabled:opacity-60 transition-all"
                >
                  {busy ? 'Sending OTP…' : 'Send OTP'}
                </button>
                <div className="my-4"></div>
                <div className="my-4"></div>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-[var(--text-secondary)]">
                  {maskHint(otpSentTo)}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-[#ffd42a]">Enter OTP</label>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && otp.length >= 4) {
                        verifyOtp();
                      }
                    }}
                    inputMode="numeric"
                    placeholder="4-digit OTP"
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


          </div>
        </div>
      </div>
    </>
  );
}
