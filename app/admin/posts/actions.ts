'use server'

import { createClient } from '@/app/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function updatePost(postId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const title = formData.get('title') as string
  const summary = formData.get('summary') as string
  const tagsString = formData.get('tags') as string
  
  const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean)

  const { error } = await supabase
    .from('posts')
    .update({
      title,
      summary,
      tags
    })
    .eq('id', postId)

  if (error) {
    console.error('Error updating post', error)
    return { error: error.message }
  }

  redirect('/admin/posts')
}

export async function deletePostWithRedirect(postId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  let redirectTo: string | null = formData.get('redirect_to') as string
  if (!redirectTo || redirectTo.trim() === '') {
    redirectTo = null
  } else {
    // Basic validation, ensure it's a relative path starting with /posts/ or just a valid slug
    if (!redirectTo.startsWith('/') && !redirectTo.startsWith('http')) {
       // Assuming they provided an ID
       redirectTo = `/posts/${redirectTo.trim()}`
    }
  }

  const { error } = await supabase
    .from('posts')
    .update({
      is_deleted: true,
      redirect_to: redirectTo
    })
    .eq('id', postId)

  if (error) {
    console.error('Error deleting post', error)
    return { error: error.message }
  }

  redirect('/admin/posts')
}
