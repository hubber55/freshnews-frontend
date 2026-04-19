import Link from 'next/link';
import { FileText, Tag, Settings, HelpCircle, Clock } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/pending" className="block p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[#ffd42a]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[#ffd42a]/10">
              <Clock size={24} className="text-[#ffd42a]" />
            </div>
            <h2 className="text-xl font-bold text-white">Pending Posts</h2>
          </div>
          <p className="text-[var(--text-muted)]">Review, edit and approve user submissions.</p>
        </Link>
        
        <Link href="/admin/posts" className="block p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[#90ee90]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[#90ee90]/10">
              <FileText size={24} className="text-[#90ee90]" />
            </div>
            <h2 className="text-xl font-bold text-white">All Posts</h2>
          </div>
          <p className="text-[var(--text-muted)]">View and manage all published posts.</p>
        </Link>
        
        <Link href="/admin/categories" className="block p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[#90ee90]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[#90ee90]/10">
              <Tag size={24} className="text-[#90ee90]" />
            </div>
            <h2 className="text-xl font-bold text-white">Manage Categories</h2>
          </div>
          <p className="text-[var(--text-muted)]">Add, edit, and delete submission categories.</p>
        </Link>
        
        <Link href="/admin/faq" className="block p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[#00cfff]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[#00cfff]/10">
              <HelpCircle size={24} className="text-[#00cfff]" />
            </div>
            <h2 className="text-xl font-bold text-white">Manage FAQs</h2>
          </div>
          <p className="text-[var(--text-muted)]">Add, edit, and delete FAQ entries.</p>
        </Link>
        
        <Link href="/admin/settings" className="block p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--text-secondary)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[var(--text-secondary)]/10">
              <Settings size={24} className="text-[var(--text-secondary)]" />
            </div>
            <h2 className="text-xl font-bold text-white">Settings</h2>
          </div>
          <p className="text-[var(--text-muted)]">Configure admin settings, like the notification number.</p>
        </Link>
      </div>
    </div>
  );
}
