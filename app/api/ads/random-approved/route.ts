import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

// GET - Get a random approved user-submitted ad
export async function GET() {
  try {
    const adminSupabase = createAdminClient();
    
    // Get all approved ads (type='ad' or 'classified') that haven't expired
    const { data: ads, error } = await adminSupabase
      .from('submissions')
      .select('id, title, content, image_url, external_url, hyperlink_text, type, expires_at')
      .eq('status', 'approved')
      .in('type', ['ad', 'classified'])
      .or('expires_at.is.null,expires_at.gte.' + new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching approved ads:', error);
      return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 });
    }

    if (!ads || ads.length === 0) {
      return NextResponse.json({ ad: null }, { status: 404 });
    }

    // Random selection
    const randomIndex = Math.floor(Math.random() * ads.length);
    const selectedAd = ads[randomIndex];

    // Parse image URL if it's JSON (multiple images)
    let imageUrl = selectedAd.image_url;
    if (imageUrl && imageUrl.startsWith('[')) {
      try {
        const urls = JSON.parse(imageUrl);
        imageUrl = Array.isArray(urls) ? urls[0] : imageUrl;
      } catch {
        // Keep original if parsing fails
      }
    }

    return NextResponse.json({
      ad: {
        id: selectedAd.id,
        title: selectedAd.title,
        content: selectedAd.content,
        image_url: imageUrl,
        external_url: selectedAd.external_url,
        hyperlink_text: selectedAd.hyperlink_text,
        type: selectedAd.type,
      },
    }, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=30'
      }
    });
  } catch (error) {
    console.error('Error in random approved ad:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
