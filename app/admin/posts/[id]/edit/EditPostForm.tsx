'use client'

import { useActionState } from 'react'
import { updatePost, deletePostWithRedirect } from '../../actions'

type Post = {
  id: string
  title: string
  summary: string
  tags: string[]
  is_deleted?: boolean
  redirect_to?: string | null
  source_name?: string | null
  image_url?: string | null
  is_locked?: boolean
  locked_position?: number | null
  locked_until?: string | null
}

export default function EditPostForm({ post }: { post: Post }) {
  // We use useActionState to handle the potential error return from server actions
  const [updateState, updateAction, isUpdatePending] = useActionState(updatePost.bind(null, post.id), null)
  const [deleteState, deleteAction, isDeletePending] = useActionState(deletePostWithRedirect.bind(null, post.id), null)

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Image URL</label>
              <input
                type="text"
                name="image_url"
                defaultValue={post.image_url || ''}
                className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:border-[#ffd42a] focus:outline-none focus:ring-1 focus:ring-[#ffd42a]"
              />
            </div>
            <label className="flex items-center gap-2 mt-7 text-sm text-[var(--text-secondary)]">
              <input type="checkbox" name="clear_image" className="accent-red-500" />
              Clear current image
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Image URL</label>
              <input
                type="text"
                name="image_url"
                defaultValue={post.image_url || ''}
                className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:border-[#ffd42a] focus:outline-none focus:ring-1 focus:ring-[#ffd42a]"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => { const el = document.querySelector('input[name=image_url]') as HTMLInputElement | null; if (el) el.value = ''; }}
                className="mb-0.5 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-white"
              >
                Clear Image
              </button>
            </div>
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

      {/* RIGHT COLUMN */}
      <div className="space-y-6">
        {/* LOCK SETTINGS FORM */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6">
          <h2 className="mb-4 text-lg font-bold text-[#ffd42a]">Lock Settings</h2>
          <form action={updateAction} className="space-y-4">
            {/* hidden inputs to carry over existing data */}
            <input type="hidden" name="title" value={post.title} />
            <input type="hidden" name="summary" value={post.summary} />
            <input type="hidden" name="tags" value={post.tags?.join(', ')} />
            <input type="hidden" name="image_url" value={post.image_url || ''} />

            <label className="flex items-center gap-2 text-sm font-semibold text-white">
              <input type="checkbox" name="is_locked" defaultChecked={post.is_locked} className="w-4 h-4 accent-[#ffd42a]" />
              Lock this News Item
            </label>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Position (e.g. 1, 2, 3)</label>
              <input
                type="number"
                name="locked_position"
                min="1"
                max="10"
                defaultValue={post.locked_position || ''}
                className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#ffd42a] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Locked Until</label>
              <input
                type="datetime-local"
                name="locked_until"
                defaultValue={post.locked_until ? new Date(new Date(post.locked_until).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#ffd42a] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isUpdatePending}
              className="w-full mt-2 rounded-lg bg-[#ffd42a] px-4 py-2 font-bold text-black hover:bg-[#ffdf66] disabled:opacity-50"
            >
              {isUpdatePending ? 'Saving...' : 'Update Lock Rules'}
            </button>
          </form>
        </div>

        {/* DELETE METADATA FORM */}
        <div className="rounded-2xl bg-red-500/5 border border-red-500/20 p-6">
          <h2 className="mb-2 text-lg font-bold text-red-500">Delete & Redirect</h2>
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            Deleting a post marks it as inactive. Provide a redirect URL or Post ID to preserve SEO.
          </p>
          
          {deleteState?.error && (
            <div className="mb-4 rounded bg-red-500/10 p-2 text-xs text-red-500 border border-red-500/20">
              {deleteState.error}
            </div>
          )}

          <form action={deleteAction} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">Redirect Target</label>
              <input
                type="text"
                name="redirect_to"
                placeholder="/posts/1234..."
                defaultValue={post.redirect_to || ''}
                className="w-full rounded bg-[var(--bg-primary)] border border-red-500/20 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-red-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isDeletePending}
              className="w-full rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeletePending ? 'Deleting...' : 'Confirm Delete'}
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
