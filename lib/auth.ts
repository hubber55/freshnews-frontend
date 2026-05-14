import { cookies } from 'next/headers';

interface UserPayload {
  sub: number;
  wa: string;
  iat: number;
}

export interface User {
  id: number;
  whatsapp_number: string;
  name?: string;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fn_user')?.value;
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as UserPayload;
    if (!payload.sub || !payload.wa) return null;

    // For now, return basic info from token. In future, could fetch full user from DB.
    return {
      id: payload.sub,
      whatsapp_number: payload.wa,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUsername(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  // Fetch username from wa_users table
  const { supabase } = await import('./supabase');
  const { data } = await supabase
    .from('wa_users')
    .select('username')
    .eq('id', user.id)
    .single();

  return data?.username || 'User';
}
