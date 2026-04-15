import { NextResponse } from 'next/server';
import { getCurrentUserName } from '@/lib/auth';

export async function GET() {
  try {
    const name = await getCurrentUserName();
    return NextResponse.json({ name });
  } catch {
    return NextResponse.json({ name: null });
  }
}