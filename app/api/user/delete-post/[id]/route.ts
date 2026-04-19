import { createClient } from '@/app/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  const postId = parseInt(params.id);
  
  // Verify the post belongs to the user
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('id')
    .eq('id', postId)
    .eq('user_id', user.id)
    .single();
  
  if (fetchError || !post) {
    return NextResponse.json({ error: 'Post not found or not authorized' }, { status: 404 });
  }
  
  // Delete the post
  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);
  
  if (deleteError) {
    console.error('Error deleting post:', deleteError);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
  
  return NextResponse.json({ success: true });
}
