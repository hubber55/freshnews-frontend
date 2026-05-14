export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = await createClient();

    // Verify ownership before delete
    const { data: submission } = await supabase
      .from('submissions')
      .select('user_id')
      .eq('id', parseInt(id))
      .single();

    if (!submission || submission.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 401 });
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
