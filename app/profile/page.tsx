'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '../components/header';
import Footer from '../components/footer';
import { User, Edit, Clock, CheckCircle, XCircle, FileText, Calendar, Tag, Newspaper, Trash2, ExternalLink } from 'lucide-react';

type UserSubmission = {
  id: number;
  title: string;
  content?: string;
  description?: string;
  type: 'news' | 'event' | 'classified' | 'ad';
  status: 'pending' | 'published' | 'rejected' | 'approved';
  submitted_at: string;
  published_at?: string;
  clicks?: number;
  image_url?: string;
  external_url?: string;
  hyperlink_text?: string;
  location?: string;
  event_date?: string;
  category?: string;
};

type UserProfile = {
  name: string;
  username: string;
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
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [usernameEditCount, setUsernameEditCount] = useState(0);
  const [emailEditCount, setEmailEditCount] = useState(0);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  
  // Edit submission states
  const [editingSubmission, setEditingSubmission] = useState<UserSubmission | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    content: '',
    description: '',
    external_url: '',
    hyperlink_text: '',
    location: '',
    event_date: '',
    category: ''
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

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
        setNewUsername(data.username || '');
        setNewEmail(data.email || '');
        setUsernameEditCount(data.usernameEditCount || 0);
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
      .then(async (res) => {
        if (!res.ok) {
          console.error('Submissions API error:', res.status);
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Fetched submissions:', data.submissions?.length || 0);
        if (data.submissions) {
          setSubmissions(data.submissions);
        } else if (data.error) {
          console.error('Submissions error:', data.error);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch submissions:', err);
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
        throw new Error('Failed to delete post');
      }
    } catch (err) {
      setError('Failed to delete post');
    }
  }

  // Handle edit submission click
  const handleEditClick = (submission: UserSubmission) => {
    setEditingSubmission(submission);
    setEditFormData({
      title: submission.title || '',
      content: submission.content || submission.description || '',
      description: '', // deprecated
      external_url: submission.external_url || '',
      hyperlink_text: submission.hyperlink_text || '',
      location: submission.location || '',
      event_date: submission.event_date || '',
      category: submission.category || ''
    });
  };

  // Handle edit form submission
  const handleEditSubmit = async () => {
    if (!editingSubmission) return;
    
    setIsSubmittingEdit(true);
    try {
      const res = await fetch(`/api/user/edit-submission/${editingSubmission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFormData,
          status: 'pending' // Reset to pending on edit
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Update submissions list
        setSubmissions(prev => prev.map(s => 
          s.id === editingSubmission.id 
            ? { ...s, ...editFormData, status: 'pending' }
            : s
        ));
        setEditingSubmission(null);
        setUpdateMessage('Submission updated and sent for admin approval. You will receive a WhatsApp confirmation.');
        setTimeout(() => setUpdateMessage(null), 5000);
      } else {
        throw new Error('Failed to update submission');
      }
    } catch (err) {
      setError('Failed to update submission. Please try again.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleStartEditUsername = () => {
    if (usernameEditCount >= 3) {
      alert('You have reached the maximum limit of 3 username changes for this account.');
      return;
    }
    
    const remaining = 3 - usernameEditCount;
    if (confirm(`To prevent abuse, Username can only be edited a maximum of 3 times in a lifetime.\n\nYou have ${remaining} ${remaining === 1 ? 'change' : 'changes'} remaining.\n\nDo you want to proceed?`)) {
      setIsEditingUsername(true);
    }
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim() || newUsername === profile?.username) {
      setIsEditingUsername(false);
      return;
    }

    try {
      const res = await fetch('/api/user/update-username', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim() }),
      });

      const data = await res.json();
      if (data.ok) {
        setProfile(prev => prev ? { ...prev, username: newUsername.trim() } : null);
        setUsernameEditCount(prev => prev + 1);
        setUpdateMessage('Username updated successfully!');
        setTimeout(() => setUpdateMessage(null), 3000);
      } else {
        setError(data.error || 'Failed to update username');
      }
    } catch (err) {
      setError('Failed to update username');
    }
    setIsEditingUsername(false);
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
      case 'approved':
        return <CheckCircle size={16} className="text-[#90ee90]" />;
      case 'pending':
        return <Clock size={16} className="text-red-400" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-400" />;
      default:
        return <Clock size={16} className="text-[var(--text-muted)]" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published':
      case 'approved':
        return 'Approved';
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
        <div className="mx-auto mt-8 w-full max-w-[1100px] px-5 sm:px-6">
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
              {/* Username - Editable */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-[var(--border)] gap-2 relative">
                <span className="text-[var(--text-secondary)]">Username</span>
                {isEditingUsername ? (
                  <div className="flex flex-col gap-2 w-full sm:w-auto sm:max-w-md">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Apply formatting rules: First Cap, rest small, Cap after _
                          const formatted = val.split('_').map(part => 
                            part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ''
                          ).join('_');
                          setNewUsername(formatted);
                        }}
                        maxLength={15}
                        className={`flex-1 min-w-0 rounded-lg border bg-[var(--bg-primary)] px-3 py-1.5 text-white text-sm focus:outline-none transition-colors ${
                          newUsername && !/^[A-Za-z]{2}[A-Za-z0-9_]*$/.test(newUsername) 
                            ? 'border-red-500' 
                            : 'border-[var(--border)] focus:border-[#ffd42a]'
                        }`}
                        placeholder="e.g. Arjun_Varghese"
                      />
                      <div className="flex items-center gap-2 shrink-0 pr-1">
                        <button
                          onClick={handleUpdateUsername}
                          className="text-sm text-[#90ee90] hover:text-[#b5f5b5] font-bold disabled:opacity-50"
                          disabled={!/^[A-Za-z]{2}[A-Za-z0-9_]{0,13}$/.test(newUsername)}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingUsername(false);
                            setNewUsername(profile.username || '');
                          }}
                          className="text-sm text-[var(--text-muted)] hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    
                    {/* Validation Help Box */}
                    {newUsername && !/^[A-Za-z]{2}[A-Za-z0-9_]{0,13}$/.test(newUsername) && (
                      <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-[11px] text-red-400 animate-in fade-in slide-in-from-top-1">
                        <p className="font-bold mb-1">⚠️ Invalid Format</p>
                        <ul className="list-disc list-inside space-y-0.5 opacity-90">
                          <li>First 2 characters must be Alphabets</li>
                          <li>Maximum 15 characters total</li>
                          <li>Only letters, numbers and _ allowed</li>
                        </ul>
                        <p className="mt-2 text-white font-semibold">Sample: <span className="text-[#ffd42a]">Binu_Tvm7</span></p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{profile.username || 'Not set'}</span>
                    <button
                      onClick={handleStartEditUsername}
                      className="text-[var(--text-muted)] hover:text-[#ffd42a]"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Email - Editable */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-[var(--border)] gap-2">
                <span className="text-[var(--text-secondary)]">Email (Optional)</span>
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
                        <span className="text-[#ffd42a] font-medium">{new Date(post.published_at).toLocaleDateString()}</span>
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
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-en)' }}>
                <FileText size={24} className="text-[#00cfff]" />
                My Submissions
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Note: Editing will pause your listing until admin re-approves
              </p>
            </div>

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
                    className="flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] min-h-[100px]"
                  >
                    <div className="flex-shrink-0">
                      {getTypeIcon(submission.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-lg leading-tight mb-1">{submission.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
                        <span className="capitalize font-medium text-white/70">{submission.type}</span>
                        <span>•</span>
                        <span className="text-[#ffd42a] font-medium">{new Date(submission.submitted_at).toLocaleDateString()}</span>
                        {submission.clicks !== undefined && submission.clicks > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-[#00cfff] font-semibold">{submission.clicks} views</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card)]">
                        {getStatusIcon(submission.status)}
                        <span className={`text-sm font-medium ${
                          submission.status === 'published' || submission.status === 'approved' ? 'text-[#90ee90]' :
                          'text-red-400'
                        }`}>
                          {getStatusText(submission.status)}
                        </span>
                      </div>
                      {/* Edit Button - always show but warn if approved */}
                      <button
                        onClick={() => {
                          if (submission.status === 'approved' || submission.status === 'published') {
                            if (!confirm('⚠️ Warning: Editing your listing will remove it from public view until admin re-approves it.\n\nAre you sure you want to proceed?')) return;
                          }
                          handleEditClick(submission);
                        }}
                        className="p-2 rounded-lg bg-[var(--bg-card)] text-[#00cfff] hover:bg-[#00cfff] hover:text-white transition-all"
                        title="Edit Submission"
                      >
                        <Edit size={16} />
                      </button>
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

          {/* Edit Submission Modal */}
          {editingSubmission && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Edit Submission</h3>
                  <button
                    onClick={() => setEditingSubmission(null)}
                    className="p-2 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)]"
                  >
                    <XCircle size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Title</label>
                    <input
                      type="text"
                      value={editFormData.title}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2 text-white focus:border-[#00cfff] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Content / Description</label>
                    <textarea
                      value={editFormData.content}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, content: e.target.value }))}
                      rows={6}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2 text-white focus:border-[#00cfff] focus:outline-none"
                    />
                  </div>

                  {editingSubmission.type === 'classified' && (
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Location</label>
                      <input
                        type="text"
                        value={editFormData.location}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2 text-white focus:border-[#00cfff] focus:outline-none"
                      />
                    </div>
                  )}

                  {editingSubmission.type === 'event' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Event Date</label>
                        <input
                          type="date"
                          value={editFormData.event_date}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, event_date: e.target.value }))}
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2 text-white focus:border-[#00cfff] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Location</label>
                        <input
                          type="text"
                          value={editFormData.location}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2 text-white focus:border-[#00cfff] focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  {(editingSubmission.type === 'ad' || editingSubmission.type === 'classified') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">External URL</label>
                        <input
                          type="url"
                          value={editFormData.external_url}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, external_url: e.target.value }))}
                          placeholder="https://..."
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2 text-white focus:border-[#00cfff] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Button Text</label>
                        <input
                          type="text"
                          value={editFormData.hyperlink_text}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, hyperlink_text: e.target.value }))}
                          placeholder="e.g., Visit Us, Learn More"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2 text-white focus:border-[#00cfff] focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  <div className="pt-4 border-t border-[var(--border)]">
                    <p className="text-xs text-yellow-400 mb-4">
                      ⚠️ Your listing will be switched to pending mode after editing and will require admin re-approval.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleEditSubmit}
                        disabled={isSubmittingEdit}
                        className="flex-1 py-3 px-4 rounded-lg bg-[#00cfff] text-white font-semibold hover:bg-[#00b8e6] transition-all disabled:opacity-50"
                      >
                        {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setEditingSubmission(null)}
                        disabled={isSubmittingEdit}
                        className="py-3 px-4 rounded-lg border border-[var(--border)] text-white font-semibold hover:bg-[var(--border)] transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
