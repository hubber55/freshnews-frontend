import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const approved = searchParams.get('approved');
    const supabase = createAdminClient();

    let query = supabase
      .from('comments')
      .select('id, content, created_at, post_id, is_approved, user_id, wa_users(name, username), posts(title)')
      .order('created_at', { ascending: false });

    if (approved === 'false') {
      query = query.eq('is_approved', false);
    } else if (approved === 'true') {
      query = query.eq('is_approved', true);
    }

    const { data, error } = await query.limit(100);

    if (error) throw error;

    return NextResponse.json({ comments: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, is_approved } = await req.json();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('comments')
      .update({ is_approved })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, comment: data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase.from('comments').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
