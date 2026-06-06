import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hasMinimumWords } from '@/lib/posts';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = parseInt(searchParams.get('from') || '0', 10);
    const to = parseInt(searchParams.get('to') || '9', 10);
    const activeTag = searchParams.get('tag')?.trim() || '';

    let query = supabase
      .from('posts')
      .select('id, title, summary, image_url, source_name, published_at, tags, is_deleted, is_locked, locked_position, locked_until')
      .eq('is_deleted', false)
      .order('published_at', { ascending: false })
      .range(from, to);

    if (activeTag) {
      query = query.or(`tags.cs.{"${activeTag}"},title.ilike.%${activeTag}%,tags.ov.{"${activeTag}"}`);
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    const filteredPosts = (posts || []).filter((post) => hasMinimumWords(post.summary, 10));

    // Relevance Sorting & strict filtering (matching homepage logic)
    let finalPosts = filteredPosts;
    if (activeTag && finalPosts.length > 0) {
      const queryLower = activeTag.toLowerCase();
      const scoredPosts = finalPosts.map(post => {
        const getScore = (p: any) => {
          let score = 0;
          const tags = (p.tags || []).map((t: string) => t.toLowerCase());
          const title = (p.title || '').toLowerCase();
          
          if (tags.includes(queryLower)) score += 100;
          if (title === queryLower) score += 80;
          else if (title.startsWith(queryLower)) score += 60;
          if (tags.some((t: string) => t.includes(queryLower))) score += 40;
          if (title.includes(queryLower)) score += 20;

          return score;
        };
        return { ...post, _relevance: getScore(post) };
      }).filter(post => post._relevance > 0);

      finalPosts = scoredPosts.sort((a, b) => {
        if (a._relevance !== b._relevance) return b._relevance - a._relevance;
        return new Date(b.published_at || '').getTime() - new Date(a.published_at || '').getTime();
      });
    }

    return NextResponse.json({ posts: finalPosts });
  } catch (error: any) {
    console.error('Error in GET /api/posts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
