'use client'

import { useActionState } from 'react'
import { updatePost, deletePostPermanently } from '../../actions'

type Post = {
  id: string
  title: string
  summary: string
  tags: string[]
  is_deleted?: boolean
  redirect_to?: string | null
  source_name?: string | null
  image_url?: string | null
}

export default function EditPostForm({ post }: { post: Post }) {
  // We use useActionState to handle the potential error return from server actions
  const [updateState, updateAction, isUpdatePending] = useActionState(updatePost.bind(null, post.id), null)
  const [deleteState, deleteAction, isDeletePending] = useActionState(deletePostPermanently.bind(null, post.id), null)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      
      {/* EDIT FORM */}
      <div className="md:col-span-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6">
        {updateState?.error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
            {updateState.error}
          </div>
        )}
        
        <form action={updateAction} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Title</label>
            <input
              type="text"
              name="title"
              defaultValue={post.title}
              required
              className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:border-[#ffd42a] focus:outline-none focus:ring-1 focus:ring-[#ffd42a]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Summary / Content</label>
            <textarea
              name="summary"
              rows={12}
              defaultValue={post.summary}
              required
              className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:border-[#ffd42a] focus:outline-none focus:ring-1 focus:ring-[#ffd42a]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Tags (comma separated)</label>
            <input
              type="text"
              name="tags"
              defaultValue={post.tags?.join(', ')}
              className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:border-[#ffd42a] focus:outline-none focus:ring-1 focus:ring-[#ffd42a]"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatePending}
            className="mt-4 rounded-lg bg-[#00b894] px-6 py-2.5 font-bold text-white shadow-md hover:bg-[#00cec9] disabled:opacity-50"
          >
            {isUpdatePending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* DELETE FORM */}
      <div className="space-y-6">
        <div className="rounded-2xl bg-red-500/5 border border-red-500/20 p-6">
          <h2 className="mb-2 text-lg font-bold text-red-500">Delete Permanently</h2>
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            Warning: This will completely remove the post and its images from the database and storage. This action cannot be undone.
          </p>
          
          {deleteState?.error && (
            <div className="mb-4 rounded bg-red-500/10 p-2 text-xs text-red-500 border border-red-500/20">
              {deleteState.error}
            </div>
          )}

          <form action={deleteAction}>
            <button
              type="submit"
              disabled={isDeletePending}
              className="w-full rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeletePending ? 'Deleting...' : 'Confirm Permanent Delete'}
            </button>
          </form>
        </div>
        
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 text-sm text-[var(--text-secondary)]">
          <h3 className="mb-2 font-bold text-white">Post Info</h3>
          <p className="mb-1"><strong>Source:</strong> {post.source_name}</p>
          <p className="mb-1"><strong>Image:</strong> {post.image_url ? 'Yes' : 'No'}</p>
          <a href={`/posts/${post.id}`} target="_blank" className="mt-2 inline-block text-[#ffd42a] hover:underline">View Live Post ↗</a>
        </div>
      </div>

    </div>
  )
}
