'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import { 
  ChevronLeft, Megaphone, Clock, CheckCircle, 
  XCircle, Trash2, AlertCircle, RefreshCw 
} from 'lucide-react';

export default function AdminClassifiedsPage() {
  const [classifieds, setClassifieds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClassifieds = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/classifieds');
    const data = await res.json();
    setClassifieds(data.classifieds || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchClassifieds();
  }, []);

  const handleUpdateStatus = async (id: number, status: string) => {
    if (status === 'deleted' && !confirm('Are you sure you want to delete this classified?')) return;
    
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchClassifieds();
      }
    } catch (err) {
      alert('Error updating status');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00cfff]"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors">
          <ChevronLeft size={20} />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#00cfff]/10 p-3">
            <Megaphone size={24} className="text-[#00cfff]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Manage Classifieds</h1>
            <p className="text-[var(--text-muted)] text-sm">Review, approve, and track classified ads.</p>
          </div>
        </div>
        <button 
          onClick={fetchClassifieds}
          className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-white"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[#161b22]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#21262d] text-xs uppercase text-[var(--text-secondary)]">
            <tr>
              <th className="px-6 py-4">Title / Category</th>
              <th className="px-6 py-4">User</th>
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
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      {item.ad_categories?.name} &gt; {item.ad_subcategories?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[var(--text-muted)]">
                    <div>{item.wa_users?.name || 'Anonymous'}</div>
                    <div className="text-xs">{item.wa_users?.whatsapp_number}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider
                      ${item.status === 'approved' ? 'bg-green-500/10 text-green-400' : 
                        item.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 
                        item.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                        'bg-gray-500/10 text-gray-400'}
                    `}>
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
                        {daysLeft !== null && (
                          <div className="text-[10px] mt-0.5">
                            ({daysLeft} days left)
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--text-secondary)]">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {item.status !== 'approved' && (
                        <button 
                          onClick={() => handleUpdateStatus(item.id, 'approved')}
                          className="p-1.5 rounded bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white"
                          title="Approve"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {item.status !== 'pending' && (
                        <button 
                          onClick={() => handleUpdateStatus(item.id, 'pending')}
                          className="p-1.5 rounded bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-white"
                          title="Set to Pending"
                        >
                          <Clock size={16} />
                        </button>
                      )}
                      {item.status !== 'rejected' && (
                        <button 
                          onClick={() => handleUpdateStatus(item.id, 'rejected')}
                          className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                          title="Reject"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleUpdateStatus(item.id, 'deleted')}
                        className="p-1.5 rounded bg-gray-500/10 text-gray-400 hover:bg-gray-500 hover:text-white"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {classifieds.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-muted)]">
                  No classified ads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
