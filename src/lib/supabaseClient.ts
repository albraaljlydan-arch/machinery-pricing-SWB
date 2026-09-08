import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qtrbowdkeqbuefrfjrls.supabase.co';
const supabaseAnonKey = 'sb_publishable_xiMg4bEUz_93DkJFD6y5Jw_g47JHDHo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
