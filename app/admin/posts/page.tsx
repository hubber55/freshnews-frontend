'use client';
export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import Pencil from 'lucide-react/dist/esm/icons/pencil'
import Eye from 'lucide-react/dist/esm/icons/eye'
import LinkIcon from 'lucide-react/dist/esm/icons/link'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle'
import Share2 from 'lucide-react/dist/esm/icons/share-2'

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 100;
  const router = useRouter();

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
          <Link href="/admin/posts/new" className="rounded-lg bg-[#e91e63] px-4 py-2 text-sm font-bold text-white hover:bg-[#c2185b] transition-all shadow-lg hover:shadow-[#e91e63]/20">
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
                <th className="px-6 py-4">Engagement Stats</th>
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
                    <div className="flex items-center gap-5 text-[var(--text-muted)]">
                      {/* Views */}
                      <div className="flex items-center gap-1.5 group" title="Total Views">
                        <Eye size={14} className="group-hover:text-white transition-colors" />
                        <span className="text-xs font-bold text-white/90">{post.stats?.views || 0}</span>
                      </div>
                      
                      {/* WhatsApp */}
                      <div className="flex items-center gap-1.5 group" title="WhatsApp Shares">
                        <MessageCircle size={14} className="text-[#25D366]" />
                        <span className="text-xs font-bold text-white/90">{post.stats?.whatsapp || 0}</span>
                      </div>

                      {/* Facebook */}
                      <div className="flex items-center gap-1.5 group" title="Facebook Shares">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#1877F2]">
                          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                        </svg>
                        <span className="text-xs font-bold text-white/90">{post.stats?.facebook || 0}</span>
                      </div>

                      {/* Copy Link / Others */}
                      <div className="flex items-center gap-1.5 group" title="Link Copies & Others">
                        <LinkIcon size={14} className="text-[#00ffff]" />
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

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-[#21262d] border-t border-[var(--border)]">
            <div className="text-xs font-bold text-[var(--text-muted)]">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-xs font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#00ffff] transition-all"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = page;
                  if (page <= 3) pageNum = i + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = page - 2 + i;

                  if (pageNum < 1 || pageNum > totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded text-xs font-black transition-all ${
                        page === pageNum 
                        ? 'bg-[#00ffff] text-black' 
                        : 'bg-[var(--bg-card)] text-white hover:bg-white/10'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-xs font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#00ffff] transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
