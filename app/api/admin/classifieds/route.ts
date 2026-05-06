import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    const { data: classifieds, error } = await supabase
      .from('submissions')
      .select(`
        *,
        wa_users (name, whatsapp_number),
        ad_categories (name),
        ad_subcategories (name)
      `)
      .eq('type', 'classified')
      .neq('status', 'deleted')
      .neq('status', 'rejected')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch metrics for items with post_id
    const postIds = (classifieds || [])
      .map(c => c.post_id)
      .filter((id): id is number => id !== null);

    let metricsMap: Record<number, any> = {};

    if (postIds.length > 0) {
      const { data: events } = await supabase
        .from('post_events')
        .select('post_id, event_type, network')
        .in('post_id', postIds);

      events?.forEach((e: any) => {
        const pid = e.post_id;
        if (!metricsMap[pid]) {
          metricsMap[pid] = { clicks: 0, fb: 0, tg: 0, wa: 0, native: 0 };
        }
        if (e.event_type === 'click') {
          metricsMap[pid].clicks++;
        } else if (e.event_type === 'share') {
          if (e.network === 'facebook') metricsMap[pid].fb++;
          else if (e.network === 'telegram') metricsMap[pid].tg++;
          else if (e.network === 'whatsapp') metricsMap[pid].wa++;
          else if (e.network === 'native') metricsMap[pid].native++;
        }
      });
    }

    const classifiedsWithMetrics = classifieds?.map(c => ({
      ...c,
      metrics: c.post_id ? metricsMap[c.post_id] || { clicks: 0, fb: 0, tg: 0, wa: 0, native: 0 } : null
    }));

    return NextResponse.json({ classifieds: classifiedsWithMetrics });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
