import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, title, source_name, published_at, is_deleted, image_url')
      .order('published_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ posts: posts || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
