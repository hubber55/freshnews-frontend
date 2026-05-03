import type { MetadataRoute } from 'next';
import { createAdminClient } from '../lib/supabase-admin';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://freshnews.top';
  const supabase = createAdminClient();

  // Fetch all active (non-deleted) post IDs and their published dates
  const { data: posts } = await supabase
    .from('posts')
    .select('id, published_at')
    .eq('is_deleted', false)
    .order('published_at', { ascending: false })
    .limit(5000);

  const postEntries: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
    url: `${siteUrl}/posts/${post.id}`,
    lastModified: post.published_at ? new Date(post.published_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 1,
    },
    {
      url: `${siteUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    ...postEntries,
  ];
}
