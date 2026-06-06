import { createClient } from '@/app/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EditPostForm from './EditPostForm'

export default async function EditPostPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const supabase = await createClient()

  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !post) {
    notFound()
  }

  // Fetch lock positions dynamically from admin settings (e.g. lock_rate_pos_2)
  const { data: lockSettings } = await supabase
    .from('admin_settings')
    .select('key')
    .like('key', 'lock_rate_pos_%')

  const parsedPositions = (lockSettings || [])
    .map((s) => {
      const match = s.key.match(/^lock_rate_pos_(\d+)$/)
      return match ? parseInt(match[1], 10) : null
    })
    .filter((pos): pos is number => pos !== null)
    .sort((a, b) => a - b)

  const lockPositions = parsedPositions.length > 0 ? parsedPositions : [2, 8, 16, 24]

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Edit Article</h1>
        <Link href="/admin/posts" className="text-sm font-semibold text-[var(--text-secondary)] hover:text-white">
          ← Back to Posts
        </Link>
      </div>

      {post.is_deleted && (
        <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm font-medium text-red-500">
          This post is currently marked as DELETED and redirects to: <strong>{post.redirect_to || 'Homepage'}</strong>
        </div>
      )}

      <EditPostForm post={post} lockPositions={lockPositions} />
    </div>
  )
}
