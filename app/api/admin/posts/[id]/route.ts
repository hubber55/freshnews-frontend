import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const supabase = createAdminClient();

    // 1. Delete associated submission first if any
    await supabase
      .from('submissions')
      .delete()
      .eq('post_id', parseInt(id));

    // 2. Get post to find images
    const { data: post } = await supabase
      .from('posts')
      .select('image_url')
      .eq('id', parseInt(id))
      .single();

    if (post?.image_url) {
      try {
        const imageUrls: string[] = post.image_url.startsWith('[') 
          ? JSON.parse(post.image_url) 
          : [post.image_url];
        
        const filePaths = imageUrls.map(url => {
          const parts = url.split('/');
          return parts[parts.length - 1];
        });

        if (filePaths.length > 0) {
          await supabase.storage.from('submissions').remove(filePaths);
        }
      } catch (e) {
        console.error('Error deleting images from storage:', e);
      }
    }

    // 3. Delete the post
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', parseInt(id));

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
