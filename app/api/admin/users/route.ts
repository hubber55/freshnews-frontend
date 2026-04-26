import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    // Fetch users with their submissions
    const { data: users, error } = await supabase
      .from('wa_users')
      .select(`
        id,
        whatsapp_number,
        name,
        nickname,
        created_at,
        submissions (
          type,
          is_premium
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
