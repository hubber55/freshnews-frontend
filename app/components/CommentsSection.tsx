'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  wa_users: { name: string };
}

interface CommentsSectionProps {
  postId: number;
}

export default function CommentsSection({ postId }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userName, setUserName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch comments
    fetch(`/api/comments?postId=${postId}`)
      .then(res => res.json())
      .then(data => setComments(data.comments || []))
      .catch(() => {});

    // Fetch user
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUserName(data.name))
      .catch(() => {});
  }, [postId]);

  const submitComment = async () => {
    if (!newComment.trim()) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ postId, content: newComment.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setComments(prev => [data.comment, ...prev]);
      setNewComment('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to post comment');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-12 border-t border-[var(--border)] pt-8">
      <h3 className="text-xl font-bold text-white mb-4">
        {userName ? `Enter Your Comments - ${userName}` : (
          <>
            Enter Your Comments - <Link href="/login" className="text-[#00cfff] hover:underline">Login/Signup</Link>
          </>
        )}
      </h3>

      {userName && (
        <div className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write your comment..."
            rows={3}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#ffd42a] focus:outline-none focus:ring-1 focus:ring-[#ffd42a] resize-none"
          />
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
          <button
            onClick={submitComment}
            disabled={busy || !newComment.trim()}
            className="mt-3 rounded-lg bg-[#ffd42a] px-6 py-2 font-bold text-[#0d1117] hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-lg bg-[var(--bg-card)] p-4 border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-[#ffd42a]">{comment.wa_users.name || 'Anonymous'}</span>
              <span className="text-xs text-[var(--text-muted)]">
                {new Date(comment.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-[var(--text-primary)]">{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}