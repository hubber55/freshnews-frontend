export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createClient } from '@/app/utils/supabase/server';

// GET - List all placeholder ads
export async function GET() {
  try {
    // Verify admin session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    
    const { data, error } = await adminSupabase
      .from('placeholder_ads')
      .select('*')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching placeholder ads:', error);
      return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 });
    }

    return NextResponse.json({ ads: data || [] });
  } catch (error) {
    console.error('Error in placeholder ads GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new placeholder ad
export async function POST(request: Request) {
  try {
    // Verify admin session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, image_url, title, cta_text, external_url, priority, is_active } = body;

    // Validation
    if (!name || !image_url || !title) {
      return NextResponse.json({ error: 'Name, image URL, and title are required' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    
    const { data, error } = await adminSupabase
      .from('placeholder_ads')
      .insert({
        name,
        image_url,
        title,
        cta_text: cta_text || 'Learn More',
        external_url: external_url || null,
        priority: priority || 10,
        is_active: is_active !== false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating placeholder ad:', error);
      return NextResponse.json({ error: 'Failed to create ad' }, { status: 500 });
    }

    return NextResponse.json({ ad: data });
  } catch (error) {
    console.error('Error in placeholder ads POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
