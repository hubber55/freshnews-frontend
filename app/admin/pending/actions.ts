'use server'

import { createClient } from '@/app/utils/supabase/server'
import { revalidatePath } from 'next/cache'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://freshnews.top';

export async function getSubmission(submissionId: string) {
  const supabase = await createClient();
  
  const { data: submission, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (error) throw new Error('Failed to fetch submission');
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

  if (fetchError) throw new Error('Failed to fetch submission');
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

  // Insert into posts table
  const { data: newPost, error: insertError } = await supabase
    .from('posts')
    .insert({
      title,
      summary: content,
      content,
      slug: `${slug}-${Date.now()}`,
      image_url: submission.image_url,
      tags,
      source_name: 'User Submission',
      is_published: true,
      published_at: new Date().toISOString(),
      user_id: submission.user_id,
      submission_id: submissionId
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error creating post:', insertError);
    throw new Error('Failed to create post: ' + insertError.message);
  }

  // Update submission status
  await supabase
    .from('submissions')
    .update({ status: 'approved', post_id: newPost.id })
    .eq('id', submissionId);

  // Send WhatsApp notification to user
  if (submission.user_whatsapp) {
    try {
      await fetch(`${BASE_URL}/api/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: submission.user_whatsapp,
          message: `Great news! Your post "${title}" has been published on FreshNews.top. View it here: ${BASE_URL}/posts/${newPost.id}`
        })
      });
    } catch (err) {
      console.error('Failed to send WhatsApp notification:', err);
    }
  }

  revalidatePath('/admin/pending');
  revalidatePath('/');
  return { success: true, postId: newPost.id };
}

export async function rejectSubmission(submissionId: string) {
  const supabase = await createClient();
  
  const { data: submission } = await supabase
    .from('submissions')
    .select('user_whatsapp, title')
    .eq('id', submissionId)
    .single();

  await supabase
    .from('submissions')
    .update({ status: 'rejected' })
    .eq('id', submissionId);

  // Send rejection notification
  if (submission?.user_whatsapp) {
    try {
      await fetch(`${BASE_URL}/api/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: submission.user_whatsapp,
          message: `Your post "${submission.title}" was not approved for publication on FreshNews.top. Please ensure your content follows our guidelines.`
        })
      });
    } catch (err) {
      console.error('Failed to send rejection notification:', err);
    }
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
      content,
      tags,
      updated_at: new Date().toISOString()
    })
    .eq('id', submissionId);

  if (error) throw new Error('Failed to update submission');
  
  revalidatePath('/admin/pending');
  return { success: true };
}
