import { supabase } from '../supabase';
import { randomUUID } from 'crypto';

const MAX_MESSAGES = 15;
const EXPIRY_MS = 24 * 60 * 60 * 1000;

type Message = { role: 'user' | 'assistant'; content: string };

export async function loadHistory(phone: string): Promise<Message[]> {
  const { data } = await supabase
    .from('conversations')
    .select('messages, updated_at')
    .eq('phone', phone)
    .maybeSingle();

  if (!data) return [];

  const updatedAt = new Date(data.updated_at as string).getTime();
  if (Date.now() - updatedAt > EXPIRY_MS) return [];

  return (data.messages as Message[]) ?? [];
}

export async function saveHistory(phone: string, userMessage: string, assistantMessage: string): Promise<void> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id, messages, updated_at')
    .eq('phone', phone)
    .maybeSingle();

  const now = Date.now();
  let prior: Message[] = [];

  if (existing) {
    const updatedAt = new Date(existing.updated_at as string).getTime();
    if (now - updatedAt <= EXPIRY_MS) {
      prior = (existing.messages as Message[]) ?? [];
    }
  }

  prior.push({ role: 'user', content: userMessage });
  prior.push({ role: 'assistant', content: assistantMessage });

  let trimmed = prior.slice(-MAX_MESSAGES);
  while (trimmed.length > 0 && trimmed[0].role === 'assistant') trimmed = trimmed.slice(1);

  const nowIso = new Date(now).toISOString();

  if (existing) {
    await supabase.from('conversations')
      .update({ messages: trimmed, updated_at: nowIso })
      .eq('phone', phone);
  } else {
    await supabase.from('conversations')
      .insert({ id: randomUUID(), phone, messages: trimmed, updated_at: nowIso });
  }
}

export async function cleanExpiredConversations(): Promise<void> {
  const cutoff = new Date(Date.now() - EXPIRY_MS).toISOString();
  await supabase.from('conversations').delete().lt('updated_at', cutoff);
}
