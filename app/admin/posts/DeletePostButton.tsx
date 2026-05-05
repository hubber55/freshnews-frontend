'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DeletePostButton({ postId }: { postId: number }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to PERMANENTLY delete this post? This cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert('Error: ' + (data.error || 'Failed to delete post'));
      }
    } catch (err) {
      alert('Error deleting post');
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="text-red-500 hover:text-red-400 p-1"
      title="Permanent Delete"
    >
      <Trash2 size={16} />
    </button>
  );
}
