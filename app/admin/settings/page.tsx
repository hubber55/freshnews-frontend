'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Settings, Save, Info } from 'lucide-react';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    admin_whatsapp_number: '',
    bidvertiser_verification_code: '',
    ad_expiry_days: '30',
    classified_expiry_days: '30',
    classified_url_rate: '500',
    ad_insertion_rate: '500',
    min_days_required: '2',
    discount_per_5_days: '5',
    max_discount: '30'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/settings');
        if (res.status === 401) {
          window.location.href = '/admin/login';
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to load settings (${res.status})`);
        }

        const data = await res.json();
        if (data.settings) {
          setSettings((current) => {
            const next = { ...current };
            data.settings.forEach((s: { key: string; value: string }) => {
              next[s.key] = s.value;
            });
            return next;
          });
        }
      } catch (error) {
        console.error('Error fetching admin settings:', error);
      }
      setLoading(false);
    }
    fetchSettings();
  }, []);

  async function updateSetting(key: string, value: string) {
    setSaving(key);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });

      if (res.status === 401) {
        alert('Your admin session expired. Please sign in again.');
        window.location.href = '/admin/login';
        return;
      }

      const data = await res.json();
      if (!data.ok) {
        alert(`Error saving ${key}: ` + (data.error || 'Unknown error'));
      }
    } catch {
      alert('Network error while saving settings');
    }
    setSaving(null);
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffd42a]"></div>
      </div>
    );
  }

  const settingGroups: {
    title: string;
    fields: { key: string; label: string; placeholder: string; type?: string }[];
  }[] = [
    {
      title: 'Contact & Security',
      fields: [
        { key: 'admin_whatsapp_number', label: 'Admin WhatsApp Number', placeholder: '919037242045' },
      ]
    },
    {
      title: 'Ad Networks',
      fields: [
        { key: 'bidvertiser_verification_code', label: 'BidVertiser Verification Code', placeholder: '<!-- Bidvertiser2104551 -->', type: 'textarea' },
        { key: 'adsterra_code', label: 'Adsterra Ad Code', placeholder: '<script ...>...', type: 'textarea' },
      ]
    },
    {
      title: 'Expiry Rules (Days)',
      fields: [
        { key: 'ad_expiry_days', label: 'Main Ad Expiry', placeholder: '30' },
        { key: 'classified_expiry_days', label: 'Classified Expiry', placeholder: '30' },
      ]
    },
    {
      title: 'Rates & Pricing (₹)',
      fields: [
        { key: 'classified_url_rate', label: 'Classified External URL Rate', placeholder: '500' },
        { key: 'ad_insertion_rate', label: 'Ad Insertion Rate (per day)', placeholder: '500' },
        { key: 'min_days_required', label: 'Minimum Days Required', placeholder: '2' },
      ]
    },
    {
      title: 'Discounts',
      fields: [
        { key: 'discount_per_5_days', label: 'Discount % (per 5 days)', placeholder: '5' },
        { key: 'max_discount', label: 'Maximum Discount %', placeholder: '30' },
      ]
    }
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors">
          <ChevronLeft size={20} />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#ffd42a]/10 p-3">
            <Settings size={24} className="text-[#ffd42a]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">System Settings</h1>
            <p className="text-[var(--text-muted)] text-sm">Configure business rules, pricing, and notification parameters.</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
          Ver: 1.3.2
        </div>
      </div>

      <div className="space-y-8">
        {settingGroups.map((group) => (
          <div key={group.title} className="rounded-2xl border border-[var(--border)] bg-[#161b22] overflow-hidden">
            <div className="px-6 py-4 bg-[#21262d] border-b border-[var(--border)]">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">{group.title}</h2>
            </div>
            <div className="p-6 space-y-6">
              {group.fields.map((field) => (
                <div key={field.key} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="max-w-md">
                    <label className="block text-sm font-semibold text-white mb-1">{field.label}</label>
                    <p className="text-xs text-[var(--text-muted)]">Parameter key: <code className="text-[#ffd42a]">{field.key}</code></p>
                  </div>
                  <div className="flex items-start gap-2 flex-1 max-w-xl">
                    {field.type === 'textarea' ? (
                      <textarea
                        value={settings[field.key] || ''}
                        onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-white text-xs font-mono h-32 focus:border-[#ffd42a] focus:outline-none"
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <input
                        type="text"
                        value={settings[field.key] || ''}
                        onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                        className="w-full md:w-64 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-white text-sm focus:border-[#ffd42a] focus:outline-none"
                        placeholder={field.placeholder}
                      />
                    )}
                    <button
                      onClick={() => updateSetting(field.key, settings[field.key])}
                      disabled={saving === field.key}
                      className={`p-2 rounded-lg transition-all shrink-0 ${
                        saving === field.key 
                          ? 'bg-yellow-500/20 text-yellow-500 animate-pulse' 
                          : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                      }`}
                    >
                      <Save size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-start gap-3">
        <Info size={20} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-400 leading-relaxed">
          <strong>Note:</strong> These parameters are used globally. Changing rates or expiry days will only affect <strong>new</strong> submissions. Existing posts will retain their original expiry dates.
        </p>
      </div>
    </div>
  );
}
