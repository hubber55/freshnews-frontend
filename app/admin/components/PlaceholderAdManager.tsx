'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Save, Eye, EyeOff, Upload, ExternalLink } from 'lucide-react';

type PlaceholderAd = {
  id: number;
  name: string;
  image_url: string;
  title: string;
  cta_text: string;
  external_url: string | null;
  is_active: boolean;
  priority: number;
  impressions: number;
  clicks: number;
  created_at: string;
};

export default function PlaceholderAdManager() {
  const [ads, setAds] = useState<PlaceholderAd[]>([]);
  const [editingAds, setEditingAds] = useState<Record<number, Partial<PlaceholderAd>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean | number>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New ad form state
  const [newAd, setNewAd] = useState({
    name: '',
    image_url: '',
    title: '',
    cta_text: 'Learn More',
    external_url: '',
    priority: 10,
  });

  const fetchAds = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/placeholder-ads');
      if (res.status === 401) {
        setError('Your session has expired. Please refresh the page or log in again.');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch ads');
      const data = await res.json();
      setAds(data.ads || []);
      // Reset editing state when ads are fetched/refetched
      setEditingAds({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading ads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/placeholder-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAd,
          external_url: newAd.external_url || null,
        }),
      });

      if (res.status === 401) {
        setError('Your session has expired. Please log in again.');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create ad');
      }

      // Reset form and refresh
      setNewAd({
        name: '',
        image_url: '',
        title: '',
        cta_text: 'Learn More',
        external_url: '',
        priority: 10,
      });
      fetchAds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating ad');
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (id: number, updates: Partial<PlaceholderAd>) => {
    setEditingAds(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...updates }
    }));
  };

  const handleUpdate = async (id: number) => {
    const updates = editingAds[id];
    if (!updates) return;

    setSaving(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/placeholder-ads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.status === 401) {
        setError('Your session has expired. Please log in again.');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update ad');
      }

      // Success - update local list and clear editing state for this ID
      setAds(prev => prev.map(ad => ad.id === id ? { ...ad, ...updates } : ad));
      setEditingAds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating ad');
    } finally {
      setSaving(null);
    }
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    setSaving(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/placeholder-ads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!res.ok) throw new Error('Failed to toggle status');
      
      setAds(prev => prev.map(ad => ad.id === id ? { ...ad, is_active: !currentStatus } : ad));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error toggling status');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this placeholder ad?')) return;

    setError(null);
    try {
      const res = await fetch(`/api/admin/placeholder-ads/${id}`, {
        method: 'DELETE',
      });

      if (res.status === 401) {
        setError('Your session has expired. Please log in again.');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete ad');
      }

      fetchAds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting ad');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, adId?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(adId || true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.status === 401) {
        setError('Your session has expired. Please log in again.');
        return;
      }

      const data = await res.json();
      if (data.url) {
        if (adId) {
          startEditing(adId, { image_url: data.url });
        } else {
          setNewAd({ ...newAd, image_url: data.url });
        }
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uploading image');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffd42a]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Create New Ad Form */}
      <div className="rounded-xl border border-[var(--border)] bg-[#161b22] p-4">
        <h3 className="text-sm font-bold text-white mb-4">Add New Placeholder Ad</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Internal Name (for admin)"
            value={newAd.name}
            onChange={(e) => setNewAd({ ...newAd, name: e.target.value })}
            className="rounded-lg border border-[var(--border)] bg-[#0d1117] px-3 py-2 text-white text-sm focus:border-[#ffd42a] focus:outline-none"
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Image URL (300x250 recommended)"
              value={newAd.image_url}
              onChange={(e) => setNewAd({ ...newAd, image_url: e.target.value })}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[#0d1117] px-3 py-2 text-white text-sm focus:border-[#ffd42a] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading !== false}
              className="p-2 rounded-lg bg-[#ffd42a]/10 text-[#ffd42a] border border-[#ffd42a]/20 hover:bg-[#ffd42a]/20 transition-colors"
              title="Upload Image"
            >
              {uploading === true ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#ffd42a] border-t-transparent" /> : <Upload size={20} />}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
          <input
            type="text"
            placeholder="Ad Title"
            value={newAd.title}
            onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
            className="rounded-lg border border-[var(--border)] bg-[#0d1117] px-3 py-2 text-white text-sm focus:border-[#ffd42a] focus:outline-none"
          />
          <input
            type="text"
            placeholder="CTA Button Text (e.g., Visit Us, Learn More)"
            value={newAd.cta_text}
            onChange={(e) => setNewAd({ ...newAd, cta_text: e.target.value })}
            className="rounded-lg border border-[var(--border)] bg-[#0d1117] px-3 py-2 text-white text-sm focus:border-[#ffd42a] focus:outline-none"
          />
          <input
            type="text"
            placeholder="External URL (optional)"
            value={newAd.external_url}
            onChange={(e) => setNewAd({ ...newAd, external_url: e.target.value })}
            className="rounded-lg border border-[var(--border)] bg-[#0d1117] px-3 py-2 text-white text-sm focus:border-[#ffd42a] focus:outline-none"
          />
          <div className="flex flex-col gap-1">
            <input
              type="number"
              placeholder="Priority (1-100, lower = more frequent)"
              value={newAd.priority}
              onChange={(e) => setNewAd({ ...newAd, priority: parseInt(e.target.value) || 10 })}
              min={1}
              max={100}
              className="rounded-lg border border-[var(--border)] bg-[#0d1117] px-3 py-2 text-white text-sm focus:border-[#ffd42a] focus:outline-none"
            />
            <span className="text-[10px] text-[var(--text-muted)] ml-1">Priority/Weight: Lower values show more often.</span>
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating || !newAd.name || !newAd.image_url || !newAd.title}
          className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          {creating ? 'Creating...' : 'Add Placeholder Ad'}
        </button>
      </div>

      {/* Existing Ads List */}
      <div className="space-y-4">
        {ads.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm">
            No placeholder ads yet. Create one above.
          </div>
        ) : (
          ads.map((ad) => {
            const isEditing = !!editingAds[ad.id];
            const currentAd = { ...ad, ...(editingAds[ad.id] || {}) };

            return (
              <div
                key={ad.id}
                className={`rounded-xl border ${ad.is_active ? 'border-[var(--border)]' : 'border-red-500/30'} bg-[#161b22] p-4 transition-all`}
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Ad Preview */}
                  <div className="relative w-full md:w-[300px] h-[250px] rounded-lg overflow-hidden bg-[#0d1117] flex-shrink-0">
                    {currentAd.image_url ? (
                      <>
                        <img
                          src={currentAd.image_url}
                          alt={currentAd.title}
                          className="w-full h-full object-contain"
                        />
                        {/* CTA Button Overlay Preview */}
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                          <span className="px-4 py-2 bg-[#ffd42a] text-[#1a1a1a] text-sm font-bold rounded-lg">
                            {currentAd.cta_text}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Ad Details */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={currentAd.name}
                        onChange={(e) => startEditing(ad.id, { name: e.target.value })}
                        className="font-bold text-white bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-[#ffd42a] focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdate(ad.id)}
                          disabled={saving === ad.id || !isEditing}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                            isEditing 
                              ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                              : 'bg-white/5 text-white/30 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <Save size={14} />
                          {saving === ad.id ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={() => toggleActive(ad.id, ad.is_active)}
                          className={`p-2 rounded-lg ${ad.is_active ? 'text-green-400 hover:bg-green-400/10' : 'text-red-400 hover:bg-red-400/10'}`}
                          title={ad.is_active ? 'Active' : 'Inactive'}
                        >
                          {ad.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button
                          onClick={() => handleDelete(ad.id)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-400/10"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">Title</label>
                        <input
                          type="text"
                          value={currentAd.title}
                          onChange={(e) => startEditing(ad.id, { title: e.target.value })}
                          className="w-full rounded border border-[var(--border)] bg-[#0d1117] px-2 py-1 text-white focus:border-[#ffd42a] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">Image URL</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={currentAd.image_url}
                            onChange={(e) => startEditing(ad.id, { image_url: e.target.value })}
                            className="flex-1 rounded border border-[var(--border)] bg-[#0d1117] px-2 py-1 text-white focus:border-[#ffd42a] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => handleFileUpload(e as any, ad.id);
                              input.click();
                            }}
                            disabled={uploading !== false}
                            className="p-1 rounded bg-[#ffd42a]/10 text-[#ffd42a] hover:bg-[#ffd42a]/20"
                            title="Upload Image"
                          >
                            {uploading === ad.id ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#ffd42a] border-t-transparent" /> : <Upload size={14} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">CTA Text</label>
                        <input
                          type="text"
                          value={currentAd.cta_text}
                          onChange={(e) => startEditing(ad.id, { cta_text: e.target.value })}
                          className="w-full rounded border border-[var(--border)] bg-[#0d1117] px-2 py-1 text-white focus:border-[#ffd42a] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">External URL</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={currentAd.external_url || ''}
                            onChange={(e) => startEditing(ad.id, { external_url: e.target.value || null })}
                            placeholder="https://..."
                            className="flex-1 rounded border border-[var(--border)] bg-[#0d1117] px-2 py-1 text-white focus:border-[#ffd42a] focus:outline-none"
                          />
                          {currentAd.external_url && (
                            <a
                              href={currentAd.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-[#ffd42a] hover:bg-[#ffd42a]/10 rounded"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                        <span title="Lower values show more often">Weight: {currentAd.priority}</span>
                        <span>Impressions: {ad.impressions.toLocaleString()}</span>
                        <span>Clicks: {ad.clicks.toLocaleString()}</span>
                        <span className={ad.is_active ? 'text-green-400' : 'text-red-400'}>
                          {ad.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--text-muted)]">Adjust Priority</span>
                        <input
                          type="range"
                          min={1}
                          max={100}
                          value={currentAd.priority}
                          onChange={(e) => startEditing(ad.id, { priority: parseInt(e.target.value) })}
                          className="w-32 accent-[#ffd42a]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
