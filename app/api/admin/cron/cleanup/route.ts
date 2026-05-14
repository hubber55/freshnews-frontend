export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Basic auth check (can be expanded to a secret key for cron)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 1. Fetch Cleanup Settings
    const { data: settingsData } = await supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', [
        'news_auto_delete_days',
        'news_min_views',
        'news_min_shares',
        'user_post_final_delete_days'
      ]);

    const settings = Object.fromEntries(settingsData?.map(s => [s.key, s.value]) || []);
    
    const newsDays = parseInt(settings.news_auto_delete_days || '10');
    const minViews = parseInt(settings.news_min_views || '10');
    const minShares = parseInt(settings.news_min_shares || '5');
    const userDays = parseInt(settings.user_post_final_delete_days || '90');

    const now = new Date();
    const newsThreshold = new Date(now.getTime() - newsDays * 24 * 60 * 60 * 1000);
    const userThreshold = new Date(now.getTime() - userDays * 24 * 60 * 60 * 1000);

    const logs: string[] = [];

    // --- PART 1: SCRAPED NEWS CLEANUP ---
    // Identify posts NOT linked to any submission (scraped news) older than threshold
    // We'll also check their engagement
    
    // First, get IDs of posts linked to submissions to exclude them
    const { data: linkedSubmissions } = await supabase
      .from('submissions')
      .select('post_id')
      .not('post_id', 'is', null);
    
    const linkedPostIds = linkedSubmissions?.map(s => s.post_id).filter(Boolean) || [];

    // Find candidate news posts
    let newsQuery = supabase
      .from('posts')
      .select('id, title, image_url')
      .lt('published_at', newsThreshold.toISOString());
    
    if (linkedPostIds.length > 0) {
      newsQuery = newsQuery.not('id', 'in', `(${linkedPostIds.join(',')})`);
    }

    const { data: candidateNews } = await newsQuery;

    if (candidateNews && candidateNews.length > 0) {
      const candidateIds = candidateNews.map(p => p.id);
      
      // Get engagement for these candidates
      const { data: engagement } = await supabase
        .from('post_events')
        .select('post_id, event_type')
        .in('post_id', candidateIds);

      const stats = new Map<number, { views: number; shares: number }>();
      candidateIds.forEach(id => stats.set(id, { views: 0, shares: 0 }));

      engagement?.forEach(e => {
        const s = stats.get(e.post_id);
        if (s) {
          if (e.event_type === 'click') s.views++;
          else if (e.event_type === 'share') s.shares++;
        }
      });

      const idsToDelete: number[] = [];
      const imageUrlsToDelete: string[] = [];

      candidateNews.forEach(p => {
        const s = stats.get(p.id);
        if (s && s.views < minViews && s.shares < minShares) {
          idsToDelete.push(p.id);
          if (p.image_url) {
             if (p.image_url.startsWith('[')) {
               try { imageUrlsToDelete.push(...JSON.parse(p.image_url)); } catch {}
             } else {
               imageUrlsToDelete.push(p.image_url);
             }
          }
        }
      });

      if (idsToDelete.length > 0) {
        // Delete images from storage
        const filePaths = imageUrlsToDelete.map(url => {
          const parts = url.split('/');
          return parts[parts.length - 1];
        }).filter(Boolean);

        if (filePaths.length > 0) {
          await supabase.storage.from('submissions').remove(filePaths);
        }

        // Hard delete posts
        await supabase.from('posts').delete().in('id', idsToDelete);
        logs.push(`Deleted ${idsToDelete.length} low-engagement news posts.`);
      }
    }

    // --- PART 2: USER SUBMISSIONS FINAL CLEANUP ---
    // Hard delete submissions (and their linked posts) older than userDays
    const { data: oldSubmissions } = await supabase
      .from('submissions')
      .select('id, post_id, image_url')
      .lt('created_at', userThreshold.toISOString());

    if (oldSubmissions && oldSubmissions.length > 0) {
      const subIds = oldSubmissions.map(s => s.id);
      const linkedPostIds = oldSubmissions.map(s => s.post_id).filter(Boolean) as number[];
      const imageUrls: string[] = [];
      
      oldSubmissions.forEach(s => {
        if (s.image_url) {
          if (s.image_url.startsWith('[')) {
            try { imageUrls.push(...JSON.parse(s.image_url)); } catch {}
          } else {
            imageUrls.push(s.image_url);
          }
        }
      });

      // Delete images
      const filePaths = imageUrls.map(url => {
        const parts = url.split('/');
        return parts[parts.length - 1];
      }).filter(Boolean);

      if (filePaths.length > 0) {
        await supabase.storage.from('submissions').remove(filePaths);
      }

      // Delete posts first (due to FK)
      if (linkedPostIds.length > 0) {
        await supabase.from('posts').delete().in('id', linkedPostIds);
      }

      // Delete submissions
      await supabase.from('submissions').delete().in('id', subIds);
      logs.push(`Deleted ${subIds.length} old user submissions and their linked posts.`);
    }

    // --- PART 3: PURGE SOFT-DELETED OR REJECTED SUBMISSIONS ---
    // Submissions marked as 'deleted' or 'rejected' should be hard deleted after 7 days
    const purgeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { data: purgeable } = await supabase
      .from('submissions')
      .select('id, image_url')
      .in('status', ['deleted', 'rejected'])
      .lt('created_at', purgeThreshold.toISOString());

    if (purgeable && purgeable.length > 0) {
      const purgeIds = purgeable.map(s => s.id);
      const purgeImages: string[] = [];
      purgeable.forEach(s => {
        if (s.image_url) {
          if (s.image_url.startsWith('[')) {
            try { purgeImages.push(...JSON.parse(s.image_url)); } catch {}
          } else {
            purgeImages.push(s.image_url);
          }
        }
      });

      const purgeFilePaths = purgeImages.map(url => {
        const parts = url.split('/');
        return parts[parts.length - 1];
      }).filter(Boolean);

      if (purgeFilePaths.length > 0) {
        await supabase.storage.from('submissions').remove(purgeFilePaths);
      }

      await supabase.from('submissions').delete().in('id', purgeIds);
      logs.push(`Purged ${purgeIds.length} soft-deleted/rejected submissions.`);
    }

    return NextResponse.json({ ok: true, logs });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
