'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Trash2, RefreshCw, Pencil, Eye, Link as LinkIcon, MessageCircle } from 'lucide-react';

/** Build full page number list with ellipsis markers */
function buildPageRange(current: number, total: number): (number | '...')[] {
  if (total <= 10) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [];
  const WING = 3; // pages shown on each side of current page

  pages.push(1);

  const leftEdge = Math.max(2, current - WING);
  const rightEdge = Math.min(total - 1, current + WING);

  if (leftEdge > 2) pages.push('...');
  for (let i = leftEdge; i <= rightEdge; i++) pages.push(i);
  if (rightEdge < total - 1) pages.push('...');

  pages.push(total);
  return pages;
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [jumpValue, setJumpValue] = useState('');
  const pageSize = 100;

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/posts?page=${page}&pageSize=${pageSize}`);
      const data = await res.json();
      setPosts(data.posts || []);
      setTotalCount(data.totalCount || 0);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, [page]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const pageRange = buildPageRange(page, totalPages);

  const goToPage = (p: number) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    setPage(clamped);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Permanently delete "${title}"? This CANNOT be undone.`)) return;
    const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPosts(prev => prev.filter(p => p.id !== id));
      setTotalCount(prev => prev - 1);
    } else {
      alert('Failed to delete post.');
    }
  };

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00ffff]" />
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Manage Posts</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-bold">
            Showing {posts.length} of {totalCount} total posts
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchPosts} className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-white transition-colors">
            <RefreshCw size={18} />
          </button>
          <Link href="/admin/posts/new" className="rounded-lg bg-[#e91e63] px-4 py-2 text-sm font-bold text-white hover:bg-[#c2185b] transition-all">
            Create New Post
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[#161b22] shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[var(--text-primary)]">
            <thead className="border-b border-[var(--border)] bg-[#21262d] text-[10px] uppercase font-black tracking-widest text-[var(--text-secondary)]">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Stats</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post: any) => (
                <tr key={post.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[#21262d]/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-white max-w-xs" title={post.title}>
                    <a href={`/posts/${post.id}`} target="_blank" rel="noreferrer" className="hover:text-[#00ffff] hover:underline line-clamp-1">
                      {post.title}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-[var(--text-muted)] font-medium">{post.source_name}</td>
                  <td className="px-6 py-4 text-[var(--text-muted)] whitespace-nowrap">
                    {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4 text-[var(--text-muted)]">
                      <div className="flex items-center gap-1" title="Views">
                        <Eye size={13} />
                        <span className="text-xs font-bold text-white/90">{post.stats?.views || 0}</span>
                      </div>
                      <div className="flex items-center gap-1" title="WhatsApp">
                        <MessageCircle size={13} className="text-[#25D366]" />
                        <span className="text-xs font-bold text-white/90">{post.stats?.whatsapp || 0}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Facebook">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#1877F2]">
                          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                        </svg>
                        <span className="text-xs font-bold text-white/90">{post.stats?.facebook || 0}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Link Copies">
                        <LinkIcon size={13} className="text-[#00ffff]" />
                        <span className="text-xs font-bold text-white/90">{post.stats?.other || 0}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/posts/${post.id}/edit`} className="p-1.5 rounded bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black transition-all" title="Edit">
                        <Pencil size={15} />
                      </Link>
                      <button
                        onClick={() => handleDelete(post.id, post.title)}
                        className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                        title="Delete Post"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── FULL PAGINATION ── */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-[#21262d] border-t border-[var(--border)] space-y-3">

            {/* Row 1: Page info + Jump-to-page */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-[var(--text-muted)]">
                Page <span className="text-white">{page}</span> of <span className="text-[#00ffff]">{totalPages}</span>
                <span className="ml-2 text-[var(--text-muted)]">({totalCount} posts)</span>
              </span>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = parseInt(jumpValue, 10);
                  if (!isNaN(n)) { goToPage(n); setJumpValue(''); }
                }}
                className="flex items-center gap-2"
              >
                <span className="text-xs text-[var(--text-muted)] font-bold">Jump to:</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpValue}
                  onChange={e => setJumpValue(e.target.value)}
                  placeholder="page #"
                  className="w-20 px-2 py-1 rounded bg-[var(--bg-card)] border border-[var(--border)] text-white text-xs font-bold text-center focus:border-[#00ffff] outline-none [appearance:textfield]"
                />
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-[#00ffff]/10 text-[#00ffff] text-xs font-black hover:bg-[#00ffff] hover:text-black transition-all border border-[#00ffff]/30"
                >
                  Go
                </button>
              </form>
            </div>

            {/* Row 2: All page numbers with ellipsis */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-xs font-bold text-white disabled:opacity-30 hover:border-[#00ffff] transition-all"
              >
                ← Prev
              </button>

              {pageRange.map((p, idx) =>
                p === '...' ? (
                  <span key={`e-${idx}`} className="px-1 text-[var(--text-muted)] text-sm font-bold select-none">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p as number)}
                    className={`min-w-[32px] h-8 px-1.5 rounded text-xs font-black transition-all ${
                      page === p
                        ? 'bg-[#00ffff] text-black shadow-lg shadow-[#00ffff]/20'
                        : 'bg-[var(--bg-card)] border border-[var(--border)] text-white hover:bg-white/10 hover:border-[#00ffff]'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-xs font-bold text-white disabled:opacity-30 hover:border-[#00ffff] transition-all"
              >
                Next →
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
