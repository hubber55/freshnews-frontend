'use server';

import { createAdminClient } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function createPoll(formData: FormData) {
  const supabase = createAdminClient();
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const shareMessage = formData.get('shareMessage') as string;
  const isActive = formData.get('isActive') === 'on';

  // 1. Insert Poll
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert({ title, description, share_message: shareMessage, is_active: isActive })
    .select('id')
    .single();

  if (pollError) throw new Error(pollError.message);

  // 2. Insert Candidates
  const candidateNames = formData.getAll('candidateName') as string[];
  const candidateSeeds = formData.getAll('candidateSeed') as string[];
  const candidatePhotos = formData.getAll('candidatePhoto') as string[];
  
  const candidateData = candidateNames.map((name, i) => ({
    poll_id: poll.id,
    name,
    photo_url: candidatePhotos[i] || null,
    seed_votes: parseInt(candidateSeeds[i] || '0', 10),
  }));

  const { error: candError } = await supabase.from('poll_candidates').insert(candidateData);
  if (candError) throw new Error(candError.message);

  revalidatePath('/admin/polls');
  revalidatePath('/');
  return { ok: true };
}

export async function togglePoll(id: number, active: boolean) {
  const supabase = createAdminClient();
  
  // If activating, deactivate others first (only one active poll at a time)
  if (active) {
    await supabase.from('polls').update({ is_active: false }).neq('id', id);
  }

  await supabase.from('polls').update({ is_active: active }).eq('id', id);
  revalidatePath('/admin/polls');
  revalidatePath('/');
}

export async function deletePoll(id: number) {
  const supabase = createAdminClient();
  await supabase.from('polls').delete().eq('id', id);
  revalidatePath('/admin/polls');
  revalidatePath('/');
}
