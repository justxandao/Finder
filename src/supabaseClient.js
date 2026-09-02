import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'SUBSTITUA_PELA_SUA_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'SUBSTITUA_PELA_SUA_CHAVE_ANON';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
