import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/posts" className="block p-6 rounded-lg bg-gray-800 hover:bg-gray-700">
          <h2 className="text-xl font-bold text-white mb-2">Manage Posts</h2>
          <p className="text-gray-400">View, edit, and approve submissions.</p>
        </Link>
        <Link href="/admin/categories" className="block p-6 rounded-lg bg-gray-800 hover:bg-gray-700">
          <h2 className="text-xl font-bold text-white mb-2">Manage Categories</h2>
          <p className="text-gray-400">Add, edit, and delete submission categories.</p>
        </Link>
        <Link href="/admin/settings" className="block p-6 rounded-lg bg-gray-800 hover:bg-gray-700">
          <h2 className="text-xl font-bold text-white mb-2">Settings</h2>
          <p className="text-gray-400">Configure admin settings, like the notification number.</p>
        </Link>
      </div>
    </div>
  );
}
