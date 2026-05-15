'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText, Tag, Settings, HelpCircle, 
  Clock, Users, Megaphone, Calendar, 
  ChevronRight, AlertCircle, TrendingUp,
  MessageCircle, MessageSquare, Bell, IndianRupee
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    pendingSubmissions: 0,
    endingPosts: 0,
    totalUsers: 0,
    pushSubscribers: 0,
    pendingPayments: 0,
    pendingComments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => console.error('Error fetching stats:', err));
  }, []);

  const adminModules = [
    {
      title: 'Pending Submissions',
      desc: 'Review and approve user news/ads.',
      href: '/admin/pending',
      icon: Clock,
      color: '#ffd42a',
      count: stats.pendingSubmissions,
      urgent: stats.pendingSubmissions > 0
    },
    {
      title: 'Manage Classifieds',
      desc: 'View and manage all active classified ads.',
      href: '/admin/classifieds',
      icon: Megaphone,
      color: '#00cfff',
      count: 0, 
      urgent: false
    },
    {
      title: 'Push Notifications',
      desc: 'Send browser alerts to subscribers.',
      href: '/admin/notifications',
      icon: Bell,
      color: '#ffd42a',
      count: stats.pushSubscribers,
      urgent: false
    },
    {
      title: 'Registered Users',
      desc: 'User activity and submission stats.',
      href: '/admin/users',
      icon: Users,
      color: '#ff90e8',
      count: stats.totalUsers,
      urgent: false
    },
    {
      title: 'Manage Events',
      desc: 'Manage upcoming events and gatherings.',
      href: '/admin/events',
      icon: Calendar,
      color: '#90ee90',
      count: 0,
      urgent: false
    },
    {
      title: 'All Posts',
      desc: 'Manage currently published content.',
      href: '/admin/posts',
      icon: FileText,
      color: '#ffffff',
      count: 0,
      urgent: false
    },
    {
      title: 'Content Hierarchy',
      desc: 'Categories and Sub-branches.',
      href: '/admin/categories',
      icon: Tag,
      color: '#90ee90',
      count: 0,
      urgent: false
    },
    {
      title: 'Manage FAQs',
      desc: 'Add or edit help documentation.',
      href: '/admin/faq',
      icon: HelpCircle,
      color: '#00cfff',
      count: 0,
      urgent: false
    },
    {
      title: 'System Settings',
      desc: 'Notification and business rules.',
      href: '/admin/settings',
      icon: Settings,
      color: 'var(--text-secondary)',
      count: 0,
      urgent: false
    },
    {
      title: 'Pending Payments',
      desc: 'Approve manual UPI payment requests.',
      href: '/admin/payments',
      icon: IndianRupee,
      color: '#90ee90',
      count: stats.pendingPayments,
      urgent: stats.pendingPayments > 0
    },
    {
      title: 'WhatsApp Marketing',
      desc: 'Upload and drip-feed outreach messages.',
      href: '/admin/marketing',
      icon: MessageCircle,
      color: '#25D366',
      count: 0,
      urgent: false
    },
    {
      title: 'Manage Polls',
      desc: 'Create interactive polls with dynamic candidates.',
      href: '/admin/polls',
      icon: TrendingUp,
      color: '#ffd42a',
      count: 0,
      urgent: false
    },
    {
      title: 'Manage Comments',
      desc: 'Moderate and approve user interactions.',
      href: '/admin/comments',
      icon: MessageSquare,
      color: '#ff90e8',
      count: stats.pendingComments,
      urgent: stats.pendingComments > 0
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Admin Dashboard</h1>
          <p className="text-[var(--text-muted)]">Welcome back. Here is what is happening across FreshNews.</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
          Ver: 1.4.0
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="p-6 rounded-2xl bg-[#ffd42a]/5 border border-[#ffd42a]/20 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-[#ffd42a]/70 uppercase mb-1">Pending Approval</p>
            <h3 className="text-3xl font-black text-white">{loading ? '...' : stats.pendingSubmissions}</h3>
          </div>
          <div className="p-3 rounded-xl bg-[#ffd42a]/10">
            <Clock className="text-[#ffd42a]" size={28} />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-red-500/70 uppercase mb-1">Ending Soon</p>
            <h3 className="text-3xl font-black text-white">{loading ? '...' : stats.endingPosts}</h3>
          </div>
          <div className="p-3 rounded-xl bg-red-500/10">
            <AlertCircle className="text-red-500" size={28} />
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2">
        <TrendingUp size={20} className="text-[#00cfff]" />
        <h2 className="text-xl font-bold text-white uppercase tracking-wider text-sm">Control Center</h2>
      </div>

      {/* MODULES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminModules.map((mod) => (
          <Link 
            key={mod.title} 
            href={mod.href}
            className={`group relative p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-white/30 transition-all active:scale-[0.98]`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${mod.color}15` }}>
                <mod.icon size={28} style={{ color: mod.color }} />
              </div>
              <ChevronRight className="text-[var(--text-muted)] group-hover:text-white transition-colors" size={20} />
            </div>
            
            <div className="relative">
              <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                {mod.title}
                {mod.urgent && (
                  <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </h3>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                {mod.desc}
              </p>
            </div>

            {mod.count > 0 && (
              <div className="absolute top-6 right-12 px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold text-white uppercase tracking-widest">
                {mod.count} Active
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
