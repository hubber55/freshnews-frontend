'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { 
  ChevronLeft, Users, Search, 
  MessageCircle, ArrowUpDown, 
  Newspaper, Calendar, Tag, Megaphone,
  Filter
} from 'lucide-react';

type UserData = {
  id: number;
  whatsapp_number: string;
  name: string;
  nickname: string;
  created_at: string;
  submissions: {
    type: string;
    is_premium: boolean;
  }[];
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<keyof UserData | 'news_count'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching users:', err);
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
  };

  const getCount = (user: UserData, type: string) => {
    return user.submissions.filter(s => s.type === type).length;
  };

  const filteredUsers = users.filter(user => {
    const s = search.toLowerCase();
    return (
      (user.name || '').toLowerCase().includes(s) ||
      (user.nickname || '').toLowerCase().includes(s) ||
      user.whatsapp_number.includes(s)
    );
  }).sort((a: any, b: any) => {
    let valA, valB;
    if (sortField === 'news_count') {
      valA = a.submissions.filter((s: any) => s.type === 'news').length;
      valB = b.submissions.filter((s: any) => s.type === 'news').length;
    } else {
      valA = a[sortField] || '';
      valB = b[sortField] || '';
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
      if (data.ok) alert('Message sent successfully!');
      else alert('Failed to send: ' + (data.error || 'Unknown error'));
    });
  };

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
            placeholder="Search Name, Nickname or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#161b22] border border-[var(--border)] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-[#ff90e8] focus:outline-none transition-all"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[#161b22] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs uppercase tracking-wider">
            <thead className="bg-[#21262d] text-[var(--text-secondary)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:text-white" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">Name / Nickname <ArrowUpDown size={12} /></div>
                </th>
                <th className="px-6 py-4">WhatsApp No.</th>
                <th className="px-6 py-4 cursor-pointer hover:text-white" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center gap-2">Joined <ArrowUpDown size={12} /></div>
                </th>
                <th className="px-6 py-4 text-center">Stats (N / E / A / C)</th>
                <th className="px-6 py-4">Payments</th>
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
                  <tr key={user.id} className="hover:bg-[#21262d]/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-sm lowercase">{user.name || 'Anonymous'}</div>
                      <div className="text-[10px] text-[#ff90e8] font-bold mt-0.5">@{user.nickname || 'none'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[var(--text-muted)]">
                      {user.whatsapp_number}
                    </td>
                    <td className="px-6 py-4 text-[var(--text-muted)]">
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
                    <td className="px-6 py-4">
                      <span className="text-[var(--text-muted)] italic">₹ 0.00</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleSendMessage(user.whatsapp_number)}
                        className="p-2 rounded-lg bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366] hover:text-white transition-all inline-flex items-center gap-2 font-bold"
                      >
                        <MessageCircle size={16} />
                        <span className="hidden group-hover:inline text-[10px] uppercase">Message</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-12 text-center text-[var(--text-muted)]">
              No users found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
