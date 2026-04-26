import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' });

    const { nickname } = await req.json();
    if (!nickname || nickname.trim().length === 0) {
      return NextResponse.json({ ok: false, error: 'Nickname is required' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current edit count
    const { data: userData, error: fetchError } = await supabase
      .from('wa_users')
      .select('nickname_edit_count, nickname')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      // If column doesn't exist, this might fail. We should handle missing columns gracefully.
      console.error('Fetch user error:', fetchError);
      return NextResponse.json({ ok: false, error: 'Database error. Please contact admin to add nickname columns.' });
    }

    if (userData.nickname === nickname.trim()) {
      return NextResponse.json({ ok: true });
    }

    const currentCount = userData.nickname_edit_count || 0;

    if (currentCount >= 3) {
      return NextResponse.json({ 
        ok: false, 
        error: 'You have reached the maximum limit of 3 nickname changes.' 
      });
    }

    // Update nickname and increment count
    const { data: updateData, error: updateError, count } = await supabase
      .from('wa_users')
      .update({ 
        nickname: nickname.trim(),
        nickname_edit_count: currentCount + 1
      })
      .eq('id', user.id)
      .select();

    if (updateError) {
      console.error('Update Nickname DB Error:', updateError);
      throw updateError;
    }

    if (!updateData || updateData.length === 0) {
      console.error('Update Nickname: No rows updated for user id:', user.id);
      return NextResponse.json({ ok: false, error: 'User record not found or not updated.' });
    }

    console.log('Update Nickname Success:', { userId: user.id, newNickname: nickname.trim(), newCount: currentCount + 1 });

    return NextResponse.json({ ok: true, remaining: 2 - currentCount });
  } catch (error: any) {
    console.error('Update Nickname Catch Error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'An unexpected error occurred.' });
  }
}
