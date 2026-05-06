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

  const isClassified = post.tags?.some((t: string) => t.toLowerCase().includes('classified'));
  const backUrl = isClassified ? '/admin/classifieds' : '/admin/posts';

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Edit Article</h1>
        <Link href={backUrl} className="text-sm font-semibold text-[var(--text-secondary)] hover:text-white">
          ← {isClassified ? 'Back to Classifieds' : 'Back to Posts'}
        </Link>
      </div>

      <EditPostForm post={post} backUrl={backUrl} />
    </div>
  )
}
