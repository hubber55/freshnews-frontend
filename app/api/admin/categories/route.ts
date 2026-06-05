import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: cats, error: catError } = await supabase.from('ad_categories').select('*').order('name');
    if (catError) throw catError;

    const { data: subcats, error: subcatError } = await supabase.from('ad_subcategories').select('*').order('name');
    if (subcatError) throw subcatError;

    return NextResponse.json({ categories: cats, subcategories: subcats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('ad_categories').insert([{ name }]).select().single();
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
    // Fetch subcategories for this category to clean up dummy images
    const { data: subcats } = await supabase.from('ad_subcategories').select('id').eq('category_id', id);

    const { error } = await supabase.from('ad_categories').delete().eq('id', id);
    if (error) throw error;

    if (subcats && subcats.length > 0) {
      // Clean up dummy images for these subcategories
      const { data: settingsData } = await supabase.from('admin_settings').select('value').eq('key', 'classified_dummy_images').single();
      if (settingsData?.value) {
        try {
          const parsed = JSON.parse(settingsData.value);
          if (!Array.isArray(parsed)) {
            let modified = false;
            for (const sub of subcats) {
              if (parsed[sub.id]) {
                delete parsed[sub.id];
                modified = true;
              }
            }
            if (modified) {
              await supabase.from('admin_settings').update({ value: JSON.stringify(parsed) }).eq('key', 'classified_dummy_images');
            }
          }
        } catch (err) {
          console.error('Failed to parse dummy images during cleanup', err);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
