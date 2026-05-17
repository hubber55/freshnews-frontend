import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      error: 'Supabase environment variables not configured on the server.',
      envKeysPresent: {
        NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_KEY: !!process.env.SUPABASE_KEY
      }
    }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Total posts count
    const { count: totalPosts, error: totalError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });

    // 2. Active posts count
    const { count: activePosts, error: activeError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);

    // 3. Deleted posts count
    const { count: deletedPosts, error: deletedError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', true);

    // 4. Earliest 5 posts in DB
    const { data: earliestPosts, error: earliestError } = await supabase
      .from('posts')
      .select('id, title, published_at, is_deleted')
      .order('published_at', { ascending: true })
      .limit(5);

    // 5. Latest 5 posts in DB
    const { data: latestPosts, error: latestError } = await supabase
      .from('posts')
      .select('id, title, published_at, is_deleted')
      .order('published_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      connection: {
        url: supabaseUrl,
        ok: !totalError
      },
      counts: {
        total: totalPosts,
        active: activePosts,
        deleted: deletedPosts,
        errors: {
          totalError: totalError?.message || null,
          activeError: activeError?.message || null,
          deletedError: deletedError?.message || null
        }
      },
      earliest: earliestPosts || [],
      latest: latestPosts || [],
      queryErrors: {
        earliestError: earliestError?.message || null,
        latestError: latestError?.message || null
      }
    });

  } catch (err: any) {
    return NextResponse.json({
      error: 'Unhandled diagnostic error',
      message: err.message
    }, { status: 500 });
  }
}
