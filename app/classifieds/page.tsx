export const runtime = 'edge';
import { createAdminClient } from '@/lib/supabase-admin';
import Header from '../components/header';
import Footer from '../components/footer';
import ClassifiedsClient from './ClassifiedsClient';

export const revalidate = 120;

export default async function ClassifiedsPage() {
  const supabase = createAdminClient();
  
  // 1. Fetch Classifieds with Price/Phone
  const { data: classifiedsData, error: classifiedsError } = await supabase
    .from('submissions')
    .select(`
      id,
      title,
      content,
      image_url,
      location,
      status,
      created_at,
      expires_at,
      tags,
      price,
      contact_phone,
      wa_users (name),
      ad_categories (name),
      ad_subcategories (name)
    `)
    .eq('type', 'classified')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(100);

  const classifieds = (classifiedsData || []) as any[];

  // 2. Extract all unique tags for the predictive search
  const tagSet = new Set<string>();
  classifieds.forEach(item => {
    if (Array.isArray(item.tags)) {
      item.tags.forEach((t: string) => tagSet.add(t));
    }
    if (item.location) {
      // Add district/town parts as tags for better search
      item.location.split(',').forEach((p: string) => {
        const trimmed = p.trim();
        if (trimmed) tagSet.add(trimmed);
      });
    }
  });

  // Also add some common categories as tags
  classifieds.forEach(item => {
    if (item.ad_categories?.name) tagSet.add(item.ad_categories.name);
    if (item.ad_subcategories?.name) tagSet.add(item.ad_subcategories.name);
  });

  const allTags = Array.from(tagSet).sort();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      <ClassifiedsClient 
        initialClassifieds={classifieds} 
        allTags={allTags} 
      />
      <Footer />
    </div>
  );
}
