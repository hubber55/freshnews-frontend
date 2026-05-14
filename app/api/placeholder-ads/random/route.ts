export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

// GET - Get a random active placeholder ad
export async function GET() {
  try {
    const adminSupabase = createAdminClient();
    
    // Get all active placeholder ads ordered by priority
    const { data: ads, error } = await adminSupabase
      .from('placeholder_ads')
      .select('id, name, image_url, title, cta_text, external_url, priority, impressions, clicks')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error fetching random placeholder ad:', error);
      return NextResponse.json({ error: 'Failed to fetch ad' }, { status: 500 });
    }

    if (!ads || ads.length === 0) {
      return NextResponse.json({ ad: null }, { status: 404 });
    }

    // Weighted random selection based on priority
    // Lower priority = higher chance of selection
    const totalWeight = ads.reduce((sum, ad) => sum + (101 - ad.priority), 0);
    let random = Math.random() * totalWeight;
    
    let selectedAd = ads[0];
    for (const ad of ads) {
      const weight = 101 - ad.priority;
      random -= weight;
      if (random <= 0) {
        selectedAd = ad;
        break;
      }
    }

    return NextResponse.json({ ad: selectedAd }, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=30'
      }
    });
  } catch (error) {
    console.error('Error in random placeholder ad:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
