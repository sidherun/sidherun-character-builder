import { createClient } from '@supabase/supabase-js'

// Cloud sync is OFF unless explicitly enabled AND configured. With the flags
// unset (the default, including on `main`), `supabase` is null and the whole
// cloud layer is inert — the app runs exactly as the localStorage-only build.
//
// The anon key is intentionally public: it ships in the static bundle. Security
// rests on the RLS-sealed `characters` table + per-character capability tokens
// + the GM key (guest plane, epic #71) and on per-user RLS policies for the
// authenticated plane (epic #109), never on hiding this key.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// A GM can update all 14 campaign characters from one screen, and each durable
// write sends a Realtime nudge. Five events/second was low enough to throttle a
// rapid combat round; 20 covers the whole table with modest headroom while
// remaining deliberately bounded.
export const REALTIME_EVENTS_PER_SECOND = 20

// VITE_AUTH=on turns on magic-link login + role gating (the authenticated
// plane). It implies cloud, so the legacy VITE_CLOUD_SYNC flag need not also be
// set. VITE_CLOUD_SYNC=on still works for guest-only deployments.
export const authEnabled = Boolean(
  url && anonKey && import.meta.env.VITE_AUTH === 'on',
)

export const cloudEnabled = Boolean(
  url && anonKey && (import.meta.env.VITE_CLOUD_SYNC === 'on' || authEnabled),
)

export const supabase = cloudEnabled
  ? createClient(url, anonKey, {
      auth: {
        // Persist + refresh the session across reloads, and consume the magic
        // link's tokens from the callback URL on load.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: { params: { eventsPerSecond: REALTIME_EVENTS_PER_SECOND } },
    })
  : null
