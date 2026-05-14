export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = await import('@/lib/supabase');
    
    // Sign out from Supabase auth
    await supabase.supabase.auth.signOut();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 });
  }
}
