'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '../components/header';
import Footer from '../components/footer';
import { User, Edit, Clock, CheckCircle, XCircle, FileText, Calendar, Tag, Newspaper, Trash2, ExternalLink } from 'lucide-react';

type UserSubmission = {
  id: number;
  title: string;
  type: 'news' | 'event' | 'classified' | 'ad';
  status: 'pending' | 'published' | 'rejected';
  submitted_at: string;
  published_at?: string;
};

type UserProfile = {
  name: string;
  nickname: string;
  email: string;
  whatsappNumber: string;
};

type PublishedPost = {
  id: number;
  title: string;
  published_at: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>([]);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [nicknameEditCount, setNicknameEditCount] = useState(0);
  const [emailEditCount, setEmailEditCount] = useState(0);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    // Fetch user profile and submissions
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.name && !data.whatsappNumber) {
          // Not logged in, redirect to login
          window.location.href = '/login?redirect=/profile';
          return;
        }
        setProfile(data);
        setNewNickname(data.nickname || '');
        setNewEmail(data.email || '');
        setNicknameEditCount(data.nicknameEditCount || 0);
        setEmailEditCount(data.emailEditCount || 0);
        
        // Fetch user's published posts
        fetch('/api/user/published-posts')
          .then(res => res.json())
          .then(postsData => {
            if (postsData.posts) {
              setPublishedPosts(postsData.posts);
            }
          })
          .catch(() => {
            setPublishedPosts([]);
          });
        
        setIsLoading(false);
      })
      .catch(err => {
        setError('Failed to load profile');
        setIsLoading(false);
      });

    // Fetch user's submissions
    fetch('/api/user/submissions')
      .then(res => res.json())
      .then(data => {
        if (data.submissions) {
          setSubmissions(data.submissions);
        }
      })
      .catch(() => {
        // Submissions API might not exist yet
        setSubmissions([]);
      });
  }, []);

  async function handleDeletePost(postId: number) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const res = await fetch(`/api/user/delete-post/${postId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setPublishedPosts(prev => prev.filter(p => p.id !== postId));
        setUpdateMessage('Post deleted successfully');
        setTimeout(() => setUpdateMessage(null), 3000);
      } else {
        setError('Failed to delete post');
      }
    } catch {
      setError('Failed to delete post');
    }
  }

  const handleStartEditNickname = () => {
    if (nicknameEditCount >= 3) {
      alert('You have reached the maximum limit of 3 nickname changes for this account.');
      return;
    }
    
    const remaining = 3 - nicknameEditCount;
    if (confirm(`To prevent abuse, Nickname can only be edited a maximum of 3 times in a lifetime.\n\nYou have ${remaining} ${remaining === 1 ? 'change' : 'changes'} remaining.\n\nDo you want to proceed?`)) {
      setIsEditingNickname(true);
    }
  };

  const handleUpdateNickname = async () => {
    if (!newNickname.trim() || newNickname === profile?.nickname) {
      setIsEditingNickname(false);
      return;
    }

    try {
      const res = await fetch('/api/user/update-nickname', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nickname: newNickname.trim() }),
      });

      const data = await res.json();
      if (data.ok) {
        setProfile(prev => prev ? { ...prev, nickname: newNickname.trim() } : null);
        setNicknameEditCount(prev => prev + 1);
        setUpdateMessage('Nickname updated successfully!');
        setTimeout(() => setUpdateMessage(null), 3000);
      } else {
        setError(data.error || 'Failed to update nickname');
      }
    } catch (err) {
      setError('Failed to update nickname');
    }
    setIsEditingNickname(false);
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim() || newEmail === profile?.email) {
      setIsEditingEmail(false);
      return;
    }

    try {
      const res = await fetch('/api/user/update-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim() }),
      });

      const data = await res.json();
      if (data.ok) {
        setProfile(prev => prev ? { ...prev, email: newEmail.trim() } : null);
        setUpdateMessage('Email updated successfully!');
        setTimeout(() => setUpdateMessage(null), 3000);
      } else {
        setError(data.error || 'Failed to update email');
      }
    } catch (err) {
      setError('Failed to update email');
    }
    setIsEditingEmail(false);
  };

  const handleStartEditEmail = () => {
    if (emailEditCount >= 3) {
      alert('You have reached the maximum limit of 3 email changes for this account.');
      return;
    }
    
    const remaining = 3 - emailEditCount;
    if (confirm(`To prevent abuse, Email can only be edited a maximum of 3 times in a lifetime.\n\nYou have ${remaining} ${remaining === 1 ? 'change' : 'changes'} remaining.\n\nDo you want to proceed?`)) {
      setIsEditingEmail(true);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle size={16} className="text-[#90ee90]" />;
      case 'pending':
        return <Clock size={16} className="text-[#ffd42a]" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-400" />;
      default:
        return <Clock size={16} className="text-[var(--text-muted)]" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published':
        return 'Published';
      case 'pending':
        return 'Pending Review';
      case 'rejected':
        return 'Not Approved';
      default:
        return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'news':
        return <Newspaper size={16} className="text-[#ffd42a]" />;
      case 'event':
        return <Calendar size={16} className="text-[#90ee90]" />;
      case 'classified':
      case 'ad':
        return <Tag size={16} className="text-[#ff69b4]" />;
      default:
        return <FileText size={16} className="text-[var(--text-muted)]" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Header />
        <main className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffd42a] mx-auto mb-4"></div>
            <p className="text-[var(--text-secondary)]">Loading profile...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      
      <main className="px-4 pt-8 pb-10">
        <div className="mx-auto w-full max-w-[800px] px-2">
          {/* Profile Header */}
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="rounded-full bg-[#ffd42a]/10 p-4">
                <User size={32} className="text-[#ffd42a]" />
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: 'var(--font-en)' }}>
                  My Profile
                </h1>
                <p className="text-[var(--text-muted)] text-sm">
                  Manage your account and view your submissions
                </p>
              </div>
            </div>

            {updateMessage && (
              <div className="mb-4 rounded-xl bg-[#90ee90]/10 border border-[#90ee90]/30 p-3 text-sm text-[#90ee90]">
                {updateMessage}
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Profile Details */}
            <div className="space-y-4">
              {/* Name */}
              <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Name</span>
                <span className="font-semibold text-white">{profile.name}</span>
              </div>

              {/* Nickname - Editable */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-[var(--border)] gap-2">
                <span className="text-[var(--text-secondary)]">Nickname</span>
                {isEditingNickname ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto sm:max-w-md">
                    <input
                      type="text"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      maxLength={20}
                      className="flex-1 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-white text-sm focus:border-[#ffd42a] focus:outline-none"
                      placeholder="Public display name"
                    />
                    <div className="flex items-center gap-2 shrink-0 pr-1">
                      <button
                        onClick={handleUpdateNickname}
                        className="text-sm text-[#90ee90] hover:text-[#b5f5b5] font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingNickname(false);
                          setNewNickname(profile.nickname || '');
                        }}
                        className="text-sm text-[var(--text-muted)] hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{profile.nickname || 'Not set'}</span>
                    <button
                      onClick={handleStartEditNickname}
                      className="text-[var(--text-muted)] hover:text-[#ffd42a]"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Email - Editable */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-[var(--border)] gap-2">
                <span className="text-[var(--text-secondary)]">Email</span>
                {isEditingEmail ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto sm:max-w-md">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="flex-1 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-white text-sm focus:border-[#ffd42a] focus:outline-none"
                      placeholder="Enter email"
                    />
                    <div className="flex items-center gap-2 shrink-0 pr-1">
                      <button
                        onClick={handleUpdateEmail}
                        className="text-sm text-[#90ee90] hover:text-[#b5f5b5] font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingEmail(false);
                          setNewEmail(profile.email || '');
                        }}
                        className="text-sm text-[var(--text-muted)] hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{profile.email || 'Not set'}</span>
                    <button
                      onClick={handleStartEditEmail}
                      className="text-[var(--text-muted)] hover:text-[#ffd42a]"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* WhatsApp */}
              <div className="flex items-center justify-between py-3">
                <span className="text-[var(--text-secondary)]">WhatsApp</span>
                <span className="font-semibold text-white">
                  {profile.whatsappNumber ? `+${profile.whatsappNumber.replace(/^\+/, '')}` : 'Not set'}
                </span>
              </div>
            </div>
          </div>

          {/* Published Posts Section */}
          {publishedPosts.length > 0 && (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl mb-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2" style={{ fontFamily: 'var(--font-en)' }}>
                <CheckCircle size={24} className="text-[#90ee90]" />
                My Published Posts
              </h2>
              <div className="space-y-4">
                {publishedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]"
                  >
                    <div className="flex-shrink-0">
                      <Newspaper size={16} className="text-[#ffd42a]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{post.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-[var(--text-muted)]">
                        <span>{new Date(post.published_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/posts/${post.id}`}
                        className="p-2 rounded-lg bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[#00cfff]"
                        title="View Post"
                      >
                        <ExternalLink size={16} />
                      </Link>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-2 rounded-lg bg-[var(--bg-card)] text-red-400 hover:text-red-300"
                        title="Delete Post"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submissions Section */}
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2" style={{ fontFamily: 'var(--font-en)' }}>
              <FileText size={24} className="text-[#00cfff]" />
              My Submissions
            </h2>

            {submissions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[var(--text-muted)] mb-4">You haven&apos;t submitted anything yet.</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/submit?type=news" className="rounded-lg bg-[#ffd42a]/10 border border-[#ffd42a]/30 px-4 py-2 text-sm font-semibold text-[#ffd42a] hover:bg-[#ffd42a]/20">
                    Submit News
                  </Link>
                  <Link href="/submit?type=event" className="rounded-lg bg-[#90ee90]/10 border border-[#90ee90]/30 px-4 py-2 text-sm font-semibold text-[#90ee90] hover:bg-[#90ee90]/20">
                    Submit Event
                  </Link>
                  <Link href="/submit?type=classified" className="rounded-lg bg-[#ff69b4]/10 border border-[#ff69b4]/30 px-4 py-2 text-sm font-semibold text-[#ff69b4] hover:bg-[#ff69b4]/20">
                    Submit Classified
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]"
                  >
                    <div className="flex-shrink-0">
                      {getTypeIcon(submission.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{submission.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-[var(--text-muted)]">
                        <span className="capitalize">{submission.type}</span>
                        <span>•</span>
                        <span>{new Date(submission.submitted_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card)]">
                        {getStatusIcon(submission.status)}
                        <span className={`text-sm font-medium ${
                          submission.status === 'published' ? 'text-[#90ee90]' :
                          submission.status === 'pending' ? 'text-[#ffd42a]' :
                          'text-red-400'
                        }`}>
                          {getStatusText(submission.status)}
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          if (!confirm('Are you sure you want to delete this submission?')) return;
                          try {
                            const res = await fetch(`/api/user/delete-submission/${submission.id}`, { method: 'DELETE' });
                            if (res.ok) {
                              setSubmissions(prev => prev.filter(s => s.id !== submission.id));
                              setUpdateMessage('Submission deleted');
                              setTimeout(() => setUpdateMessage(null), 3000);
                            }
                          } catch (err) {
                            setError('Failed to delete submission');
                          }
                        }}
                        className="p-2 rounded-lg bg-[var(--bg-card)] text-red-400 hover:bg-red-400 hover:text-white transition-all"
                        title="Delete Submission"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl mx-4">
            <h3 className="text-lg font-bold text-white mb-4 text-center" style={{ fontFamily: 'var(--font-en)' }}>
              Quick Actions
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/submit?type=news" className="rounded-lg bg-blue-900 px-6 py-3 text-sm font-bold text-white hover:bg-blue-800 transition">
                Submit News
              </Link>
              <Link href="/submit?type=event" className="rounded-lg bg-green-900 px-6 py-3 text-sm font-bold text-white hover:bg-green-800 transition">
                Submit Event
              </Link>
              <Link href="/submit?type=classified" className="rounded-lg bg-pink-900 px-6 py-3 text-sm font-bold text-white hover:bg-pink-800 transition">
                Submit Classified
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
