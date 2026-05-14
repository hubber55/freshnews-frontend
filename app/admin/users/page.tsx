export const runtime = 'edge';
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { 
  ChevronLeft, Users, Search, 
  MessageCircle, ArrowUpDown, 
  Newspaper, Calendar, Tag, Megaphone,
  Edit2, Ban, Trash2, ChevronRight
} from 'lucide-react';

type UserData = {
  id: number;
  whatsapp_number: string;
  username: string;
  email?: string;
  is_blocked?: boolean;
  created_at: string;
  submissions: {
    id: number;
    title: string;
    type: string;
    is_premium: boolean;
    created_at: string;
  }[];
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<keyof UserData | 'news_count'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState({ username: '', email: '' });

  useEffect(() => {
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setUsers(data.users || []);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch users. Please check your connection.');
        setLoading(false);
      });
  }, []);

  const handleSort = (field: keyof UserData | 'news_count') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  }

  const getCount = (user: UserData, type: string) => {
    return (user.submissions || []).filter(s => s.type === type).length;
  }

  const filteredUsers = users.filter(user => {
    const s = search.toLowerCase();
    return (
      (user.username || '').toLowerCase().includes(s) ||
      (user.email || '').toLowerCase().includes(s) ||
      user.whatsapp_number.includes(s)
    );
  }).sort((a, b) => {
    let valA: string | number = '';
    let valB: string | number = '';
    if (sortField === 'news_count') {
      valA = (a.submissions || []).filter((s) => s.type === 'news').length;
      valB = (b.submissions || []).filter((s) => s.type === 'news').length;
    } else {
      valA = ((a as any)[sortField] || '') as string | number;
      valB = ((b as any)[sortField] || '') as string | number;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSendMessage = (number: string) => {
    const message = prompt('Enter message to send to ' + number + ':');
    if (!message) return;

    fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: number, message })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) alert('Message sent successfully!');
      else alert('Failed to send: ' + data.error);
    });
  }

  const handleToggleBlock = async (user: UserData) => {
    const action = user.is_blocked ? 'unblock' : 'block';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_blocked: !user.is_blocked })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_blocked: !u.is_blocked } : u));
      }
    } catch {
      alert('Failed to update user status');
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? ALL their ads, news, and comments will be permanently deleted.')) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      }
    } catch {
      alert('Failed to delete user');
    }
  }

  const handleEdit = (user: UserData) => {
    setEditingUser(user);
    setEditForm({ username: user.username || '', email: user.email || '' });
  }

  const saveEdit = async () => {
    if (!editForm.username.trim()) {
      alert('Username is required');
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${editingUser!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: editForm.username.trim(),
          email: editForm.email.trim() || null
        })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === editingUser!.id ? { ...u, username: editForm.username, email: editForm.email } : u));
        setEditingUser(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update user');
      }
    } catch {
      alert('Failed to update user');
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff90e8]"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors">
          <ChevronLeft size={20} />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#ff90e8]/10 p-3">
            <Users size={24} className="text-[#ff90e8]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Manage Users</h1>
            <p className="text-[var(--text-muted)] text-sm">Monitor activity and communicate with your audience.</p>
          </div>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
          <input
            type="text"
            placeholder="Search Username, Email or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#161b22] border border-[var(--border)] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-[#ff90e8] focus:outline-none transition-all"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
          Error: {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[#161b22] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs uppercase tracking-wider">
            <thead className="bg-[#21262d] text-[var(--text-secondary)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:text-white" onClick={() => handleSort('username')}>
                  <div className="flex items-center gap-2">Username / Email <ArrowUpDown size={12} /></div>
                </th>
                <th className="px-6 py-4">WhatsApp No.</th>
                <th className="px-6 py-4 cursor-pointer hover:text-white" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center gap-2">Joined <ArrowUpDown size={12} /></div>
                </th>
                <th className="px-6 py-4 text-center">Stats (N / E / A / C)</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredUsers.map((user) => {
                const news = getCount(user, 'news');
                const events = getCount(user, 'event');
                const ads = getCount(user, 'ad');
                const classifieds = getCount(user, 'classified');
                
                return (
                  <tr key={user.id} className={`hover:bg-[#21262d]/40 transition-colors group ${user.is_blocked ? 'opacity-60 bg-red-900/5' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-sm lowercase flex items-center gap-2">
                        {user.username || 'Anonymous'}
                        {user.is_blocked && <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded uppercase font-extrabold tracking-tighter">Blocked</span>}
                      </div>
                      <div className="text-[10px] text-[#ff90e8] font-bold mt-0.5">{user.email || 'no email'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[#00ffff] font-bold">
                      {user.whatsapp_number}
                    </td>
                    <td className="px-6 py-4 text-[#00ffff] font-bold">
                      {format(new Date(user.created_at), 'MMM d, yy')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="flex flex-col items-center">
                          <Newspaper size={14} className={news > 0 ? 'text-[#ffd42a]' : 'text-gray-700'} />
                          <span className="text-[10px] mt-1 font-bold">{news}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Calendar size={14} className={events > 0 ? 'text-[#90ee90]' : 'text-gray-700'} />
                          <span className="text-[10px] mt-1 font-bold">{events}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Tag size={14} className={ads > 0 ? 'text-[#ff69b4]' : 'text-gray-700'} />
                          <span className="text-[10px] mt-1 font-bold">{ads}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Megaphone size={14} className={classifieds > 0 ? 'text-[#00cfff]' : 'text-gray-700'} />
                          <span className="text-[10px] mt-1 font-bold">{classifieds}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSendMessage(user.whatsapp_number)}
                          className="p-2 rounded-lg bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366] hover:text-white transition-all"
                          title="Message"
                        >
                          <MessageCircle size={14} />
                        </button>
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleBlock(user)}
                          className={`p-2 rounded-lg transition-all ${user.is_blocked ? 'bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white'}`}
                          title={user.is_blocked ? 'Unblock' : 'Block User'}
                        >
                          <Ban size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                          title="Delete User"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredUsers.length === 0 && !loading && (
            <div className="p-12 text-center text-[var(--text-muted)]">
              No users found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[#161b22] p-8 shadow-2xl custom-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Edit User Profile</h2>
              <button onClick={() => setEditingUser(null)} className="text-[var(--text-muted)] hover:text-white transition-colors text-sm uppercase font-bold">Close</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Left Column: Basic Info */}
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <h3 className="text-sm font-bold text-[#ff90e8] uppercase mb-4 tracking-widest">Account Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 ml-1">Username</label>
                      <input
                        type="text"
                        value={editForm.username}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        className="w-full bg-[#0d1117] border border-[var(--border)] rounded-xl px-4 py-3 text-white focus:border-[#ff90e8] focus:outline-none transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 ml-1">Email Address</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full bg-[#0d1117] border border-[var(--border)] rounded-xl px-4 py-3 text-white focus:border-[#ff90e8] focus:outline-none transition-all font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#00ffff]/5 border border-[#00ffff]/20">
                  <h3 className="text-sm font-bold text-[#00ffff] uppercase mb-4 tracking-widest">Payments & Wallet</h3>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="text-3xl font-black text-white mb-1">₹ 0.00</div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest">No transaction history found</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={saveEdit}
                    className="flex-1 bg-[#ff90e8] text-black font-black py-4 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
                  >
                    Update User Data
                  </button>
                  <button
                    onClick={() => handleToggleBlock(editingUser)}
                    className={`flex-1 font-black py-4 rounded-2xl active:scale-[0.98] transition-all uppercase tracking-widest text-xs ${editingUser.is_blocked ? 'bg-orange-500 text-white' : 'bg-white/5 text-white hover:bg-orange-500 border border-white/10'}`}
                  >
                    {editingUser.is_blocked ? 'Unblock User' : 'Block Access'}
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteUser(editingUser.id);
                      setEditingUser(null);
                    }}
                    className="flex-1 bg-red-500/10 text-red-500 border border-red-500/30 font-black py-4 rounded-2xl hover:bg-red-500/20 active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
                  >
                    Delete User
                  </button>
                </div>
              </div>

              {/* Right Column: Submissions */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[#ffd42a] uppercase tracking-widest">User Submissions</h3>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] bg-white/5 px-2 py-0.5 rounded uppercase">{(editingUser.submissions || []).length} total</span>
                </div>
                <div className="flex-1 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex flex-col">
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                    {(editingUser.submissions || []).length > 0 ? (
                      <div className="space-y-2">
                        {editingUser.submissions.map((sub) => (
                          <div key={sub.id} className="p-3 rounded-xl bg-[#0d1117] border border-white/5 flex items-center justify-between group">
                            <div className="min-w-0 flex-1 pr-4">
                              <div className="text-xs font-bold text-white truncate">{sub.title}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[9px] uppercase font-bold px-1.5 rounded-sm ${sub.type === 'ad' ? 'bg-[#ff69b4] text-white' : sub.type === 'news' ? 'bg-[#ffd42a] text-black' : 'bg-[#00cfff] text-white'}`}>
                                  {sub.type}
                                </span>
                                {sub.is_premium && <span className="text-[9px] uppercase font-bold text-[#ffd42a] border border-[#ffd42a] px-1 rounded-sm">Premium</span>}
                                <span className="text-[9px] text-[var(--text-muted)] font-bold">{format(new Date(sub.created_at), 'MMM d, yy')}</span>
                              </div>
                            </div>
                            <Link 
                              href={sub.type === 'classified' ? `/classifieds/${sub.id}` : `/posts/${sub.id}`}
                              target="_blank"
                              className="p-1.5 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <ChevronRight size={14} />
                            </Link>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                        <Megaphone size={40} className="mb-4" />
                        <p className="text-xs font-bold uppercase tracking-widest">User has not posted anything yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


