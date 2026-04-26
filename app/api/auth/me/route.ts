import { NextResponse } from 'next/server';
import { getCurrentUserName, getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ name: null, isAdmin: false });
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch full user data from wa_users
    const { data: dbUser, error: userError } = await supabase
      .from('wa_users')
      .select('name, nickname, email, whatsapp_number, nickname_edit_count, email_edit_count')
      .eq('id', user.id)
      .single();
      
    if (userError) {
      console.error('Error fetching user:', userError);
    }
    
    // Check if user is admin
    const { data: adminSettings } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'admin_whatsapp_number')
      .single();
    
    const isAdmin = adminSettings?.value && user.whatsapp_number === adminSettings.value;
    
    return NextResponse.json({ 
      name: dbUser?.name || 'User',
      nickname: dbUser?.nickname || '',
      email: dbUser?.email || '',
      whatsappNumber: dbUser?.whatsapp_number || user.whatsapp_number,
      nicknameEditCount: dbUser?.nickname_edit_count || 0,
      emailEditCount: dbUser?.email_edit_count || 0,
      isAdmin 
    });
  } catch (error) {
    console.error('Auth Me Error:', error);
    return NextResponse.json({ name: null, isAdmin: false });
  }
}