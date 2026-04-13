import { createClient } from '@/app/utils/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'

// Opt out of caching for admin routes
export const dynamic = 'force-dynamic'

export default async function AdminPostsPage() {
  const supabase = await createClient()

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, source_name, published_at, is_deleted')
    .order('published_at', { ascending: false })

  if (error) {
    return <div className="text-red-500">Error fetching posts: {error.message}</div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Manage Posts</h1>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[#161b22]">
        <table className="w-full text-left text-sm text-[var(--text-primary)]">
          <thead className="border-b border-[var(--border)] bg-[#21262d] text-xs uppercase text-[var(--text-secondary)]">
            <tr>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts?.map((post) => (
              <tr key={post.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[#21262d]/50">
                <td className="px-6 py-4 font-medium text-white max-w-xs truncate" title={post.title}>
                  {post.title}
                </td>
                <td className="px-6 py-4">{post.source_name}</td>
                <td className="px-6 py-4 text-[var(--text-muted)]">
                  {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : 'N/A'}
                </td>
                <td className="px-6 py-4">
                  {post.is_deleted ? (
                    <span className="rounded bg-red-500/20 px-2 py-1 text-xs font-bold text-red-500">Deleted (Redirected)</span>
                  ) : (
                    <span className="rounded bg-green-500/20 px-2 py-1 text-xs font-bold text-[#00b894]">Active</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/admin/posts/${post.id}/edit`}
                    className="mr-3 font-semibold text-[#ffd42a] hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
