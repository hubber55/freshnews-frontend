export const runtime = 'edge';
'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Settings, Save, Info, Image } from 'lucide-react';
import Link from 'next/link';
import PlaceholderAdManager from '../components/PlaceholderAdManager';

type HeaderInsert = {
  id: string;
  name: string;
  placement: 'head' | 'body';
  scope: 'all' | 'home';
  enabled: boolean;
  code: string;
};

type AdNetwork = {
  id: string;
  name: string;
  enabled: boolean;
  code: string;
};

function safeParseHeaderInserts(value: unknown): HeaderInsert[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const obj = item as Partial<HeaderInsert>;
        return {
          id: typeof obj.id === 'string' && obj.id ? obj.id : crypto.randomUUID(),
          name: typeof obj.name === 'string' ? obj.name : 'Header Insert',
          placement: obj.placement === 'body' ? 'body' : 'head',
          scope: obj.scope === 'home' ? 'home' : 'all',
          enabled: obj.enabled !== false,
          code: typeof obj.code === 'string' ? obj.code : '',
        } satisfies HeaderInsert;
      });
  } catch {
    return [];
  }
}

function safeParseAdNetworks(value: unknown): AdNetwork[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const obj = item as Partial<AdNetwork>;
        return {
          id: typeof obj.id === 'string' && obj.id ? obj.id : crypto.randomUUID(),
          name: typeof obj.name === 'string' ? obj.name : 'Ad Network',
          enabled: obj.enabled !== false,
          code: typeof obj.code === 'string' ? obj.code : '',
        } satisfies AdNetwork;
      });
  } catch {
    return [];
  }
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    admin_whatsapp_number: '',
    ad_expiry_days: '30',
    classified_expiry_days: '30',
    classified_url_rate: '500',
    ad_insertion_rate: '500',
    min_days_required: '2',
    discount_per_5_days: '5',
    max_discount: '30',
    max_upload_images: '5',
    lock_rate_pos_2: '500',
    lock_rate_pos_8: '400',
    lock_rate_pos_16: '300',
    lock_rate_pos_24: '200'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [headerInserts, setHeaderInserts] = useState<HeaderInsert[]>([]);
  const [adNetworks, setAdNetworks] = useState<AdNetwork[]>([]);
  const [randomAdsEnabled, setRandomAdsEnabled] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/settings');
        if (res.status === 401) {
          setError('Please log in to access settings');
          setLoading(false);
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

          const headerInsertsValue = data.settings.find((s: { key: string; value: string }) => s.key === 'header_inserts')?.value;
          const legacyBidvertiser = data.settings.find((s: { key: string; value: string }) => s.key === 'bidvertiser_verification_code')?.value;
          const parsed = safeParseHeaderInserts(headerInsertsValue);

          if (parsed.length > 0) {
            setHeaderInserts(parsed);
          } else if (typeof legacyBidvertiser === 'string' && legacyBidvertiser.trim()) {
            setHeaderInserts([{
              id: crypto.randomUUID(),
              name: 'BidVertiser Verification',
              placement: 'head',
              scope: 'all',
              enabled: true,
              code: legacyBidvertiser.trim(),
            }]);
          }

          const adNetworksValue = data.settings.find((s: { key: string; value: string }) => s.key === 'ad_networks')?.value;
          const randomAdsValue = data.settings.find((s: { key: string; value: string }) => s.key === 'ad_networks_random')?.value;
          const legacyAdsterra = data.settings.find((s: { key: string; value: string }) => s.key === 'adsterra_code')?.value;

          const parsedAdNetworks = safeParseAdNetworks(adNetworksValue);
          
          if (adNetworksValue !== undefined) {
            setAdNetworks(parsedAdNetworks);
          } else if (typeof legacyAdsterra === 'string' && legacyAdsterra.trim()) {
            setAdNetworks([{
              id: crypto.randomUUID(),
              name: 'Adsterra (Legacy)',
              enabled: true,
              code: legacyAdsterra.trim(),
            }]);
          }

          setRandomAdsEnabled(String(randomAdsValue ?? '').toLowerCase() === 'true');
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

  async function saveHeaderInserts() {
    const value = JSON.stringify(headerInserts, null, 2);
    await updateSetting('header_inserts', value);
  }

  async function saveAdNetworks() {
    await updateSetting('ad_networks', JSON.stringify(adNetworks, null, 2));
    await updateSetting('ad_networks_random', randomAdsEnabled ? 'true' : 'false');
    // Clear legacy key to prevent it from coming back
    await updateSetting('adsterra_code', '');
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
        // Managed via the dedicated editor below.
      ]
    },
    {
      title: 'System & Expiry Rules',
      fields: [
        { key: 'ad_expiry_days', label: 'Main Ad Expiry (Days)', placeholder: '30' },
        { key: 'classified_expiry_days', label: 'Classified Expiry (Days)', placeholder: '30' },
        { key: 'max_upload_images', label: 'Max Images Per Submission', placeholder: '5' },
      ]
    },
    {
      title: 'Rates & Pricing (₹)',
      fields: [
        { key: 'classified_url_rate', label: 'Classified External URL Rate', placeholder: '500' },
        { key: 'ad_insertion_rate', label: 'Ad Insertion Rate (per day)', placeholder: '500' },
        { key: 'min_days_required', label: 'Minimum Days Required', placeholder: '2' },
        { key: 'lock_rate_pos_2', label: 'Lock News (2nd Position) Rate', placeholder: '500' },
        { key: 'lock_rate_pos_8', label: 'Lock News (8th Position) Rate', placeholder: '400' },
        { key: 'lock_rate_pos_16', label: 'Lock News (16th Position) Rate', placeholder: '300' },
        { key: 'lock_rate_pos_24', label: 'Lock News (24th Position) Rate', placeholder: '200' },
      ]
    },
    {
      title: 'Discounts',
      fields: [
        { key: 'discount_per_5_days', label: 'Discount % (per 5 days)', placeholder: '5' },
        { key: 'max_discount', label: 'Maximum Discount %', placeholder: '30' },
      ]
    },
    {
      title: 'Homepage Features',
      fields: [
        { key: 'admin_added_tags', label: 'Admin Added Tags (Comma separated)', placeholder: 'Tag1, Tag2, Tag3', type: 'textarea' },
      ]
    }
  ];

  const headerGroup = (
    <div className="rounded-2xl border border-[var(--border)] bg-[#161b22] overflow-hidden">
      <div className="px-6 py-4 bg-[#21262d] border-b border-[var(--border)] flex items-center justify-between gap-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Header</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setHeaderInserts((current) => ([
                ...current,
                {
                  id: crypto.randomUUID(),
                  name: `Header Insert ${current.length + 1}`,
                  placement: 'head',
                  scope: 'all',
                  enabled: true,
                  code: '',
                },
              ]));
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10"
          >
            + Add
          </button>
          <button
            type="button"
            onClick={saveHeaderInserts}
            disabled={saving === 'header_inserts'}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
              saving === 'header_inserts'
                ? 'bg-yellow-500/20 text-yellow-500 animate-pulse'
                : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
            }`}
          >
            Save
          </button>
        </div>
      </div>
      <div className="p-6 space-y-6">
        <div className="text-xs text-[var(--text-muted)] leading-relaxed">
          Paste verification or ad-network snippets here. Use <code className="text-[#ffd42a]">Head</code> for scripts that must load early, or <code className="text-[#ffd42a]">Body</code> to insert at the start of the page body.
        </div>
        {headerInserts.length === 0 ? (
          <div className="text-sm text-[var(--text-muted)]">No header inserts added yet.</div>
        ) : null}
        {headerInserts.map((ins, idx) => (
          <div key={ins.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <input
                value={ins.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setHeaderInserts((current) => current.map((x) => (x.id === ins.id ? { ...x, name: value } : x)));
                }}
                className="w-full md:w-80 rounded-lg border border-[var(--border)] bg-[#0d1117] px-3 py-2 text-white text-sm focus:border-[#ffd42a] focus:outline-none"
                placeholder={`Insert ${idx + 1} name`}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <label className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <input
                    type="checkbox"
                    checked={ins.enabled}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setHeaderInserts((current) => current.map((x) => (x.id === ins.id ? { ...x, enabled: checked } : x)));
                    }}
                  />
                  Enabled
                </label>
                <select
                  value={ins.placement}
                  onChange={(e) => {
                    const placement = e.target.value === 'body' ? 'body' : 'head';
                    setHeaderInserts((current) => current.map((x) => (x.id === ins.id ? { ...x, placement } : x)));
                  }}
                  className="rounded-lg border border-[var(--border)] bg-[#0d1117] px-3 py-2 text-white text-xs focus:border-[#ffd42a] focus:outline-none"
                >
                  <option value="head">Head</option>
                  <option value="body">Body</option>
                </select>
                <select
                  value={ins.scope}
                  onChange={(e) => {
                    const scope = e.target.value === 'home' ? 'home' : 'all';
                    setHeaderInserts((current) => current.map((x) => (x.id === ins.id ? { ...x, scope } : x)));
                  }}
                  className="rounded-lg border border-[var(--border)] bg-[#0d1117] px-3 py-2 text-white text-xs focus:border-[#ffd42a] focus:outline-none"
                >
                  <option value="all">All Pages</option>
                  <option value="home">Homepage Only</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setHeaderInserts((current) => current.filter((x) => x.id !== ins.id));
                  }}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
            <textarea
              value={ins.code}
              onChange={(e) => {
                const value = e.target.value;
                setHeaderInserts((current) => current.map((x) => (x.id === ins.id ? { ...x, code: value } : x)));
              }}
              className="w-full rounded-lg border border-[var(--border)] bg-[#0d1117] px-3 py-2 text-white text-xs font-mono h-32 focus:border-[#ffd42a] focus:outline-none"
              placeholder="Paste the network code here..."
            />
            <div className="text-[10px] text-[var(--text-muted)]">
              Stored under key: <code className="text-[#ffd42a]">header_inserts</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const adNetworksGroup = (
    <div className="rounded-2xl border border-[var(--border)] bg-[#161b22] overflow-hidden">
      <div className="px-6 py-4 bg-[#21262d] border-b border-[var(--border)] flex items-center justify-between gap-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Ad Networks</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAdNetworks((current) => ([
                ...current,
                {
                  id: crypto.randomUUID(),
                  name: `Ad Network ${current.length + 1}`,
                  enabled: true,
                  code: '',
                },
              ]));
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10"
          >
            + Add
          </button>
          <button
            type="button"
            onClick={saveAdNetworks}
            disabled={saving === 'ad_networks' || saving === 'ad_networks_random'}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
              saving === 'ad_networks' || saving === 'ad_networks_random'
                ? 'bg-yellow-500/20 text-yellow-500 animate-pulse'
                : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
            }`}
          >
            Save
          </button>
        </div>
      </div>
      <div className="p-6 space-y-6">
        <div className="text-xs text-[var(--text-muted)] leading-relaxed">
          Add multiple ad networks as <code className="text-[#ffd42a]">Name</code> + <code className="text-[#ffd42a]">Code</code>. If <code className="text-[#ffd42a]">Random</code> is enabled, a random enabled network is used for each ad slot.
        </div>

        <label className="flex items-center gap-2 text-sm text-white">
          <input
            type="checkbox"
            checked={randomAdsEnabled}
            onChange={(e) => setRandomAdsEnabled(e.target.checked)}
          />
          Random
        </label>

        {adNetworks.length === 0 ? (
          <div className="text-sm text-[var(--text-muted)]">No ad networks added yet.</div>
        ) : null}

        {adNetworks.map((net, idx) => (
          <div key={net.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <input
                value={net.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setAdNetworks((current) => current.map((x) => (x.id === net.id ? { ...x, name: value } : x)));
                }}
                className="w-full md:w-80 rounded-lg border border-[var(--border)] bg-[#0d1117] px-3 py-2 text-white text-sm focus:border-[#ffd42a] focus:outline-none"
                placeholder={`Network ${idx + 1} name`}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <label className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <input
                    type="checkbox"
                    checked={net.enabled}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAdNetworks((current) => current.map((x) => (x.id === net.id ? { ...x, enabled: checked } : x)));
                    }}
                  />
                  Enabled
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAdNetworks((current) => current.filter((x) => x.id !== net.id));
                  }}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
            <textarea
              value={net.code}
              onChange={(e) => {
                const value = e.target.value;
                setAdNetworks((current) => current.map((x) => (x.id === net.id ? { ...x, code: value } : x)));
              }}
              className="w-full rounded-lg border border-[var(--border)] bg-[#0d1117] px-3 py-2 text-white text-xs font-mono h-32 focus:border-[#ffd42a] focus:outline-none"
              placeholder="Paste the network code here..."
            />
            <div className="text-[10px] text-[var(--text-muted)]">
              Stored under keys: <code className="text-[#ffd42a]">ad_networks</code> and <code className="text-[#ffd42a]">ad_networks_random</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

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

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {headerGroup}
        {adNetworksGroup}
        
        {/* Placeholder Ads Section */}
        <div className="rounded-2xl border border-[var(--border)] bg-[#161b22] overflow-hidden">
          <div className="px-6 py-4 bg-[#21262d] border-b border-[var(--border)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image size={20} className="text-[#ffd42a]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Placeholder Ads (300x250)</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="text-xs text-[var(--text-muted)] leading-relaxed mb-6">
              Manage fallback ads displayed when no user-submitted ads are available. 
              These 300x250 ads appear randomly on the homepage. 
              Each ad can have a custom CTA button that opens in a new tab.
            </div>
            <PlaceholderAdManager />
          </div>
        </div>

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
