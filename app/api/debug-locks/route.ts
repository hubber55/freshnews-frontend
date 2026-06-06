import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 0; // Disable cache for this debug route

export async function GET() {
  const now = new Date().toISOString();
  
  const [allLocked, activeLocked] = await Promise.all([
    supabase
      .from('posts')
      .select('id, title, is_locked, locked_position, locked_until, is_deleted')
      .eq('is_locked', true),
    supabase
      .from('posts')
      .select('id, title, is_locked, locked_position, locked_until, is_deleted')
      .eq('is_locked', true)
      .eq('is_deleted', false)
      .gt('locked_until', now)
  ]);

  return NextResponse.json({
    now,
    allLocked: allLocked.data || [],
    allLockedError: allLocked.error,
    activeLocked: activeLocked.data || [],
    activeLockedError: activeLocked.error
  });
}
