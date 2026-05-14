import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch users with their submissions
    console.log('Admin Users API: Fetching full user data from Supabase...');
    const { data: rawUsers, error } = await supabase
      .from('wa_users')
      .select('*, submissions(id, type, title, is_premium, created_at)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Admin Users API Error:', error);
      throw error;
    }

    console.log(`Admin Users API: Fetched ${rawUsers?.length || 0} users`);

    const users = (rawUsers || []).map((u) => ({
      ...u,
      username: u.username || u.name || 'Anonymous',
      email: u.email || '',
      is_blocked: !!u.is_blocked,
      submissions: u.submissions || [],
    }));

    return NextResponse.json({ users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

