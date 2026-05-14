export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendWaMessage } from '@/lib/wa-api';

export async function POST(req: Request) {
  try {
    const { pollId, candidateId, userId } = await req.json();

    if (!pollId || !candidateId || !userId) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Get user details (to get phone number)
    const { data: user, error: userError } = await supabase
      .from('wa_users')
      .select('whatsapp_number')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    // 2. Get Poll details (for share message)
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('title, share_message')
      .eq('id', pollId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ ok: false, error: 'Poll not found' }, { status: 404 });
    }

    // 3. Record the vote (unique constraint will catch double voting)
    const { error: voteError } = await supabase
      .from('poll_votes')
      .insert({ poll_id: pollId, candidate_id: candidateId, user_id: userId });

    if (voteError) {
      if (voteError.code === '23505') {
        return NextResponse.json({ ok: false, error: 'You have already voted in this poll' }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: voteError.message }, { status: 500 });
    }

    // 4. Send WhatsApp messages in background
    const pollUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://freshnews.top'}/`;
    const shareText = `${poll.share_message}\n\n${pollUrl}`;
    const thanksText = `Thanks for casting your Vote. Please share the post below to your groups to Save democracy and get accurate People's will.`;

    console.log(`Poll Vote recorded. Sending messages to ${user.whatsapp_number}...`);

    // Use try-catch for WA so vote doesn't fail if WA fails
    try {
      // Sending Message 1
      await sendWaMessage(user.whatsapp_number, thanksText);
      // Sending Message 2
      await sendWaMessage(user.whatsapp_number, shareText);
      console.log('Poll messages sent successfully.');
    } catch (waErr: any) {
      console.error('Failed to send Poll WA messages:', waErr?.message || waErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
