import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET(req: Request) {
  // Optional: Add a simple secret key check to prevent unauthorized calls
  // const authHeader = req.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  try {
    const supabase = createAdminClient();
    
    // Find submissions expiring in 2 days
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const startOfDay = new Date(targetDate.setHours(0,0,0,0)).toISOString();
    const endOfDay = new Date(targetDate.setHours(23,59,59,999)).toISOString();

    const { data: expiringSubmissions, error } = await supabase
      .from('submissions')
      .select(`
        id,
        title,
        type,
        expires_at,
        wa_users (whatsapp_number, name)
      `)
      .eq('status', 'approved')
      .gte('expires_at', startOfDay)
      .lte('expires_at', endOfDay);

    if (error) throw error;

    let notificationsSent = 0;
    for (const sub of (expiringSubmissions || [])) {
      const user = Array.isArray(sub.wa_users) ? sub.wa_users[0] : sub.wa_users;
      if (user?.whatsapp_number) {
        const message = `Reminder: Your ${sub.type} "${sub.title}" will expire in 2 days (on ${new Date(sub.expires_at).toLocaleDateString()}). Renew now to keep it live!`;
        
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-whatsapp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: user.whatsapp_number, message })
        });
        notificationsSent++;
      }
    }

    return NextResponse.json({ success: true, notificationsSent });
  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
