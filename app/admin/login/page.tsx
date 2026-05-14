'use client'
export const runtime = 'edge';

import { useState } from 'react'
import { login } from '../actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleLogin(formData: FormData) {
    setIsPending(true)
    setError(null)
    const result = await login(formData)
    if (result && result.error) {
      setError(result.error)
    }
    setIsPending(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-8 shadow-xl">
        <h1 className="mb-6 text-center text-2xl font-bold text-[#ffd42a]">
          FreshNews Admin
        </h1>
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-center text-sm font-medium text-red-500 border border-red-500/20">
            {error}
          </div>
        )}
        <form action={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">
              Admin Email
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:border-[#ffd42a] focus:outline-none focus:ring-1 focus:ring-[#ffd42a]"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:border-[#ffd42a] focus:outline-none focus:ring-1 focus:ring-[#ffd42a]"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-[#e91e63] px-4 py-3 font-bold text-white shadow-md transition-all hover:bg-[#c2185b] active:scale-95 disabled:opacity-50"
          >
            {isPending ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
