'use client';
export const runtime = 'edge';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Send, Bell, Info, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminNotificationsPage() {
  const [stats, setStats] = useState({ pushSubscribers: 0 });
  const [form, setForm] = useState({
    title: 'FreshNews Update',
    body: '',
    url: 'https://freshnews.top'
  });
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message?: string }>({ type: 'idle' });

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Are you sure you want to send this to ${stats.pushSubscribers} subscribers?`)) return;

    setStatus({ type: 'loading' });
    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      
      if (res.ok) {
        setStatus({ 
          type: 'success', 
          message: `Successfully sent to ${data.stats.successful} users. (${data.stats.failed} failed/expired)` 
        });
        setForm({ ...form, body: '' });
      } else {
        throw new Error(data.error || 'Failed to send');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/admin" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-white mb-8 transition-colors w-fit">
        <ChevronLeft size={20} />
        Back to Dashboard
      </Link>

      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-3">
            <Bell className="text-[#ffd42a]" size={32} />
            Push Notifications
          </h1>
          <p className="text-[var(--text-muted)]">Blast browser alerts to your active subscribers.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-[#ffd42a] uppercase tracking-widest mb-1">Total Reach</p>
          <h3 className="text-4xl font-black text-white">{stats.pushSubscribers}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COMPOSER */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSend} className="space-y-6 bg-[var(--bg-card)] border border-[var(--border)] p-8 rounded-3xl">
            <div>
              <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">Notification Title</label>
              <input 
                type="text" 
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ffd42a] transition-colors"
                placeholder="e.g. Breaking News!"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">Message Body</label>
              <textarea 
                value={form.body}
                onChange={e => setForm({...form, body: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ffd42a] transition-colors min-h-[120px]"
                placeholder="What do you want to tell them?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">Click Destination URL</label>
              <input 
                type="url" 
                value={form.url}
                onChange={e => setForm({...form, url: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ffd42a] transition-colors"
                placeholder="https://freshnews.top/posts/..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={status.type === 'loading' || stats.pushSubscribers === 0}
              className="w-full py-4 bg-[#ffd42a] text-black font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
            >
              {status.type === 'loading' ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
              ) : (
                <>
                  <Send size={20} />
                  Send Notification Now
                </>
              )}
            </button>

            {status.type === 'success' && (
              <div className="p-4 rounded-xl bg-[#90ee90]/10 border border-[#90ee90]/20 flex items-center gap-3 text-[#90ee90]">
                <CheckCircle2 size={20} />
                <p className="text-sm font-bold">{status.message}</p>
              </div>
            )}

            {status.type === 'error' && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500">
                <AlertCircle size={20} />
                <p className="text-sm font-bold">{status.message}</p>
              </div>
            )}
          </form>
        </div>

        {/* PREVIEW & HELP */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Info size={16} className="text-[#00cfff]" />
              How it looks
            </h3>
            <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-[#ffd42a] flex-shrink-0 flex items-center justify-center text-black font-black">FN</div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{form.title || 'Notification Title'}</p>
                  <p className="text-[10px] text-[var(--text-muted)] line-clamp-2 mt-0.5">{form.body || 'This is how your message will appear on users devices...'}</p>
                  <p className="text-[8px] text-[#00cfff] mt-2 font-mono uppercase tracking-tighter">freshnews.top</p>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-4 leading-relaxed">
              Real appearance depends on the browser (Chrome, Safari) and OS (Android, iOS, Windows).
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#ffd42a]/5 border border-[#ffd42a]/10">
            <h3 className="text-sm font-bold text-[#ffd42a] uppercase tracking-widest mb-3">Important</h3>
            <ul className="text-xs space-y-3 text-[var(--text-muted)]">
              <li className="flex gap-2">
                <span className="text-[#ffd42a]">•</span>
                Don't spam! Too many alerts will make users unsubscribe.
              </li>
              <li className="flex gap-2">
                <span className="text-[#ffd42a]">•</span>
                Use urgency in the title for higher click rates.
              </li>
              <li className="flex gap-2">
                <span className="text-[#ffd42a]">•</span>
                Broken links will frustrate users. Test the URL first.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
