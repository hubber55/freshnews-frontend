'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  wa_users: { 
    name: string;
    username: string;
  };
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
  const [success, setSuccess] = useState<string | null>(null);

  const wordCount = newComment.trim() ? newComment.trim().split(/\s+/).length : 0;
  const exceedsWordLimit = wordCount > 100;

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
    if (exceedsWordLimit) {
      setError('Comment can have at most 100 words.');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ postId, content: newComment.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setNewComment('');
      setSuccess(data.message || 'Comments will be moderated and published soon');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to post comment');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-12 border-t border-[var(--border)] pt-8">
      <h3 className="text-xl font-bold text-white mb-4">
        {userName ? (
          <>
            Post your comment <span className="text-[#ffd42a] text-[12px] font-normal">( Comments Moderated )</span>
          </>
        ) : (
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
          <p className={`mt-2 text-xs ${exceedsWordLimit ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
            {wordCount}/100 words
          </p>
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
          {success && (
            <p className="mt-2 text-sm text-green-400">{success}</p>
          )}
          <button
            onClick={submitComment}
            disabled={busy || !newComment.trim() || exceedsWordLimit}
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
              <span className="font-semibold text-[#ffd42a]">
                {comment.wa_users?.username || comment.wa_users?.name || 'FreshNews User'}
              </span>
            </div>
            <p className="text-[var(--text-primary)]">{comment.content}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-center py-4 text-[var(--text-muted)] text-sm italic">
            No comments yet. Be the first to start the conversation!
          </p>
        )}
      </div>
    </div>
  );
}
