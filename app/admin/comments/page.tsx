'use client';

import { useState, useEffect } from 'react';
import { 
  Check, Trash2, MessageCircle, Clock, 
  ExternalLink, User, MessageSquare, AlertCircle,
  RefreshCw, Search
} from 'lucide-react';
import Link from 'next/link';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  post_id: number;
  is_approved: boolean;
  wa_users: {
    name: string;
    username: string;
  };
  posts: {
    title: string;
  };
}

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/comments${filter === 'pending' ? '?approved=false' : ''}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [filter]);

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch('/api/admin/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_approved: true })
      });
      if (res.ok) {
        setComments(comments.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error('Error approving comment:', err);
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/comments?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setComments(comments.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <MessageSquare size={32} className="text-[#ffd42a]" />
            MODERATE COMMENTS
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Manage and approve user interactions on your news posts.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filter === 'pending' ? 'bg-[#ffd42a] text-black' : 'text-white hover:bg-white/5'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filter === 'all' ? 'bg-[#ffd42a] text-black' : 'text-white hover:bg-white/5'
            }`}
          >
            All History
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <RefreshCw className="text-[#ffd42a] animate-spin mb-4" size={40} />
          <p className="text-white font-bold">Scanning for comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <Check className="text-green-500 mb-4" size={48} />
          <p className="text-white font-bold text-xl">Inbox Zero!</p>
          <p className="text-[var(--text-muted)] mt-2 text-center max-w-md px-6">
            All caught up. No {filter === 'pending' ? 'pending' : ''} comments found in your queue.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div 
              key={comment.id}
              className={`p-6 rounded-2xl bg-[#1c1c1c] border border-[var(--border)] hover:border-white/20 transition-all ${
                actionId === comment.id ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-[#ffd42a]/20 flex items-center justify-center text-[#ffd42a]">
                      <User size={16} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold leading-none">
                        {comment.wa_users?.username || comment.wa_users?.name || 'Anonymous User'}
                      </h3>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-white text-lg leading-relaxed mb-4 whitespace-pre-wrap italic">
                    "{comment.content}"
                  </p>

                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Clock size={12} />
                    <span>On Post: </span>
                    <Link 
                      href={`/posts/${comment.post_id}`} 
                      target="_blank"
                      className="text-[#00cfff] hover:underline flex items-center gap-1 font-bold"
                    >
                      {comment.posts?.title}
                      <ExternalLink size={10} />
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!comment.is_approved && (
                    <button
                      onClick={() => handleApprove(comment.id)}
                      disabled={actionId === comment.id}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95 shadow-lg shadow-green-900/20"
                    >
                      <Check size={20} />
                      APPROVE
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={actionId === comment.id}
                    className="flex items-center justify-center gap-2 bg-white/5 hover:bg-red-600/20 hover:text-red-500 text-[var(--text-muted)] font-bold py-3 px-4 rounded-xl transition-all active:scale-95 border border-white/10 hover:border-red-500/50"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
