import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = createAdminClient();

    // Verify ownership before delete
    const { data: submission } = await supabase
      .from('submissions')
      .select('id, user_id, title, status')
      .eq('id', parseInt(id))
      .single();

    if (!submission || submission.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 401 });
    }

    // If approved/published, also delete corresponding post from posts table
    if (submission.status === 'approved' || submission.status === 'published') {
      try {
        await supabase
          .from('posts')
          .delete()
          .eq('submission_id', submission.id);

        // Fallback cleanup by title & user_id
        await supabase
          .from('posts')
          .delete()
          .eq('title', submission.title)
          .eq('user_id', user.id);
      } catch (err) {
        console.error('Error deleting associated post during submission deletion:', err);
      }
    }

    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('id', parseInt(id));

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

