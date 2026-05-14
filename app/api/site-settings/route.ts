import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'edge';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['header_inserts', 'bidvertiser_verification_code']);

    if (error) {
      throw error;
    }

    const response = NextResponse.json({ settings: data ?? [] });
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
