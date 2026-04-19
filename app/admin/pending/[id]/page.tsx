'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSubmission, approveSubmission, rejectSubmission, updateSubmission } from '../actions';

interface Submission {
  id: string;
  title: string;
  content: string;
  type: 'news' | 'event' | 'classified';
  image_url: string | null;
  tags: string[];
  user_id: string;
  user_whatsapp: string | null;
  created_at: string;
}

export default function ReviewSubmissionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const fetchSubmission = useCallback(async () => {
    try {
      const data = await getSubmission(params.id);
      setSubmission(data);
      setTitle(data.title);
      setContent(data.content);
      setTags(data.tags?.join(', ') || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    try {
      const formData = new FormData();
      formData.set('title', title);
      formData.set('content', content);
      formData.set('tags', tags);
      
      await approveSubmission(params.id, formData);
      alert('Post published successfully! WhatsApp notification sent to user.');
      router.push('/admin/pending');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!confirm('Are you sure you want to reject this submission?')) return;
    
    setSaving(true);
    try {
      await rejectSubmission(params.id);
      alert('Submission rejected. WhatsApp notification sent to user.');
      router.push('/admin/pending');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set('title', title);
      formData.set('content', content);
      formData.set('tags', tags);
      
      await updateSubmission(params.id, formData);
      alert('Changes saved successfully.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-500">Error: {error || 'Submission not found'}</p>
        <Link href="/admin/pending" className="text-[#00cfff] hover:underline">
          Back to Pending Posts
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Review Submission</h1>
        <Link 
          href="/admin/pending" 
          className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition"
        >
          Back
        </Link>
      </div>

      <form onSubmit={handleApprove} className="space-y-6">
        <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)]">
          <label className="block text-sm font-bold mb-2">Type</label>
          <span className={`inline-block px-3 py-1 rounded font-bold ${
            submission.type === 'news' ? 'bg-yellow-500/20 text-yellow-400' :
            submission.type === 'event' ? 'bg-green-500/20 text-green-400' :
            'bg-pink-500/20 text-pink-400'
          }`}>
            {submission.type.toUpperCase()}
          </span>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:border-[#00cfff] focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">Content (Max 800 words)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:border-[#00cfff] focus:outline-none"
            required
          />
          <p className="text-sm text-gray-400 mt-1">
            {content.trim().split(/\s+/).length} words
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">Tags (comma separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:border-[#00cfff] focus:outline-none"
            placeholder="news, kerala, music"
          />
        </div>

        {submission.image_url && (
          <div>
            <label className="block text-sm font-bold mb-2">Image</label>
            <img 
              src={submission.image_url} 
              alt={submission.title}
              className="max-w-md rounded-lg"
            />
          </div>
        )}

        <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)]">
          <p className="text-sm text-gray-400">
            <strong>Submitted by:</strong> {submission.user_id}<br />
            <strong>WhatsApp:</strong> {submission.user_whatsapp || 'N/A'}<br />
            <strong>Submitted on:</strong> {new Date(submission.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap gap-4 pt-4">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="px-6 py-3 bg-gray-600 rounded-lg hover:bg-gray-700 transition font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50"
          >
            {saving ? 'Publishing...' : 'Publish Post'}
          </button>
          
          <button
            type="button"
            onClick={handleReject}
            disabled={saving}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold disabled:opacity-50"
          >
            {saving ? 'Processing...' : 'Reject'}
          </button>
        </div>
      </form>
    </div>
  );
}
