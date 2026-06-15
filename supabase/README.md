# Supabase setup (cloud sync)

Cloud sync (epic #71) is **off by default**. These steps stand it up. Nothing
here affects the localStorage-only app until `VITE_CLOUD_SYNC=on` is set.

## 1. Create the project
1. Create a free project at https://supabase.com (any region near your players).
2. Project Settings → API: copy the **Project URL** and the **anon public** key.

## 2. Apply the schema
Paste `migrations/0001_init.sql` into the Supabase **SQL Editor** and run it
(or, with the Supabase CLI linked: `supabase db push`).

## 3. Wire the keys
- **Local dev:** copy `.env.example` → `.env.local` and fill in
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_CLOUD_SYNC=on`.
- **Production (GitHub Pages):** repo → Settings → Secrets and variables →
  Actions → **Variables**, add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  and `VITE_CLOUD_SYNC` (set to `on` only at cutover, milestone M5). The deploy
  workflow injects these into the build. The anon key is **public by design**.

## 4. Smoke test (paste into SQL Editor after step 2)
Verifies the RPC round-trip and that the table is sealed.

```sql
-- create → returns id + raw token
select * from public.create_character('GMKEY-test', 'Smoke Test', '{"hp":10}'::jsonb, '{"hpCurrent":10}'::jsonb);
-- copy the token from above into <T>, then:
select * from public.get_character('<T>');                                  -- 1 row
select * from public.patch_live('<T>', '{"hpCurrent":7}'::jsonb);            -- live.hpCurrent now 7, live_rev=1
select * from public.update_character_data('<T>', 'Smoke Test', '{"hp":10,"x":1}'::jsonb, -1); -- data_rev=1
select * from public.list_characters('GMKEY-test');                         -- 1 row, no token column
select * from public.get_character('wrong-token');                          -- 0 rows
```

To confirm the table is sealed, query it with the **anon key** from the app/JS
(not the SQL editor, which runs as a superuser):
`supabase.from('characters').select('*')` must return a permission error / no
rows — all real access goes through the RPCs above.

## Security model (why the anon key being public is fine)
- The `characters` table has **no grants** to `anon`/`authenticated` and no RLS
  policies, so it cannot be read or written directly.
- Every access is a `SECURITY DEFINER` RPC that requires a 256-bit secret:
  a per-character **token** (in the share/play link) or the per-GM **key**.
- Losing the GM key loses multi-character management (per-character tokens still
  work); recovery is via the JSON roster backup, which carries the key (M5).
