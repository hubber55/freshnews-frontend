'use server'

import { createClient } from '@/app/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'
import { createAdminClient } from '@/lib/supabase-admin'

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

  // Purge cache for home and the post page
  revalidatePath('/')
  revalidatePath(`/posts/${postId}`)

  redirect('/admin/posts')
}

export async function deletePostWithRedirect(postId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()

  // Verify auth
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

  // Use service role key for delete to bypass RLS issues
  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
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

  // Purge cache
  revalidatePath('/')
  revalidatePath(`/posts/${postId}`)

  redirect('/admin/posts')
}

export async function createPost(prevState: any, formData: FormData) {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const title = (formData.get('title') as string).trim()
  const summary = (formData.get('summary') as string).trim()
  const tagsString = (formData.get('tags') as string || '').trim()
  const source_name = (formData.get('source_name') as string || '').trim()
  let image_url = (formData.get('image_url') as string || '').trim()
  const image_file = formData.get('image_file') as File | null

  const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean)

  if (!title) return { error: 'Title is required.' }
  if (!summary) return { error: 'Summary is required.' }

  // Check for duplicate title (case-insensitive and trimmed)
  const { data: existingPosts, error: fetchError } = await supabase
    .from('posts')
    .select('id')
    .ilike('title', title) // case-insensitive search
    .limit(1)

  if (fetchError) {
    console.error('Error checking for duplicate title', fetchError)
    return { error: 'Failed to check for duplicate title.' }
  }

  if (existingPosts && existingPosts.length > 0) {
    return { error: 'A post with this title already exists.' }
  }

  // Handle image upload
  if (image_file && image_file.size > 0) {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(image_file.type)) {
      return { error: 'Invalid image file type. Only JPEG, PNG, GIF, and WEBP are allowed.' }
    }

    // Validate file size (e.g., max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
    if (image_file.size > MAX_FILE_SIZE) {
      return { error: 'Image file size exceeds 5MB limit.' }
    }

    try {
      const adminSupabase = createAdminClient()
      const fileExt = image_file.name.split('.').pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `posts/${fileName}`

      const { data: uploadData, error: uploadError } = await adminSupabase.storage
        .from('submissions')
        .upload(filePath, image_file)

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        return { error: 'Failed to upload image to storage.' }
      }

      const { data: { publicUrl } } = adminSupabase.storage
        .from('submissions')
        .getPublicUrl(filePath)

      image_url = publicUrl
    } catch (uploadError) {
      console.error('Error uploading image', uploadError)
      return { error: 'Failed to upload image.' }
    }
  }

  const { error } = await supabase
    .from('posts')
    .insert({
      title,
      summary,
      tags,
      source_name: source_name || null,
      image_url: image_url || null,
      published_at: new Date().toISOString(),
      is_deleted: false,
    })

  if (error) {
    console.error('Error creating post', error)
    return { error: error.message }
  }

  // Purge home feed cache for the new post
  revalidatePath('/')

  redirect('/admin/posts')
}
