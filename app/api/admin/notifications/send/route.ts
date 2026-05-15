import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import webpush from 'web-push';

export async function POST(request: Request) {
  try {
    const { title, body, url } = await request.json();

    // Configure VAPID keys inside the handler
    const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
    const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@freshnews.top';

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error('Push Notification Error: VAPID keys missing in env');
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
    }

    try {
      console.log('--- VAPID CONFIG DEBUG ---');
      console.log('Subject:', VAPID_SUBJECT);
      console.log('Public Key (first 10):', VAPID_PUBLIC_KEY.substring(0, 10) + '...');
      console.log('Private Key (first 5):', VAPID_PRIVATE_KEY.substring(0, 5) + '...');

      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    } catch (vapidErr: any) {
      console.error('VAPID Config Error:', vapidErr.message);
      return NextResponse.json({ error: 'Invalid VAPID key format' }, { status: 500 });
    }

    const supabase = createAdminClient();

    // Fetch all active subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No subscribers found' });
    }

    const payload = JSON.stringify({
      title: title || 'FreshNews Update',
      body: body || 'Check out the latest news!',
      url: url || '/',
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub: { id: number; subscription: any }) => {
        try {
          await webpush.sendNotification(sub.subscription, payload);
          return { success: true, id: sub.id };
        } catch (err: any) {
          console.error(`Push failed for sub ${sub.id}:`, {
            statusCode: err.statusCode,
            endpoint: sub.subscription.endpoint,
            message: err.message,
          });

          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }
          throw err;
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      stats: {
        total: subscriptions.length,
        successful,
        failed,
      },
    });
  } catch (error: any) {
    console.error('Send notification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
