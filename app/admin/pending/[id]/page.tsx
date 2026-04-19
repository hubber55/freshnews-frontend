'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSubmission, approveSubmission, rejectSubmission, updateSubmission, deleteSubmission } from '../actions';

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

export default function ReviewSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submissionId, setSubmissionId] = useState<string>('');
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const fetchSubmission = useCallback(async () => {
    try {
      const { id } = await params;
      setSubmissionId(id);
      const data = await getSubmission(id);
      setSubmission(data);
      setTitle(data.title);
      setContent(data.content);
      setTags(data.tags?.join(', ') || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params]);

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
      
      await approveSubmission(submissionId, formData);
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
      await rejectSubmission(submissionId);
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
      
      await updateSubmission(submissionId, formData);
      alert('Changes saved successfully.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('⚠️ WARNING: This will permanently delete the submission.\n\nAre you sure?')) return;
    
    setSaving(true);
    try {
      await deleteSubmission(submissionId);
      alert('Submission deleted successfully.');
      router.push('/admin/pending');
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
          <h3 className="font-semibold text-white mb-3">User Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 mb-1">User ID:</p>
              <p className="text-white break-all">{submission.user_id}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">WhatsApp:</p>
              <p className="text-white">{submission.user_whatsapp || 'N/A'}</p>
            </div>
          </div>
          <div className="mt-3 text-sm">
            <p className="text-gray-400">Uploaded at:</p>
            <p className="text-white">{new Date(submission.created_at).toLocaleString('en-IN', { 
              dateStyle: 'medium', 
              timeStyle: 'short',
              timeZone: 'Asia/Kolkata'
            })} IST</p>
          </div>
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
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold disabled:opacity-50"
          >
            {saving ? 'Processing...' : 'Reject'}
          </button>
          
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold disabled:opacity-50 ml-auto"
          >
            {saving ? 'Processing...' : 'Delete'}
          </button>
        </div>
      </form>
    </div>
  );
}
