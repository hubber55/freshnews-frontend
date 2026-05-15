import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';


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
    let dbUser: {
      name?: string | null;
      username?: string | null;
      nickname?: string | null;
      email?: string | null;
      whatsapp_number?: string | null;
      username_edit_count?: number | null;
      nickname_edit_count?: number | null;
      email_edit_count?: number | null;
    } | null = null;

    const newSchemaResult = await supabase
      .from('wa_users')
      .select('name, username, email, whatsapp_number, username_edit_count, email_edit_count')
      .eq('id', user.id)
      .single();

    if (newSchemaResult.error) {
      const legacyResult = await supabase
        .from('wa_users')
        .select('name, nickname, email, whatsapp_number, nickname_edit_count, email_edit_count')
        .eq('id', user.id)
        .single();

      if (legacyResult.error) {
        console.error('Error fetching user:', newSchemaResult.error, legacyResult.error);
      } else {
        dbUser = legacyResult.data;
      }
    } else {
      dbUser = newSchemaResult.data;
    }
    
    // Check if user is admin
    const { data: adminSettings } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'admin_whatsapp_number')
      .single();
    
    const isAdmin = adminSettings?.value && user.whatsapp_number === adminSettings.value;
    
    return NextResponse.json({ 
      id: user.id,
      name: dbUser?.name || 'User',
      username: dbUser?.username || dbUser?.nickname || dbUser?.name || '',
      email: dbUser?.email || '',
      whatsappNumber: dbUser?.whatsapp_number || user.whatsapp_number,
      usernameEditCount: dbUser?.username_edit_count ?? dbUser?.nickname_edit_count ?? 0,
      emailEditCount: dbUser?.email_edit_count || 0,
      isAdmin 
    });
  } catch (error) {
    console.error('Auth Me Error:', error);
    return NextResponse.json({ name: null, isAdmin: false });
  }
}
