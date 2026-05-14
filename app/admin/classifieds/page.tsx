export const runtime = 'edge';
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import { 
  ChevronLeft, Megaphone, Clock, CheckCircle, 
  XCircle, Trash2, RefreshCw, Pencil, X
} from 'lucide-react';

type Classified = {
  id: number;
  title: string;
  content: string;
  status: string;
  expires_at: string | null;
  price: string | null;
  contact_phone: string | null;
  tags: string[] | null;
  image_url: string | null;
  wa_users?: { name?: string; whatsapp_number?: string } | null;
  ad_categories?: { name?: string } | null;
  ad_subcategories?: { name?: string } | null;
};

export default function AdminClassifiedsPage() {
  const [classifieds, setClassifieds] = useState<Classified[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Classified | null>(null);
  const [editForm, setEditForm] = useState({ title: '', content: '', price: '', contact_phone: '', tags: '' });
  const [saving, setSaving] = useState(false);

  const fetchClassifieds = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/classifieds');
    const data = await res.json();
    setClassifieds(data.classifieds || []);
    setLoading(false);
  };

  useEffect(() => { fetchClassifieds(); }, []);

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchClassifieds();
      else alert('Error updating status');
    } catch { alert('Error updating status'); }
  };

  const handleHardDelete = async (id: number, title: string) => {
    if (!confirm(`Permanently delete "${title}"? This CANNOT be undone.`)) return;
    const res = await fetch(`/api/admin/submissions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setClassifieds(prev => prev.filter(c => c.id !== id));
    } else {
      alert('Failed to delete.');
    }
  };

  const openEdit = (item: Classified) => {
    setEditItem(item);
    setEditForm({
      title: item.title || '',
      content: item.content || '',
      price: item.price || '',
      contact_phone: item.contact_phone || '',
      tags: (item.tags || []).join(', ')
    });
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    const tagsArr = editForm.tags.split(',').map(t => {
      const trimmed = t.trim();
      return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase() : '';
    }).filter(Boolean);

    const res = await fetch(`/api/admin/submissions/${editItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editForm.title,
        content: editForm.content,
        price: editForm.price || null,
        contact_phone: editForm.contact_phone || null,
        tags: tagsArr,
      })
    });
    setSaving(false);
    if (res.ok) {
      setEditItem(null);
      fetchClassifieds();
    } else {
      alert('Failed to save changes.');
    }
  };

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00ffff]" />
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* EDIT MODAL */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Edit Classified</h2>
              <button onClick={() => setEditItem(null)} className="text-[var(--text-muted)] hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-2 uppercase text-center">Photos</label>
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {(() => {
                    let urls: string[] = [];
                    if (editItem.image_url) {
                      try {
                        const parsed = JSON.parse(editItem.image_url);
                        urls = Array.isArray(parsed) ? parsed : [editItem.image_url];
                      } catch {
                        urls = [editItem.image_url];
                      }
                    }
                    
                    if (urls.length === 0) return <div className="text-[var(--text-muted)] text-xs italic">No images uploaded</div>;
                    
                    return urls.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-[var(--border)] group">
                        <img src={url} alt={`Classified ${i+1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            type="button"
                            onClick={() => window.open(url, '_blank')}
                            className="text-white text-[10px] font-bold uppercase underline"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Title</label>
                <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2.5 text-white focus:border-[#00ffff] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Content</label>
                <textarea value={editForm.content} onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))} rows={5}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2.5 text-white focus:border-[#00ffff] focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Price</label>
                  <input value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="e.g. ₹5,000" className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2.5 text-white focus:border-[#ffd42a] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Phone</label>
                  <input value={editForm.contact_phone} onChange={e => setEditForm(f => ({ ...f, contact_phone: e.target.value }))}
                    placeholder="e.g. 9876543210" className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2.5 text-white focus:border-[#00ffff] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Tags (comma-separated)</label>
                <input value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="Alappuzha, Real estate, Land" className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2.5 text-white focus:border-[#00ffff] focus:outline-none" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setEditItem(null)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-white text-sm">Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving}
                className="px-4 py-2 rounded-lg bg-[#00ffff] text-black font-bold text-sm hover:bg-[#00dada] disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors">
          <ChevronLeft size={20} /> Back to Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#00ffff]/10 p-3"><Megaphone size={24} className="text-[#00ffff]" /></div>
          <div>
            <h1 className="text-2xl font-bold text-white">Manage Classifieds</h1>
            <p className="text-[var(--text-muted)] text-sm">Review, approve, edit, and track classified ads.</p>
          </div>
        </div>
        <button onClick={fetchClassifieds} className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-white">
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[#161b22]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#21262d] text-xs uppercase text-[var(--text-secondary)]">
            <tr>
              <th className="px-6 py-4">Title / Category</th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Price / Phone</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Expiry</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {classifieds.map((item) => {
              const daysLeft = item.expires_at ? differenceInDays(new Date(item.expires_at), new Date()) : null;
              return (
                <tr key={item.id} className="hover:bg-[#21262d]/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{item.title}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      {item.ad_categories?.name} {item.ad_subcategories?.name ? `> ${item.ad_subcategories.name}` : ''}
                    </div>
                    {item.tags && item.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.tags.map((t, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded border border-[#00ffff]/20 text-[#00ffff]/60">{t}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[var(--text-muted)]">
                    <div className="font-semibold text-white">{item.wa_users?.name || 'Anonymous'}</div>
                    <div className="text-xs">{item.wa_users?.whatsapp_number}</div>
                  </td>
                  <td className="px-6 py-4">
                    {item.price && <div className="text-[#ffd42a] font-bold text-sm">{item.price}</div>}
                    {item.contact_phone && <div className="text-[#00ffff] text-xs mt-0.5">{item.contact_phone}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider
                      ${item.status === 'approved' ? 'bg-green-500/10 text-green-400' : 
                        item.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 
                        item.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                        'bg-gray-500/10 text-gray-400'}`}>
                      {item.status === 'approved' ? <CheckCircle size={12} /> : 
                       item.status === 'pending' ? <Clock size={12} /> : 
                       <XCircle size={12} />}
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {item.expires_at ? (
                      <div className={daysLeft !== null && daysLeft <= 2 ? 'text-red-400 font-bold' : 'text-[var(--text-muted)]'}>
                        {format(new Date(item.expires_at), 'MMM d, yyyy')}
                        {daysLeft !== null && <div className="text-[10px] mt-0.5">({daysLeft} days left)</div>}
                      </div>
                    ) : <span className="text-[var(--text-secondary)]">-</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black" title="Edit">
                        <Pencil size={16} />
                      </button>
                      {item.status !== 'approved' && (
                        <button onClick={() => handleUpdateStatus(item.id, 'approved')} className="p-1.5 rounded bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white" title="Approve">
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {item.status !== 'pending' && (
                        <button onClick={() => handleUpdateStatus(item.id, 'pending')} className="p-1.5 rounded bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-white" title="Set Pending">
                          <Clock size={16} />
                        </button>
                      )}
                      {item.status !== 'rejected' && (
                        <button onClick={() => handleUpdateStatus(item.id, 'rejected')} className="p-1.5 rounded bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white" title="Reject">
                          <XCircle size={16} />
                        </button>
                      )}
                      <button onClick={() => handleHardDelete(item.id, item.title)} className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white" title="Hard Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {classifieds.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">No classified ads found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
