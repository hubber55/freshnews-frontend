import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const { category_id, name } = await req.json();
    if (!category_id || !name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('ad_subcategories').insert([{ category_id, name }]).select().single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('ad_subcategories').delete().eq('id', id);
    if (error) throw error;

    // Clean up dummy images for this subcategory
    const { data: settingsData } = await supabase.from('admin_settings').select('value').eq('key', 'classified_dummy_images').single();
    if (settingsData?.value) {
      try {
        const parsed = JSON.parse(settingsData.value);
        if (!Array.isArray(parsed) && parsed[id]) {
          delete parsed[id];
          await supabase.from('admin_settings').update({ value: JSON.stringify(parsed) }).eq('key', 'classified_dummy_images');
        }
      } catch (err) {
        console.error('Failed to parse dummy images during cleanup', err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
