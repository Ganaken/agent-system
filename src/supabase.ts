import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_ANON_KEY ?? '';

if (!url || !key) {
  console.warn('[Supabase] SUPABASE_URL or SUPABASE_ANON_KEY not set — DB calls will fail');
}

export const supabase = createClient(url, key);
