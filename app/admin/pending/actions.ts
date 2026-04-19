'use server'

import { createClient } from '@/app/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getSubmission(submissionId: string) {
  const supabase = await createClient();
  
  const { data: submission, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (error) throw new Error('Failed to fetch submission: ' + error.message);
  return submission;
}

export async function approveSubmission(submissionId: string, formData: FormData) {
  const supabase = await createClient();
  
  // Get submission data
  const { data: submission, error: fetchError } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (fetchError) throw new Error('Failed to fetch submission: ' + fetchError.message);
  if (!submission) throw new Error('Submission not found');

  const title = (formData.get('title') as string).trim();
  const content = (formData.get('content') as string).trim();
  const tagsString = (formData.get('tags') as string || '').trim();
  const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean);

  // Generate slug from title
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 100);

  // Insert into posts table - core columns only
  const { data: newPost, error: insertError } = await supabase
    .from('posts')
    .insert({
      title,
      content,
      slug: `${slug}-${Date.now()}`
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error creating post:', insertError);
    throw new Error('Failed to create post: ' + insertError.message);
  }

  // Update submission status (optional - don't fail if column doesn't exist)
  try {
    await supabase
      .from('submissions')
      .update({ status: 'approved' })
      .eq('id', submissionId);
  } catch (err) {
    console.error('Failed to update submission status (column might not exist):', err);
  }

  revalidatePath('/admin/pending');
  revalidatePath('/');
  return { success: true, postId: newPost.id };
}

export async function rejectSubmission(submissionId: string) {
  const supabase = await createClient();
  
  // Update submission status (optional - don't fail if column doesn't exist)
  try {
    await supabase
      .from('submissions')
      .update({ status: 'rejected' })
      .eq('id', submissionId);
  } catch (err) {
    console.error('Failed to update submission status (column might not exist):', err);
  }

  revalidatePath('/admin/pending');
  return { success: true };
}

export async function updateSubmission(submissionId: string, formData: FormData) {
  const supabase = await createClient();
  
  const title = (formData.get('title') as string).trim();
  const content = (formData.get('content') as string).trim();
  const tagsString = (formData.get('tags') as string || '').trim();
  const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean);

  const { error } = await supabase
    .from('submissions')
    .update({
      title,
      content
    })
    .eq('id', submissionId);

  if (error) throw new Error('Failed to update submission: ' + error.message);
  
  revalidatePath('/admin/pending');
  return { success: true };
}

export async function deleteSubmission(submissionId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('id', submissionId);

  if (error) throw new Error('Failed to delete submission: ' + error.message);
  
  revalidatePath('/admin/pending');
  return { success: true };
}
