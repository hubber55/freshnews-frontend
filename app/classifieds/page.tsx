import { Suspense } from 'react';
import { connection } from 'next/server';
import Header from '../components/header';
import Footer from '../components/footer';
import { createAdminClient } from '@/lib/supabase-admin';
import ClassifiedsClient from './ClassifiedsClient';

export const revalidate = 120;

export default async function ClassifiedsPage() {
  await connection();

  const supabase = createAdminClient();
  
  // 1. Fetch approved classifieds
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      id,
      title,
      content,
      image_url,
      location,
      post_id,
      status,
      created_at,
      expires_at,
      wa_users (name),
      ad_categories (name),
      ad_subcategories (name)
    `)
    .eq('type', 'classified')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  // 2. Fetch tags for these classifieds (from the posts table)
  const postIds = (submissions ?? [])
    .map(s => s.post_id)
    .filter((id): id is number => id !== null);

  let tagsMap: Record<number, string[]> = {};
  if (postIds.length > 0) {
    const { data: posts } = await supabase
      .from('posts')
      .select('id, tags')
      .in('id', postIds);
    
    posts?.forEach(p => {
      tagsMap[p.id] = p.tags || [];
    });
  }

  const classifiedsWithTags = (submissions ?? []).map(s => ({
    ...s,
    tags: s.post_id ? tagsMap[s.post_id] || [] : []
  }));

  // 3. Fetch ALL unique tags used in ANY classified post for the filter pills
  const { data: allClassifiedPosts } = await supabase
    .from('posts')
    .select('tags')
    .overlaps('tags', ['Classifieds'])
    .limit(100);

  const uniqueTagsSet = new Set<string>();
  allClassifiedPosts?.forEach(p => {
    (p.tags || []).forEach((tag: string) => {
      if (tag.toLowerCase() !== 'classifieds') {
        uniqueTagsSet.add(tag);
      }
    });
  });

  // Convert to array and take top 100 for better autocomplete
  const allTags = Array.from(uniqueTagsSet).slice(0, 100);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      <Suspense fallback={<div className="p-10 text-center text-white">Loading Classifieds...</div>}>
        <ClassifiedsClient initialClassifieds={classifiedsWithTags as any} allTags={allTags} />
      </Suspense>
      <Footer />
    </div>
  );
}
