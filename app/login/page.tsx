'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

function maskHint(masked: string) {
  if (!masked) return '';
  return `An OTP was sent to WhatsApp number "${masked}".`;
}

export default function LoginPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    const sessionData = JSON.parse(sessionStorage.getItem('wa_session') || '{}');
    const now = Date.now();
    if (sessionData.banned_until && now < sessionData.banned_until) {
      setIsBanned(true);
      setError(`Too many edits. Try again after ${new Date(sessionData.banned_until).toLocaleTimeString()}.`);
    }
  }, []);

  const incrementEditCount = () => {
    const sessionData = JSON.parse(sessionStorage.getItem('wa_session') || '{}');
    sessionData.edit_count = (sessionData.edit_count || 0) + 1;
    sessionData.last_edit = Date.now();
    if (sessionData.edit_count >= 3) {
      sessionData.banned_until = Date.now() + 4 * 60 * 60 * 1000; // 4 hours
      setIsBanned(true);
      setError(`Too many edits. Try again after ${new Date(sessionData.banned_until).toLocaleTimeString()}.`);
    }
    sessionStorage.setItem('wa_session', JSON.stringify(sessionData));
  };

  const requestOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/wa-auth/request-otp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ whatsappNumber }),
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
      const res = await fetch('/api/wa-auth/verify-otp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ whatsappNumber, otp }),
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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-10">
      <div className="mx-auto w-full max-w-[600px]">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl">
          <h1 className="text-center text-4xl font-extrabold text-[#ffd42a] uppercase tracking-wide" style={{ fontFamily: 'var(--font-en)' }}>
            FRESHNEWS.TOP
          </h1>
          <h2 className="text-center text-2xl font-extrabold text-white mt-2" style={{ fontFamily: 'var(--font-en)' }}>
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
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">WhatsApp Number</label>
              <div className="flex gap-3">
                <select
                  value="91"
                  disabled
                  className="w-20 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-3 text-white"
                >
                  <option value="91">+91</option>
                </select>
                <input
                  value={whatsappNumber}
                  onChange={(e) => {
                    if (!isBanned) {
                      setWhatsappNumber(e.target.value);
                      incrementEditCount();
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
  );
}

