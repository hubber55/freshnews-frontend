'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Users, CheckCircle2, Share2, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Candidate = {
  id: number;
  name: string;
  photo_url?: string;
  seed_votes: number;
  vote_count?: number;
};

type Poll = {
  id: number;
  title: string;
  description: string;
  share_message: string;
  candidates: Candidate[];
};

import { useAuth } from './AuthProvider';

export default function PollCard() {
  const { user } = useAuth();
  const userId = user?.id;

  const [poll, setPoll] = useState<Poll | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedId, setVotedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [results, setResults] = useState<Record<number, number>>({});
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    fetchActivePoll();
  }, [userId]);

  async function fetchActivePoll() {
    setLoading(true);
    // 1. Get active poll
    const { data: activePoll, error } = await supabase
      .from('polls')
      .select('*, candidates:poll_candidates(*)')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error || !activePoll) {
      setLoading(false);
      return;
    }

    setPoll(activePoll);
    
    // Always fetch results to show total votes at the bottom
    await fetchResults(activePoll);

    // 2. Check if user has voted
    if (userId) {
      const { data: voteData } = await supabase
        .from('poll_votes')
        .select('candidate_id')
        .eq('poll_id', activePoll.id)
        .eq('user_id', userId)
        .single();
      
      if (voteData) {
        setHasVoted(true);
        setVotedId(voteData.candidate_id);
      }
    }
    setLoading(false);
  }

  async function fetchResults(activePoll: Poll) {
    const resMap: Record<number, number> = {};
    activePoll.candidates.forEach(c => {
      resMap[c.id] = c.seed_votes;
    });

    try {
      // Manual count is safest if RPC is not perfectly synced
      const { data: manualVotes } = await supabase
          .from('poll_votes')
          .select('candidate_id')
          .eq('poll_id', activePoll.id);
      
      manualVotes?.forEach(v => {
          resMap[v.candidate_id] = (resMap[v.candidate_id] || 0) + 1;
      });
    } catch (err) {
      console.error('Results fetch error:', err);
    }

    setResults(resMap);
    const total = Object.values(resMap).reduce((a, b) => a + b, 0);
    setTotalVotes(total);
  }

  const handleVote = async (candidateId: number) => {
    if (!userId) {
      window.location.href = '/login?redirect=/';
      return;
    }

    setVoting(true);
    try {
      const res = await fetch('/api/polls/vote', {
        method: 'POST',
        body: JSON.stringify({ pollId: poll?.id, candidateId, userId }),
      });
      const json = await res.json();
      if (json.ok) {
        setHasVoted(true);
        setVotedId(candidateId);
        if (poll) fetchResults(poll);
      } else {
        alert(json.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVoting(false);
    }
  };

  if (loading && !poll) {
    return (
      <div className="my-8 overflow-hidden rounded-2xl bg-[var(--bg-card)] border-2 border-[var(--border)] animate-pulse">
        <div className="bg-[var(--border)] h-10 w-full" />
        <div className="p-6 space-y-4">
          <div className="h-8 bg-[var(--border)] w-3/4 rounded" />
          <div className="h-4 bg-[var(--border)] w-1/2 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            <div className="aspect-[4/5] bg-[var(--border)] rounded-xl" />
            <div className="aspect-[4/5] bg-[var(--border)] rounded-xl" />
            <div className="aspect-[4/5] bg-[var(--border)] rounded-xl hidden sm:block" />
          </div>
        </div>
      </div>
    );
  }

  if (!poll) return null;

  return (
    <div className="my-8 overflow-hidden rounded-2xl bg-[var(--bg-card)] border-2 border-[#ffd42a]/30 shadow-2xl">
      <div className="bg-[#ffd42a] px-6 py-3 flex items-center justify-between">
        <span className="text-[14px] font-black uppercase tracking-widest text-black flex items-center gap-2">
          <TrendingUp size={18} /> The People's Poll
        </span>
        <span className="text-[12px] font-black text-black uppercase tracking-wider">
          {hasVoted ? 'Live Results' : 'Cast Your Vote'}
        </span>
      </div>

      <div className="p-6">
        <h2 className="text-3xl font-black text-white mb-3 leading-tight">
          {poll.title}
        </h2>
        <p className="text-[#00ffff] text-sm md:text-base font-bold mb-8 leading-relaxed opacity-90">
          {poll.description}
        </p>

        <div className={!hasVoted ? "grid grid-cols-2 sm:grid-cols-3 gap-5" : "space-y-6"}>
          {(() => {
            const sortedCandidates = [...poll.candidates].sort((a, b) => (results[b.id] || 0) - (results[a.id] || 0));
            
            return sortedCandidates.map((cand, index) => {
              const voteCount = results[cand.id] || 0;
              const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
              const isSelected = votedId === cand.id;

              // Rank-based colors
              let barColor = '#ffd42a'; // Default yellow
              if (hasVoted) {
                if (index === 0) barColor = '#4ade80'; // 1st: LightGreen
                else if (index === 1) barColor = '#ffd42a'; // 2nd: Yellow
                else if (index === 2) barColor = '#ef4444'; // 3rd: Red
                else barColor = `rgba(255, 212, 42, ${Math.max(0.2, 1 - index * 0.2)})`; // others: variation
              }

              return (
                <div key={cand.id} className="relative">
                  {!hasVoted ? (
                    <button
                      disabled={voting}
                      onClick={() => handleVote(cand.id)}
                      className={`w-full group flex flex-col rounded-xl overflow-hidden bg-[var(--bg-primary)] border transition-all shadow-lg ${voting ? 'opacity-70 scale-95 border-[#ffd42a] shadow-[0_0_15px_rgba(255,212,42,0.4)]' : 'border-[var(--border)] hover:border-[#ffd42a]'}`}
                    >
                      <div className="relative aspect-[4/5] w-full overflow-hidden bg-black/20">
                        {cand.photo_url ? (
                          <img 
                            src={cand.photo_url} 
                            alt={cand.name} 
                            className={`w-full h-full object-cover transition-transform duration-500 ${voting ? 'scale-105 blur-[2px]' : 'group-hover:scale-105'}`} 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon size={48} className="text-white/10" />
                          </div>
                        )}
                        
                        {voting && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                            <div className="w-8 h-8 border-4 border-[#ffd42a] border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80" />
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="text-[13px] md:text-[15px] font-black text-white uppercase truncate drop-shadow-md">{cand.name}</p>
                        </div>
                      </div>
                      <div className={`py-3.5 text-center text-[13px] md:text-[15px] font-black uppercase text-black transition-all tracking-widest ${voting ? 'bg-white/50 text-white/50' : 'bg-[#ffd42a] group-hover:brightness-110'}`}>
                        {voting ? 'Processing...' : 'Cast Vote'}
                      </div>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-end mb-1">
                        <div className="flex items-center gap-3">
                          {cand.photo_url && (
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shadow-md">
                              <img src={cand.photo_url} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className={`font-black text-sm md:text-base uppercase leading-tight ${isSelected ? 'text-[#ffd42a]' : 'text-white'}`}>
                              {cand.name}
                            </span>
                            {isSelected && (
                              <div className="flex items-center gap-1 text-[10px] text-[#ffd42a] font-bold uppercase">
                                <CheckCircle2 size={10} /> Your Vote
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-mono font-black text-white drop-shadow-sm">
                          {percentage}% ({voteCount.toLocaleString()})
                        </span>
                      </div>
                      <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <div 
                          className="h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,212,42,0.2)]"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: barColor
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[var(--text-muted)]" />
            {userId ? (
              <span className="text-xs font-black uppercase tracking-wider text-white">
                {totalVotes.toLocaleString()} Total Votes
              </span>
            ) : (
              <button 
                onClick={() => window.location.href = '/login?redirect=/'}
                className="flex items-center gap-2 px-3 py-1 rounded bg-[#ffd42a]/10 border border-[#ffd42a]/30 text-[#ffd42a] text-[10px] font-black uppercase tracking-widest hover:bg-[#ffd42a]/20 transition-all"
              >
                Reveal Total Votes
              </button>
            )}
          </div>

          {hasVoted && (
            <button 
              onClick={() => {
                const url = window.location.href;
                const text = poll.share_message;
                if (navigator.share) {
                  navigator.share({ title: poll.title, text, url });
                } else {
                  window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n\n' + url)}`);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-all text-xs font-bold uppercase tracking-widest"
            >
              <Share2 size={14} /> Share Poll
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
