export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('tags')
      .not('tags', 'is', null);

    if (error) throw error;

    const allTags = new Set<string>();
    data?.forEach(post => {
      if (Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          if (tag) allTags.add(tag.trim().toLowerCase());
        });
      }
    });

    // Sort alphabetically and remove empty strings
    const sortedTags = Array.from(allTags).filter(Boolean).sort();

    return NextResponse.json(sortedTags);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
