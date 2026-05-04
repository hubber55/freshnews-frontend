import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const postId = parseInt(id);
  
  // Verify the post belongs to the user and get image URLs
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('id, image_url')
    .eq('id', postId)
    .eq('user_id', user.id)
    .single();
  
  if (fetchError || !post) {
    return NextResponse.json({ error: 'Post not found or not authorized' }, { status: 404 });
  }

  // Delete images from storage if they exist
  if (post.image_url) {
    try {
      const imageUrls: string[] = post.image_url.startsWith('[') 
        ? JSON.parse(post.image_url) 
        : [post.image_url];
      
      const filePaths = imageUrls.map(url => {
        // Extract filename from public URL
        const parts = url.split('/');
        return parts[parts.length - 1];
      });

      if (filePaths.length > 0) {
        await supabase.storage.from('submissions').remove(filePaths);
      }
    } catch (e) {
      console.error('Error deleting images from storage:', e);
      // Continue with post deletion even if image deletion fails
    }
  }
  
  // Delete the post record (hard delete)
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
