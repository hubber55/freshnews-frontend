'use client';
export const runtime = 'edge';

import { useState, useEffect } from 'react';
import Plus from 'lucide-react/dist/esm/icons/plus'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2'
import XCircle from 'lucide-react/dist/esm/icons/x-circle'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import Users from 'lucide-react/dist/esm/icons/users'
import Share2 from 'lucide-react/dist/esm/icons/share-2'
import ImageIcon from 'lucide-react/dist/esm/icons/image'
import { createPoll, togglePoll, deletePoll } from './actions';
import { supabase } from '@/lib/supabase';

type Candidate = {
  id?: number;
  name: string;
  seed_votes: number;
  photo_url?: string;
};

type Poll = {
  id: number;
  title: string;
  description: string;
  share_message: string;
  is_active: boolean;
  created_at: string;
  candidates: Candidate[];
  total_votes?: number;
};

export default function ManagePollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCandidates, setNewCandidates] = useState<Candidate[]>([
    { name: '', seed_votes: 0 },
    { name: '', seed_votes: 0 }
  ]);

  useEffect(() => {
    fetchPolls();
  }, []);

  async function fetchPolls() {
    setLoading(true);
    const { data, error } = await supabase
      .from('polls')
      .select(`
        *,
        candidates:poll_candidates(*),
        votes:poll_votes(count)
      `)
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else {
      // Calculate total votes (seed + real)
      const processed = (data || []).map(p => {
        const seedTotal = p.candidates.reduce((sum: number, c: any) => sum + (c.seed_votes || 0), 0);
        const realTotal = p.votes?.[0]?.count || 0;
        return { ...p, total_votes: seedTotal + realTotal };
      });
      setPolls(processed);
    }
    setLoading(false);
  }

  const addCandidateField = () => {
    setNewCandidates([...newCandidates, { name: '', seed_votes: 0 }]);
  };

  const removeCandidateField = (index: number) => {
    setNewCandidates(newCandidates.filter((_, i) => i !== index));
  };

  const handleCandidateChange = (index: number, field: keyof Candidate, value: any) => {
    const updated = [...newCandidates];
    updated[index] = { ...updated[index], [field]: value };
    setNewCandidates(updated);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Manage Polls</h1>
          <p className="text-[var(--text-muted)]">Create and monitor interactive audience polls.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 rounded-xl bg-[#ffd42a] px-6 py-3 font-bold text-black hover:brightness-110 transition-all"
        >
          {showAdd ? <XCircle size={20} /> : <Plus size={20} />}
          {showAdd ? 'Cancel' : 'New Poll'}
        </button>
      </div>

      {showAdd && (
        <div className="mb-10 p-6 rounded-2xl bg-[var(--bg-card)] border border-[#ffd42a]/30 shadow-2xl animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-bold text-[#ffd42a] mb-6 flex items-center gap-2">
            <TrendingUp size={24} /> Create New Poll
          </h2>
          <form action={async (formData) => {
            await createPoll(formData);
            setShowAdd(false);
            setNewCandidates([{ name: '', seed_votes: 0 }, { name: '', seed_votes: 0 }]);
            fetchPolls();
          }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">Poll Title</label>
                  <input name="title" required placeholder="e.g. Who should be the next CM?" className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#ffd42a] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">Description (Optional)</label>
                  <textarea name="description" rows={3} placeholder="Add context for this poll..." className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#ffd42a] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">WhatsApp Share Message</label>
                  <textarea name="shareMessage" rows={2} required placeholder="I just voted in the Kerala People's Poll! Cast your vote here:" className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#ffd42a] outline-none" />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" name="isActive" id="isActive" className="w-5 h-5 accent-[#ffd42a]" />
                  <label htmlFor="isActive" className="text-sm font-bold text-white">Set as Active Poll immediately</label>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-bold text-[var(--text-secondary)]">Candidates</label>
                {newCandidates.map((cand, idx) => (
                  <div key={idx} className="space-y-3 p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <input 
                        name="candidateName" 
                        required 
                        placeholder="Candidate Name" 
                        value={cand.name}
                        onChange={(e) => handleCandidateChange(idx, 'name', e.target.value)}
                        className="flex-1 bg-transparent text-white outline-none text-sm font-bold" 
                      />
                      <input 
                        type="number" 
                        name="candidateSeed" 
                        placeholder="Seed" 
                        value={cand.seed_votes}
                        onChange={(e) => handleCandidateChange(idx, 'seed_votes', parseInt(e.target.value))}
                        className="w-20 bg-black/30 text-white outline-none text-sm px-2 py-1 rounded font-mono" 
                      />
                      {newCandidates.length > 2 && (
                        <button type="button" onClick={() => removeCandidateField(idx)} className="text-red-400 hover:text-red-300">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-20 rounded-lg bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center group/img">
                        {cand.photo_url ? (
                          <img src={cand.photo_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <ImageIcon size={20} className="text-white/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-[8px] font-bold text-[#ffd42a] uppercase text-center p-1">
                          Click to Change
                        </div>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            const btn = e.target.parentElement;
                            if (btn) btn.style.opacity = '0.5';
                            
                            try {
                              const path = `candidates/${Date.now()}-${file.name.replace(/\s/g, '_')}`;
                              const { data, error } = await supabase.storage.from('poll-assets').upload(path, file);
                              
                              if (error) throw error;
                              
                              if (data) {
                                const { data: { publicUrl } } = supabase.storage.from('poll-assets').getPublicUrl(path);
                                handleCandidateChange(idx, 'photo_url', publicUrl);
                              }
                            } catch (err: any) {
                              alert('Upload failed: ' + err.message);
                            } finally {
                              if (btn) btn.style.opacity = '1';
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-[var(--text-muted)] mb-1 uppercase font-bold">Candidate Photo</p>
                        <input type="hidden" name="candidatePhoto" value={cand.photo_url || ''} />
                        <span className="text-[10px] text-[#ffd42a] font-medium leading-none">
                          {cand.photo_url ? '✓ Photo Ready' : 'Click box to upload'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addCandidateField} className="w-full py-2 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--text-muted)] hover:border-[#ffd42a] hover:text-[#ffd42a] transition-all flex items-center justify-center gap-2 font-bold text-sm">
                  <Plus size={16} /> Add Candidate
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)]">
              <button type="submit" className="w-full md:w-auto px-10 py-4 rounded-xl bg-[#ffd42a] text-black font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#ffd42a]/20">
                Save and Launch Poll
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-[var(--text-muted)]">Loading polls...</div>
      ) : polls.length === 0 ? (
        <div className="text-center py-20 rounded-3xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-card)]">
          <TrendingUp size={48} className="mx-auto text-[var(--text-muted)] mb-4 opacity-20" />
          <h3 className="text-xl font-bold text-white mb-1">No polls yet</h3>
          <p className="text-[var(--text-muted)] mb-6">Create your first poll to engage your audience.</p>
          <button onClick={() => setShowAdd(true)} className="text-[#ffd42a] font-bold hover:underline">Create Poll Now</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {polls.map((poll) => (
            <div key={poll.id} className={`p-6 rounded-2xl bg-[var(--bg-card)] border ${poll.is_active ? 'border-[#ffd42a]' : 'border-[var(--border)]'} transition-all`}>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-black text-white truncate">{poll.title}</h3>
                    {poll.is_active && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#ffd42a]/10 border border-[#ffd42a]/30 text-[10px] font-black text-[#ffd42a] uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ffd42a] animate-pulse" />
                        Active Now
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-muted)] line-clamp-1">{poll.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => togglePoll(poll.id, !poll.is_active)}
                    className={`p-2.5 rounded-xl transition-all ${poll.is_active ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-[#ffd42a]/10 text-[#ffd42a] hover:bg-[#ffd42a]/20'}`}
                    title={poll.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {poll.is_active ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
                  </button>
                  <button
                    onClick={() => { if(confirm('Delete this poll?')) deletePoll(poll.id); }}
                    className="p-2.5 rounded-xl bg-white/5 text-[var(--text-muted)] hover:bg-red-500/20 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {poll.candidates.map((cand, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[var(--bg-primary)] border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-white truncate">{cand.name}</span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Seed: {cand.seed_votes}</span>
                      </div>
                      <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#ffd42a] opacity-50" 
                          style={{ width: `${poll.total_votes && poll.total_votes > 0 ? (cand.seed_votes / poll.total_votes) * 100 : 0}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-center items-center text-center">
                  <Users size={32} className="text-[#ffd42a] mb-2" />
                  <div className="text-2xl font-black text-white">{poll.total_votes?.toLocaleString()}</div>
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Total Combined Votes</div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-medium">
                    <TrendingUp size={14} /> Created {new Date(poll.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-medium">
                    <Share2 size={14} /> Custom Share Active
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
