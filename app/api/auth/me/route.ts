import { NextResponse } from 'next/server';
import { getCurrentUserName, getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const name = await getCurrentUserName();
    const user = await getCurrentUser();
    
    // Check if user is admin (for now, check if whatsapp number matches admin settings)
    let isAdmin = false;
    if (user) {
      const { supabase } = await import('@/lib/supabase');
      const { data: adminSettings } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'admin_whatsapp_number')
        .single();
      
      if (adminSettings?.value && user.whatsapp_number === adminSettings.value) {
        isAdmin = true;
      }
    }
    
    return NextResponse.json({ name, isAdmin });
  } catch {
    return NextResponse.json({ name: null, isAdmin: false });
  }
}