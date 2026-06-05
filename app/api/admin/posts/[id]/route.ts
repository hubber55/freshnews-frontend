import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected error';
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Fetch title first so we can clean up matching submissions
    const { data: post } = await supabase
      .from('posts')
      .select('title, user_id')
      .eq('id', parseInt(id))
      .single();

    // Clean up submission row if it exists (best-effort)
    if (post?.title) {
      await supabase
        .from('submissions')
        .delete()
        .eq('title', post.title)
        .catch(() => {});
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', parseInt(id));

    if (error) throw error;

    // Purge cache
    revalidatePath('/');
    revalidatePath(`/posts/${id}`);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

