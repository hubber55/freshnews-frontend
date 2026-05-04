import { createClient } from '@/app/utils/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

// Opt out of caching for admin routes
export const dynamic = 'force-dynamic'

export default async function AdminPostsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const { page: pageStr, search } = await searchParams;
  const page = parseInt(pageStr || '1');
  const pageSize = 100;
  const offset = (page - 1) * pageSize;

  const supabase = await createClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
  const supabaseAdmin = createSupabaseAdmin(supabaseUrl, serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')

  let query = supabase
    .from('posts')
    .select('id, title, source_name, published_at, is_deleted, image_url', { count: 'exact' });

  if (search) {
    const isId = !isNaN(Number(search));
    if (isId) {
      query = query.eq('id', Number(search));
    } else {
      query = query.ilike('title', `%${search}%`);
    }
  }

  const { data: posts, count, error } = await query
    .order('published_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    return <div className="text-red-500">Error fetching posts: {error.message}</div>
  }

  const totalPages = Math.ceil((count || 0) / pageSize);

  const postIds = (posts ?? []).map((p) => p.id)
  const metricsByPostId = new Map<number, { clicks: number; fb: number; x: number; telegram: number; whatsapp: number; native: number }>()
  for (const id of postIds) {
    metricsByPostId.set(id, { clicks: 0, fb: 0, x: 0, telegram: 0, whatsapp: 0, native: 0 })
  }

  if (postIds.length > 0) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: events } = await supabaseAdmin
      .from('post_events')
      .select('post_id, session_id, event_type, network, created_at')
      .in('post_id', postIds)
      .gte('created_at', since)

    const clickSessionsByPost = new Map<number, Set<string>>()

    for (const e of events ?? []) {
      const postId = Number((e as any).post_id)
      const sessionId = String((e as any).session_id ?? '')
      const eventType = String((e as any).event_type ?? '')
      const network = String((e as any).network ?? '')

      if (!metricsByPostId.has(postId)) continue

      if (eventType === 'click') {
        const m = metricsByPostId.get(postId)!
        m.clicks += 1
        continue
      }

      if (eventType === 'share') {
        const m = metricsByPostId.get(postId)!
        if (network === 'facebook') m.fb += 1
        else if (network === 'x') m.x += 1
        else if (network === 'telegram') m.telegram += 1
        else if (network === 'whatsapp') m.whatsapp += 1
        else if (network === 'native') m.native += 1
      }
    }

    // Removed session iteration since we use total clicks directly now
  }

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Manage Posts</h1>
        
        <div className="flex flex-1 max-w-md gap-2">
          <form className="flex w-full gap-2">
            <input 
              type="text" 
              name="search" 
              defaultValue={search || ''} 
              placeholder="Search by Title or ID..."
              className="flex-1 rounded-lg bg-[#161b22] border border-[var(--border)] px-4 py-2 text-sm text-white focus:border-[#ffd42a] focus:outline-none"
            />
            <button type="submit" className="rounded-lg bg-[var(--border)] px-4 py-2 text-sm font-bold text-white hover:bg-gray-700">
              Search
            </button>
          </form>
        </div>

        <Link
          href="/admin/posts/new"
          className="rounded-lg bg-[#e91e63] px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-[#c2185b] active:scale-95"
        >
          Create New Post
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[#161b22]">
        <table className="w-full text-left text-sm text-[var(--text-primary)]">
          <thead className="border-b border-[var(--border)] bg-[#21262d] text-xs uppercase text-[var(--text-secondary)]">
            <tr>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Clicks</th>
              <th className="px-6 py-4">Shares</th>
              <th className="px-6 py-4">Image</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts?.map((post) => {
              const m = metricsByPostId.get(post.id) ?? { clicks: 0, fb: 0, x: 0, telegram: 0, whatsapp: 0, native: 0 }
              return (
              <tr key={post.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[#21262d]/50">
                <td className="px-6 py-4 font-medium text-white max-w-xs truncate" title={post.title}>
                  {post.title}
                </td>
                <td className="px-6 py-4">{post.source_name}</td>
                <td className="px-6 py-4 text-[var(--text-muted)]">
                  {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : 'N/A'}
                </td>
                <td className="px-6 py-4 font-semibold">
                  <span className={m.clicks > 0 ? 'text-[#00cfff]' : 'text-white'}>{m.clicks}</span>
                </td>
                <td className="px-6 py-4 text-[12px]" style={{ fontFamily: 'var(--font-en)' }}>
                  <span className={m.fb > 0 ? 'text-[#00cfff] font-bold' : 'text-[var(--text-secondary)]'}>FB {m.fb}</span>
                  <span className="text-[var(--text-secondary)]"> · </span>
                  <span className={m.telegram > 0 ? 'text-[#ff0095] font-bold' : 'text-[var(--text-secondary)]'}>TG {m.telegram}</span>
                  <span className="text-[var(--text-secondary)]"> · </span>
                  <span className={m.whatsapp > 0 ? 'text-[#ffd42a] font-bold' : 'text-[var(--text-secondary)]'}>WA {m.whatsapp}</span>
                  <span className="text-[var(--text-secondary)]"> · </span>
                  <span className={m.native > 0 ? 'text-[#90ee90] font-bold' : 'text-[var(--text-secondary)]'}>Native {m.native}</span>
                </td>
                <td className="px-6 py-4">
                  {post.image_url ? (
                    <span className="rounded bg-green-500/20 px-2 py-1 text-xs font-bold text-[#00b894]">Yes</span>
                  ) : (
                    <span className="rounded bg-red-500/20 px-2 py-1 text-xs font-bold text-red-500">No</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="rounded bg-green-500/20 px-2 py-1 text-xs font-bold text-[#00b894]">Active</span>
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
              )
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/admin/posts?page=${page - 1}${search ? `&search=${search}` : ''}`}
              className="rounded-lg bg-[#161b22] border border-[var(--border)] px-4 py-2 text-sm font-medium text-white hover:bg-[#21262d]"
            >
              Previous
            </Link>
          )}
          
          <span className="text-sm text-[var(--text-muted)]">
            Page {page} of {totalPages}
          </span>

          {page < totalPages && (
            <Link
              href={`/admin/posts?page=${page + 1}${search ? `&search=${search}` : ''}`}
              className="rounded-lg bg-[#161b22] border border-[var(--border)] px-4 py-2 text-sm font-medium text-white hover:bg-[#21262d]"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
