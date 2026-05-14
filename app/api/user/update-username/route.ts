export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' });

    const { username } = await req.json();
    const inputUsername = (username || '').trim();

    const usernameRegex = /^[A-Za-z]{2}[A-Za-z0-9_]{0,13}$/;
    if (!usernameRegex.test(inputUsername)) {
      return NextResponse.json({
        ok: false,
        error: 'Username must be max 15 chars, start with 2 letters, and only use letters, numbers, and underscores (_).',
      });
    }

    const normalizedUsername = inputUsername
      .split('_')
      .map((part: string) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ''))
      .join('_');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    type UserRow = {
      username?: string | null;
      username_edit_count?: number | null;
      nickname?: string | null;
      nickname_edit_count?: number | null;
    };

    let userData: UserRow | null = null;
    let schema: 'new' | 'legacy' | null = null;

    const newSchemaResult = await supabase
      .from('wa_users')
      .select('username_edit_count, username')
      .eq('id', user.id)
      .single();

    if (!newSchemaResult.error) {
      userData = newSchemaResult.data as UserRow;
      schema = 'new';
    } else {
      const legacyResult = await supabase
        .from('wa_users')
        .select('nickname_edit_count, nickname')
        .eq('id', user.id)
        .single();

      if (legacyResult.error) {
        console.error('Fetch user error:', newSchemaResult.error, legacyResult.error);
        return NextResponse.json({ ok: false, error: 'Database error. Please contact admin.' });
      }

      userData = legacyResult.data as UserRow;
      schema = 'legacy';
    }

    const nameColumn = schema === 'legacy' ? 'nickname' : 'username';
    const countColumn = schema === 'legacy' ? 'nickname_edit_count' : 'username_edit_count';
    const currentUsername = userData?.[nameColumn as keyof UserRow] || '';
    const currentCount = Number(userData?.[countColumn as keyof UserRow] || 0);

    const { data: existing } = await supabase
      .from('wa_users')
      .select('id')
      .eq(nameColumn, normalizedUsername)
      .neq('id', user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: false, error: 'This username is already taken' });
    }

    if (currentUsername === normalizedUsername) {
      return NextResponse.json({ ok: true });
    }

    if (currentCount >= 3) {
      return NextResponse.json({ ok: false, error: 'You have reached the maximum limit of 3 username changes.' });
    }

    const updatePayload = schema === 'legacy'
      ? { nickname: normalizedUsername, nickname_edit_count: currentCount + 1 }
      : { username: normalizedUsername, username_edit_count: currentCount + 1 };

    const { data: updateData, error: updateError } = await supabase
      .from('wa_users')
      .update(updatePayload)
      .eq('id', user.id)
      .select();

    if (updateError) {
      console.error('Update Username DB Error:', updateError);
      return NextResponse.json({ ok: false, error: 'Failed to update username' });
    }

    if (!updateData || updateData.length === 0) {
      return NextResponse.json({ ok: false, error: 'User record not found.' });
    }

    return NextResponse.json({ ok: true, remaining: 2 - currentCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    console.error('Update Username Catch Error:', error);
    return NextResponse.json({ ok: false, error: message });
  }
}

