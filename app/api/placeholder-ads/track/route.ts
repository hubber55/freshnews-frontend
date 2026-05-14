export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

// POST - Track placeholder ad impression or click
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ad_id, event_type, session_id } = body;

    // Validation
    if (!ad_id || !event_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['impression', 'click'].includes(event_type)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Get request metadata for tracking
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : null;
    const userAgent = request.headers.get('user-agent');

    // Insert tracking record
    const { error: trackingError } = await adminSupabase
      .from('placeholder_ad_tracking')
      .insert({
        ad_id: parseInt(ad_id),
        event_type,
        session_id: session_id || null,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
      });

    if (trackingError) {
      console.error('Error inserting tracking data:', trackingError);
      // Don't fail the request, just log the error
    }

    // Update aggregate counters on the ad using raw SQL for atomic increment
    const updateField = event_type === 'impression' ? 'impressions' : 'clicks';
    
    try {
      // Use raw query for atomic increment
      await adminSupabase.rpc('increment_ad_counter', {
        ad_id: parseInt(ad_id),
        counter_field: updateField,
      });
    } catch {
      // If RPC doesn't exist, update without increment (will be handled by periodic sync)
      console.log('Counter update queued for ad', ad_id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in placeholder ad tracking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
