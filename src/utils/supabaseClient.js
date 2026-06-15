import { createClient } from '@supabase/supabase-js'

// Cloud sync is OFF unless explicitly enabled AND configured. With the flag
// unset (the default, including on `main`), `supabase` is null and the whole
// cloud layer is inert — the app runs exactly as the localStorage-only build.
//
// The anon key is intentionally public: it ships in the static bundle. Security
// rests on the RLS-sealed `characters` table + per-character capability tokens
// + the GM key (see epic #71), never on hiding this key.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const cloudEnabled = Boolean(
  url && anonKey && import.meta.env.VITE_CLOUD_SYNC === 'on',
)

export const supabase = cloudEnabled
  ? createClient(url, anonKey, { realtime: { params: { eventsPerSecond: 5 } } })
  : null
