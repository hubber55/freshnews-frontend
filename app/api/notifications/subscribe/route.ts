import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { subscription } = await request.json();
    
    if (!subscription) {
      return NextResponse.json({ error: 'Subscription is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // Get user agent for analytics
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Store in push_subscriptions table
    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert([
        { 
          subscription: subscription,
          user_agent: userAgent
        }
      ]);

    if (error) {
      // If it's a duplicate (endpoint already exists), we can ignore or update
      if (error.code === '23505') {
        return NextResponse.json({ success: true, message: 'Already subscribed' });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
