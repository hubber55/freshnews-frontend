export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Fetch user's published posts
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, published_at')
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .order('published_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
  
  return NextResponse.json({ posts: posts || [] });
}
