'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '../components/header';
import Footer from '../components/footer';
import { AlertTriangle, ShieldAlert, Trash2, CheckCircle2 } from 'lucide-react';

export default function DeleteAccountPage() {
  const [step, setStep] = useState<'idle' | 'otp-sent' | 'deleting' | 'done'>('idle');
  const [otp, setOtp] = useState('');
  const [masked, setMasked] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const requestOtp = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'request' }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to send OTP');
      setMasked(data.masked || '');
      setStep('otp-sent');
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', otp }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Deletion failed');
      setStep('done');
    } catch (err: any) {
      setError(err?.message || 'Deletion failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-5 py-10">
        <div className="rounded-3xl border border-red-500/30 bg-[var(--bg-card)] p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-red-500/10 p-3 text-red-400">
              <ShieldAlert size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Delete Account</h1>
              <p className="text-sm text-[var(--text-muted)]">
                Permanently remove your user account, submissions, published posts, and linked WhatsApp data.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p>
                All your user content will also be deleted, along with your full user data. Proceed only if you are sure.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {step === 'done' ? (
            <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-6 text-center">
              <CheckCircle2 size={42} className="mx-auto mb-3 text-green-400" />
              <h2 className="text-xl font-bold text-white">Account deleted</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Your account has been permanently removed.
              </p>
              <div className="mt-4">
                <Link href="/" className="rounded-lg bg-[#ffd42a] px-4 py-2 text-sm font-bold text-black">
                  Back to Home
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-4">
                <h2 className="text-lg font-bold text-white">How it works</h2>
                <ol className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                  <li>1. Request an OTP to your registered WhatsApp number.</li>
                  <li>2. Enter the OTP to confirm deletion.</li>
                  <li>3. We permanently delete your account, posts, submissions, and related data.</li>
                </ol>
              </div>

              {step !== 'otp-sent' ? (
                <button
                  onClick={requestOtp}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 font-bold text-white hover:bg-red-400 disabled:opacity-60"
                >
                  <Trash2 size={16} />
                  {busy ? 'Sending OTP...' : 'Delete Account'}
                </button>
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-4">
                  <p className="text-sm text-[var(--text-secondary)]">
                    OTP sent to WhatsApp number ending with <span className="font-bold text-white">{masked.slice(-4) || '****'}</span>.
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Enter the OTP to permanently delete your account.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      inputMode="numeric"
                      placeholder="Enter OTP"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-white outline-none focus:border-[#ffd42a]"
                    />
                    <button
                      onClick={() => {
                        if (!confirm('All your user content is also deleted, with your full user data. Proceed?')) return;
                        confirmDelete();
                      }}
                      disabled={busy || otp.trim().length < 4}
                      className="rounded-xl bg-red-500 px-5 py-3 font-bold text-white hover:bg-red-400 disabled:opacity-60"
                    >
                      {busy ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
