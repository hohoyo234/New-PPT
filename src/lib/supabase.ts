// ── Shared Supabase client ───────────────────────────────────────────────────
// One client for the whole app (multiple GoTrueClient instances would warn and
// fight over the auth session). The anon key is public by design — security is
// enforced by each table's RLS policies. Sessions are persisted so a logged-in
// user stays signed in across reloads, which is what makes "云端同步" survive a
// cleared cache.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tgnngqjgaiunmamigvjp.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbm5ncWpnYWl1bm1hbWlndmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NDEyNzIsImV4cCI6MjA5MzQxNzI3Mn0.QnnftPXFRfv4GHYdW7_SItN9ZnjsgvsIKhgHXGn5wWU';

export const cloudEnabled = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'worship-ppt-auth',
  },
});
