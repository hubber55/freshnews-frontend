import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' });

    const { email } = await req.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Valid email is required' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current edit count
    const { data: userData, error: fetchError } = await supabase
      .from('wa_users')
      .select('email_edit_count, email')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Fetch user error:', fetchError);
      return NextResponse.json({ ok: false, error: 'Database error. Please contact admin to add email columns.' });
    }

    if (userData.email === email.trim()) {
      return NextResponse.json({ ok: true });
    }

    const currentCount = userData.email_edit_count || 0;

    if (currentCount >= 3) {
      return NextResponse.json({ 
        ok: false, 
        error: 'You have reached the maximum limit of 3 email changes.' 
      });
    }

    // Update email and increment count
    const { data: updateData, error: updateError } = await supabase
      .from('wa_users')
      .update({ 
        email: email.trim(),
        email_edit_count: currentCount + 1
      })
      .eq('id', user.id)
      .select();

    if (updateError) {
      console.error('Update Email DB Error:', updateError);
      throw updateError;
    }

    if (!updateData || updateData.length === 0) {
      console.error('Update Email: No rows updated for user id:', user.id);
      return NextResponse.json({ ok: false, error: 'User record not found or not updated.' });
    }

    console.log('Update Email Success:', { userId: user.id, newEmail: email.trim(), newCount: currentCount + 1 });

    return NextResponse.json({ ok: true, remaining: 2 - currentCount });
  } catch (error: any) {
    console.error('Update Email Catch Error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'An unexpected error occurred.' });
  }
}
