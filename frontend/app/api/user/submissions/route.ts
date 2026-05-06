import { NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('id, title, type, status, created_at, expires_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedSubmissions = (submissions || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      type: s.type,
      status: s.status,
      submitted_at: s.created_at,
      expires_at: s.expires_at
    }));

    return NextResponse.json({ submissions: formattedSubmissions });
  } catch (error: any) {
    console.error('Fetch Submissions Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
