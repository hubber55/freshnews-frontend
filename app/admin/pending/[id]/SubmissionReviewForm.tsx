'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { rejectSubmission, updateSubmission, deleteSubmission } from '../actions';
import { ImageUploadWidget } from '@/app/components/ImageUploadWidget';

interface Submission {
  id: string;
  title: string;
  content: string;
  type: 'news' | 'event' | 'classified' | 'ad';
  image_url: string | null;
  user_id: string;
  user_whatsapp: string | null;
  created_at: string;
  tags?: string[];
  price?: string | null;
  contact_phone?: string | null;
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Unexpected error';
}

export default function SubmissionReviewForm({ submission, id }: { submission: Submission; id: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(submission.title);
  const [content, setContent] = useState(submission.content);
  const [price, setPrice] = useState(submission.price || '');
  const [contactPhone, setContactPhone] = useState(submission.contact_phone || '');
  const [existingUrls, setExistingUrls] = useState<string[]>(() => {
    if (!submission.image_url) return [];
    try {
      const parsed = submission.image_url.startsWith('["') ? JSON.parse(submission.image_url) : submission.image_url;
      return Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch {
      return [submission.image_url];
    }
  });
  const [newFiles, setNewFiles] = useState<File[]>([]);

  async function uploadNewImages() {
    if (newFiles.length === 0) return existingUrls;
    const formData = new FormData();
    formData.append('imageCount', newFiles.length.toString());
    newFiles.forEach((file, i) => formData.append(`imageFile_${i}`, file));
    
    const uploadRes = await fetch('/api/upload-images', { method: 'POST', body: formData });
    if (!uploadRes.ok) {
      throw new Error('Failed to upload new images');
    }
    const { urls } = await uploadRes.json();
    return [...existingUrls, ...urls];
  }

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    try {
      const finalUrls = await uploadNewImages();
      const response = await fetch(`/api/admin/submissions/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title, 
          content, 
          tags: submission.tags || [],
          price,
          contact_phone: contactPhone,
          image_url: finalUrls.length > 0 ? JSON.stringify(finalUrls) : null
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to approve submission');
      }

      alert('Post published successfully!');
      router.push('/admin/pending');
    } catch (err: unknown) {
      alert('Error: ' + getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!confirm('Are you sure you want to reject this submission?')) return;
    
    setSaving(true);
    try {
      await rejectSubmission(id);
      alert('Submission rejected.');
      router.push('/admin/pending');
    } catch (err: unknown) {
      alert('Error: ' + getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      const finalUrls = await uploadNewImages();
      const formData = new FormData();
      formData.set('title', title);
      formData.set('content', content);
      formData.set('price', price);
      formData.set('contact_phone', contactPhone);
      formData.set('image_url', finalUrls.length > 0 ? JSON.stringify(finalUrls) : '');
      formData.set('clear_image', finalUrls.length === 0 ? 'on' : 'off');
      
      await updateSubmission(id, formData);
      alert('Changes saved successfully.');
    } catch (err: unknown) {
      alert('Error: ' + getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('⚠️ WARNING: This will permanently delete the submission.\n\nAre you sure?')) return;
    
    setSaving(true);
    try {
      await deleteSubmission(id);
      alert('Submission deleted successfully.');
      router.push('/admin/pending');
    } catch (err: unknown) {
      alert('Error: ' + getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }



  return (
    <form onSubmit={handleApprove} className="space-y-6">
      <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)]">
        <label className="block text-sm font-bold mb-2">Type</label>
        <span className={`inline-block px-3 py-1 rounded font-bold ${
          submission.type === 'news' ? 'bg-yellow-500/20 text-yellow-400' :
          submission.type === 'event' ? 'bg-green-500/20 text-green-400' :
          submission.type === 'classified' ? 'bg-pink-500/20 text-pink-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          {submission.type.toUpperCase()}
        </span>
      </div>

      <div className="mx-2">
        <label className="block text-sm font-bold mb-2">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:border-[#00cfff] focus:outline-none"
          required
        />
      </div>

      <div className="mx-2">
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

      {(submission.type === 'classified' || submission.type === 'ad') && (
        <div className="space-y-4 mx-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Price</label>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:border-[#00cfff] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Contact Phone</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:border-[#00cfff] focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      <div className="mx-2">
        <ImageUploadWidget
          existingUrls={existingUrls}
          onExistingUrlsChange={setExistingUrls}
          newFiles={newFiles}
          onNewFilesChange={setNewFiles}
          maxImages={5}
          onError={alert}
        />
      </div>

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
  );
}
