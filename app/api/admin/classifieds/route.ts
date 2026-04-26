import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    const { data: classifieds, error } = await supabase
      .from('submissions')
      .select(`
        *,
        wa_users (name, whatsapp_number),
        ad_categories (name),
        ad_subcategories (name)
      `)
      .eq('type', 'classified')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ classifieds });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
