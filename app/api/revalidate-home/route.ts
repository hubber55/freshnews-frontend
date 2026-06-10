import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    revalidatePath('/');
    return NextResponse.json({ revalidated: true, at: Date.now() });
  } catch (err) {
    return NextResponse.json({ revalidated: false, error: String(err) }, { status: 500 });
  }
}
