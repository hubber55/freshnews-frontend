export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, key);

  const { data, error } = await supabase
    .from('whatsapp_marketing')
    .select('id, phone_number, status, category')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ stats: { pending: 0, messaged: 0, replied: 0 }, numbers: [], templates: [] });

  const stats = {
    pending: data.filter(d => d.status === 'pending').length,
    messaged: data.filter(d => d.status === 'messaged').length,
    replied: data.filter(d => d.status === 'replied').length,
    invalid: data.filter(d => d.status === 'invalid').length,
  };

  const { data: templates } = await supabase.from('whatsapp_templates').select('*').order('created_at', { ascending: false });

  return NextResponse.json({ stats, numbers: data, templates: templates || [] });
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, key);

  try {
    const body = await req.json();
    const { action, numbers, category } = body;

    if (action === 'upload_numbers') {
      const rawNumbers = (numbers || '').split(/[\n,]+/);
      const cleanNumbers = rawNumbers
        .map((n: string) => n.replace(/[^\d]/g, ''))
        .filter((n: string) => n.length >= 10);
      
      const uniqueNumbers = Array.from(new Set(cleanNumbers));

      if (uniqueNumbers.length === 0) {
        return NextResponse.json({ ok: false, error: 'No valid numbers found.' });
      }

      // Prepare payload
      const payload = uniqueNumbers.map(num => ({
        phone_number: num,
        status: 'pending',
        category: category || 'general'
      }));

      // Ignore duplicates, only insert new ones
      const { error } = await supabase.from('whatsapp_marketing').upsert(payload, { onConflict: 'phone_number', ignoreDuplicates: true });
      if (error) throw error;
      
      return NextResponse.json({ ok: true, added: uniqueNumbers.length });
    }

    if (action === 'delete_replied') {
      const { error } = await supabase.from('whatsapp_marketing').delete().in('status', ['replied', 'messaged']);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'clear_all') {
      const { error } = await supabase.from('whatsapp_marketing').delete().gte('id', 0);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'add_template') {
      const { category, message_text } = body;
      if (!category || !message_text) throw new Error('Missing fields');
      const { error } = await supabase.from('whatsapp_templates').insert({ category, message_text });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'delete_template') {
      const { id } = body;
      const { error } = await supabase.from('whatsapp_templates').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'Error occurred' });
  }
}
