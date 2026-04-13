import { ReactNode } from 'react'
import { logout } from './actions'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[var(--border)] bg-[#0d1117]/80 px-6 py-4 backdrop-blur-md">
        <Link href="/admin/posts" className="text-xl font-black text-[#ffd42a]">
          Admin Dashboard
        </Link>

        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-red-600"
          >
            Logout
          </button>
        </form>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        {children}
      </main>
    </div>
  )
}
