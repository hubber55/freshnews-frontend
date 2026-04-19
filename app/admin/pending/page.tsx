'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/app/utils/supabase/client';

interface Submission {
  id: string;
  title: string;
  content: string;
  type: 'news' | 'event' | 'classified';
  image_url: string | null;
  user_id: string;
  created_at: string;
  user_whatsapp: string | null;
}

export default function PendingPostsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  async function fetchSubmissions() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Pending Posts</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Pending Posts</h1>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pending Posts</h1>
        <Link 
          href="/admin" 
          className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition"
        >
          Back to Admin
        </Link>
      </div>

      {submissions.length === 0 ? (
        <p className="text-gray-400">No pending submissions.</p>
      ) : (
        <div className="grid gap-4">
          {submissions.map((submission) => (
            <div 
              key={submission.id} 
              className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)]"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold mb-2 ${
                    submission.type === 'news' ? 'bg-yellow-500/20 text-yellow-400' :
                    submission.type === 'event' ? 'bg-green-500/20 text-green-400' :
                    'bg-pink-500/20 text-pink-400'
                  }`}>
                    {submission.type.toUpperCase()}
                  </span>
                  <h2 className="text-xl font-semibold">{submission.title}</h2>
                  <p className="text-sm text-gray-400">
                    Submitted: {new Date(submission.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/admin/pending/${submission.id}`}
                  className="px-4 py-2 bg-[#00cfff] text-black rounded-lg hover:bg-[#00b8e6] transition font-semibold"
                >
                  Review & Publish
                </Link>
              </div>
              
              <p className="text-gray-300 line-clamp-3 mb-3">
                {submission.content}
              </p>
              
              {submission.image_url && (
                <img 
                  src={submission.image_url} 
                  alt={submission.title}
                  className="w-32 h-20 object-cover rounded"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
