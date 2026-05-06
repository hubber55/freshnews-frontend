
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  try {
    // Add columns to submissions table
    const { error: error1 } = await supabase.rpc('run_sql', {
      sql_query: 'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS price TEXT;'
    });

    const { error: error2 } = await supabase.rpc('run_sql', {
      sql_query: 'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS contact_phone TEXT;'
    });

    // If RPC is not enabled, we might need another way or just ask user.
    // Let's try to just insert a dummy record to see if it works now.
    
    return NextResponse.json({ 
      message: "Attempted to add columns. Please check Supabase dashboard if this fails.",
      error1,
      error2
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
