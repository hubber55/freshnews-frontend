export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await params;
    const body = await req.json();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('wa_users')
      .update(body)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, user: data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await params;
    const supabase = createAdminClient();

    // The wa_users table is expected to have ON DELETE CASCADE for submissions and comments
    // But we might also want to delete entries from wa_otps and whatsapp_marketing linked by phone number
    const { data: user } = await supabase
      .from('wa_users')
      .select('whatsapp_number')
      .eq('id', userId)
      .single();

    if (user) {
      // Delete everything associated with the user
      // First delete submissions and comments (if no cascade)
      await supabase.from('submissions').delete().eq('user_id', userId);
      await supabase.from('comments').delete().eq('user_id', userId);
      
      // Delete OTPs and Marketing entries linked by phone
      await supabase.from('wa_otps').delete().eq('whatsapp_number', user.whatsapp_number);
      await supabase.from('whatsapp_marketing').delete().eq('phone_number', user.whatsapp_number);
    }

    const { error } = await supabase
      .from('wa_users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
