import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '100');
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = createAdminClient();
    
    // 1. Fetch posts with range and total count
    const { data: posts, error: postsError, count } = await supabase
      .from('posts')
      .select('id, title, source_name, published_at, is_deleted, image_url', { count: 'exact' })
      .order('published_at', { ascending: false })
      .range(from, to);

    if (postsError) throw postsError;

    if (!posts || posts.length === 0) {
      return NextResponse.json({ posts: [], totalCount: count || 0 });
    }

    // 2. Fetch events ONLY for the posts on this page
    const postIds = posts.map(p => p.id);
    const { data: events, error: eventsError } = await supabase
      .from('post_events')
      .select('post_id, event_type, network')
      .in('post_id', postIds);

    if (eventsError) throw eventsError;

    // 3. Aggregate stats
    const statsMap: Record<number, any> = {};
    events?.forEach(event => {
      const pid = event.post_id;
      if (!statsMap[pid]) {
        statsMap[pid] = { views: 0, whatsapp: 0, facebook: 0, other: 0 };
      }

      if (event.event_type === 'click') {
        statsMap[pid].views++;
      } else if (event.event_type === 'share') {
        if (event.network === 'whatsapp') statsMap[pid].whatsapp++;
        else if (event.network === 'facebook') statsMap[pid].facebook++;
        else statsMap[pid].other++;
      }
    });

    // 4. Attach stats to posts
    const postsWithStats = posts.map(post => ({
      ...post,
      stats: statsMap[post.id] || { views: 0, whatsapp: 0, facebook: 0, other: 0 }
    }));

    return NextResponse.json({ 
      posts: postsWithStats,
      totalCount: count || 0 
    });
  } catch (error: any) {
    console.error('Admin fetch posts error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
