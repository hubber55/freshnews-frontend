export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    // Use same auth as profile page (fn_user cookie)
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('id, title, content, type, status, created_at, expires_at, image_url, external_url, hyperlink_text, location, price, contact_phone, tags')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedSubmissions = (submissions || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      content: s.content,
      type: s.type,
      status: s.status,
      submitted_at: s.created_at,
      expires_at: s.expires_at,
      image_url: s.image_url,
      external_url: s.external_url,
      hyperlink_text: s.hyperlink_text,
      location: s.location,
      price: s.price,
      contact_phone: s.contact_phone,
      tags: s.tags || []
    }));

    return NextResponse.json({ submissions: formattedSubmissions });
  } catch (error: any) {
    console.error('Fetch Submissions Error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ 
      error: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
