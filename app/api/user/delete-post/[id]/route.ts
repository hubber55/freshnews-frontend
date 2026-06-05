import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const postId = parseInt(id);
  
  const supabaseAdmin = createAdminClient();

  // Verify the post belongs to the user
  const { data: post, error: fetchError } = await supabaseAdmin
    .from('posts')
    .select('id, title, user_id, submission_id')
    .eq('id', postId)
    .single();
  
  if (fetchError || !post || post.user_id !== user.id) {
    return NextResponse.json({ error: 'Post not found or not authorized' }, { status: 404 });
  }
  
  // Also clean up the submission row so user profile updates
  try {
    if (post.submission_id) {
      await supabaseAdmin
        .from('submissions')
        .delete()
        .eq('id', post.submission_id);
    } else {
      await supabaseAdmin
        .from('submissions')
        .delete()
        .eq('user_id', user.id)
        .eq('title', post.title);
    }
  } catch (err) {
    console.error('Error cleaning up submission during user post delete:', err);
  }

  // Hard delete the post permanently
  const { error: deleteError } = await supabaseAdmin
    .from('posts')
    .delete()
    .eq('id', postId);
  
  if (deleteError) {
    console.error('Error deleting post:', deleteError);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
  
  return NextResponse.json({ success: true });
}

