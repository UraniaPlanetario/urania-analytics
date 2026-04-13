import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wkunbifgxntzbufjkize.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__i87LpO2WUcJxXfscAshmw_klwhv9r4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
