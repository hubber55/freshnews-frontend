'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Trash2, RefreshCw, Pencil } from 'lucide-react';

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/posts');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Permanently delete "${title}"? This CANNOT be undone.`)) return;
    const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPosts(prev => prev.filter(p => p.id !== id));
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
        <h1 className="text-2xl font-bold text-white">Manage Posts</h1>
        <div className="flex gap-3">
          <button onClick={fetchPosts} className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-white">
            <RefreshCw size={18} />
          </button>
          <Link href="/admin/posts/new" className="rounded-lg bg-[#e91e63] px-4 py-2 text-sm font-bold text-white hover:bg-[#c2185b]">
            Create New Post
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[#161b22]">
        <table className="w-full text-left text-sm text-[var(--text-primary)]">
          <thead className="border-b border-[var(--border)] bg-[#21262d] text-xs uppercase text-[var(--text-secondary)]">
            <tr>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post: any) => (
              <tr key={post.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[#21262d]/50">
                <td className="px-6 py-4 font-medium text-white max-w-xs truncate" title={post.title}>
                  <a href={`/posts/${post.id}`} target="_blank" rel="noreferrer" className="hover:text-[#00ffff] hover:underline">
                    {post.title}
                  </a>
                </td>
                <td className="px-6 py-4 text-[var(--text-muted)]">{post.source_name}</td>
                <td className="px-6 py-4 text-[var(--text-muted)]">
                  {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : 'N/A'}
                </td>
                <td className="px-6 py-4">
                  {post.is_deleted ? (
                    <span className="rounded bg-red-500/20 px-2 py-1 text-xs font-bold text-red-500">Deleted</span>
                  ) : (
                    <span className="rounded bg-green-500/20 px-2 py-1 text-xs font-bold text-[#00b894]">Active</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/posts/${post.id}/edit`} className="p-1.5 rounded bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black" title="Edit">
                      <Pencil size={15} />
                    </Link>
                    <button
                      onClick={() => handleDelete(post.id, post.title)}
                      className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                      title="Hard Delete"
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
    </div>
  );
}
