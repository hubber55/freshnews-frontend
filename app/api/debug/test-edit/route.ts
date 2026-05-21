import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: sub } = await supabase.from('submissions').select('*').limit(1).single();

  const updateData = {
    status: 'pending',
    updated_at: new Date().toISOString(),
    title: sub.title,
    content: sub.content,
    external_url: "",
    hyperlink_text: "",
    location: "Kerala",
    image_url: null,
    event_date: null,
    category: null
  };

  const { data: updatedSubmission, error: updateError } = await supabase
    .from('submissions')
    .update(updateData)
    .eq('id', sub.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError });
  }
  return NextResponse.json({ success: true, updatedSubmission });
}
