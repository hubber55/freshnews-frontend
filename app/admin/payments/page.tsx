export const runtime = 'edge';
'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink, 
  IndianRupee, 
  Calendar, 
  Layout,
  RefreshCw,
  Search
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminPaymentsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('pending');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payments/request');
      const data = await res.json();
      if (data.requests) setRequests(data.requests);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: string) => {
    if (!confirm('Confirm payment received and activate feature?')) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/payments/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        alert('Payment approved and feature activated!');
        fetchRequests();
      } else {
        const data = await res.json();
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(r => filter === 'all' || r.status === filter);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Payment Management</h1>
          <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest">Verify and approve manual UPI payments</p>
        </div>
        <button 
          onClick={fetchRequests}
          className="p-3 rounded-xl bg-white/5 border border-white/10 text-[#00ffff] hover:bg-[#00ffff]/10 transition-all"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex gap-4 mb-8">
        {['pending', 'approved', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
              filter === f 
              ? 'bg-[#00ffff] text-black border-[#00ffff]' 
              : 'bg-white/5 text-[var(--text-muted)] border-white/10 hover:border-white/20'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && requests.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00ffff]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-[#161b22] border border-dashed border-[var(--border)] rounded-2xl py-20 text-center">
              <Clock size={48} className="text-white/10 mx-auto mb-4" />
              <p className="text-[var(--text-muted)] font-bold uppercase tracking-widest">No payment requests found</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div 
                key={request.id}
                className="bg-[#161b22] border border-[var(--border)] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-white/20 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-4 rounded-2xl ${request.type === 'lock_news' ? 'bg-[#00ffff]/10 text-[#00ffff]' : 'bg-[#ffd42a]/10 text-[#ffd42a]'}`}>
                    {request.type === 'lock_news' ? <Layout size={24} /> : <Search size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Type:</span>
                      <span className="text-xs font-black uppercase tracking-widest text-white">{request.type.replace('_', ' ')}</span>
                      <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                        request.status === 'pending' ? 'bg-orange-500/20 text-orange-500' : 'bg-green-500/20 text-green-500'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                      Post ID: {request.target_id}
                      <a href={`/posts/${request.target_id}`} target="_blank" className="text-[#00ffff] hover:scale-110 transition-transform">
                        <ExternalLink size={14} />
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><Calendar size={14} /> {format(new Date(request.created_at), 'dd MMM, HH:mm')}</span>
                      <span className="flex items-center gap-1.5 text-white/60"><Clock size={14} /> {request.days} Days</span>
                      {request.position && <span className="flex items-center gap-1.5 text-[#00ffff]"><Layout size={14} /> Position {request.position}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 pl-4 md:pl-0 border-l border-white/5 md:border-none">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Amount</p>
                    <p className="text-2xl font-black text-[#90ee90]">₹ {request.amount}</p>
                  </div>
                  
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={processingId === request.id}
                        className="px-6 py-3 rounded-xl bg-[#00ffff] text-black font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                      >
                        {processingId === request.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
