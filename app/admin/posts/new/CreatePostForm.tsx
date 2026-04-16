'use client'

import { useActionState } from 'react'
import { createPost } from '../actions'

export default function CreatePostForm() {
  const [state, formAction, isPending] = useActionState(createPost, null)

  return (
    <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6">
      {state?.error && (
        <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
          {state.error}
        </div>
      )}

      
      <form action={formAction} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Title</label>
          <input
            type="text"
            name="title"
            required
            className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:border-[#ffd42a] focus:outline-none focus:ring-1 focus:ring-[#ffd42a]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Summary / Content</label>
          <textarea
            name="summary"
            rows={12}
            required
            className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:border-[#ffd42a] focus:outline-none focus:ring-1 focus:ring-[#ffd42a]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Tags (comma separated)</label>
          <input
            type="text"
            name="tags"
            className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:border-[#ffd42a] focus:outline-none focus:ring-1 focus:ring-[#ffd42a]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Source Name</label>
          <input
            type="text"
            name="source_name"
            className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:border-[#ffd42a] focus:outline-none focus:ring-1 focus:ring-[#ffd42a]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Image URL</label>
          <input
            type="text"
            name="image_url"
            className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:border-[#ffd42a] focus:outline-none focus:ring-1 focus:ring-[#ffd42a]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Upload Image</label>
          <input
            type="file"
            name="image_file"
            accept="image/*"
            className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:border-[#ffd42a] focus:outline-none focus:ring-1 focus:ring-[#ffd42a] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#ffd42a] file:text-[#1a1a1a] hover:file:bg-[#ffe066]"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-4 rounded-lg bg-[#00b894] px-6 py-2.5 font-bold text-white shadow-md hover:bg-[#00cec9] disabled:opacity-50"
        >
          {isPending ? 'Creating...' : 'Create Post'}
        </button>
      </form>
    </div>
  )
}
