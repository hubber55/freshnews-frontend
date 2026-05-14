export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

async function requireAdminSession() {
  const sessionSupabase = await createClient();
  const { data: { user }, error } = await sessionSupabase.auth.getUser();

  if (error) {
    console.error('Admin auth lookup error:', error);
  }

  return user;
}

export async function GET() {
  try {
    const user = await requireAdminSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*');
    
    if (error) throw error;
    return NextResponse.json({ settings: data });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdminSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { key, value } = await req.json();
    if (!key) return NextResponse.json({ error: 'Key is required' }, { status: 400 });

    const { error } = await supabase
      .from('admin_settings')
      .upsert({ key, value }, { onConflict: 'key' });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
