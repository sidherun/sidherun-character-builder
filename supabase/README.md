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
- The `characters` table has **no grants** to `anon` and no token-plane RLS
  policies, so a guest cannot read or write it directly.
- Every guest access is a `SECURITY DEFINER` RPC that requires a 256-bit secret:
  a per-character **token** (in the share/play link) or the per-GM **key**.
- Losing the GM key loses multi-character management (per-character tokens still
  work); recovery is via the JSON roster backup, which carries the key (M5).

## 5. Multi-user accounts & roles (epic #109, optional)

Adds an **authenticated** plane on top of the guest one. Apply this only if you
want player/GM/admin accounts with cloud-as-source-of-truth.

1. **Enable email auth.** Supabase → Authentication → Providers → **Email**:
   turn on "Email" and (for passwordless) keep **magic link** enabled. Set the
   Site URL / redirect URLs to your app origin (e.g.
   `https://character-builder.sidherun.com`).
2. **Apply the migration.** Paste `migrations/0002_auth_roles.sql` into the SQL
   Editor and run it (after `0001`). It adds the `profiles` table + signup
   trigger, `owner_user_id`/`assigned_player_id` on `characters`, the role
   helpers, and **RLS policies for the `authenticated` role only** — the guest
   `anon` plane and the seven RPCs are untouched.
3. **Wire the flag.** Set `VITE_AUTH=on` (local `.env.local` and the GitHub
   Actions **Variables**). This implies cloud, so `VITE_CLOUD_SYNC` need not be set.
4. **Seed yourself + adopt existing characters.** Sign in once (this auto-creates
   your `profiles` row via the trigger), then run the one-time SQL at the bottom
   of `0002_auth_roles.sql` (commented): make your email `admin`, and set
   `owner_user_id` on the pre-existing token-plane rows to your account. Reassign
   each to its player from the GM Screen.
5. **Apply `migrations/0003_updated_at_trigger.sql`** (after `0002`): a
   `moddatetime` trigger that bumps `characters.updated_at` on every UPDATE.
   Without it, authed-plane table writes (unlike the guest RPCs) leave
   `updated_at` stale — wrong roster "Saved" dates and a newer-wins
   reconciliation that can prefer an older cached copy (#253). Verify: edit a
   character while signed in → its roster card's Saved date becomes today.

5. Apply `migrations/0004_function_permissions.sql`. This hardens the database
   function execution matrix after the role/RLS migration:
   - `_h`, `_mint_token`, `handle_new_user`, and `guard_role_change` cannot be
     called through the Data API;
   - role-policy helpers move to the unexposed `private` schema;
   - authenticated `patch_live_by_id` uses `SECURITY INVOKER`, so character RLS
     remains the access boundary;
   - new functions no longer inherit PostgreSQL's default public execution grant.

   Rerun the Supabase Security Advisor after applying it. The seven guest
   capability RPCs (`create_character`, `get_character`, `update_character_data`,
   `patch_live`, `list_characters`, `rotate_token`, `delete_character`) will still
   produce 0028/0029 warnings **by design**: anonymous and signed-in browsers both
   need them for token/GM-key links, and each function validates that capability
   internally. Do not revoke those grants unless guest links are being retired.
   `create_character` remains an abuse/rate-limit surface tracked under #200.
   Run `verify_function_permissions.sql` in the SQL Editor afterward; every
   reported boolean should be `true`.

### RLS smoke test (two planes)
- As **anon** from the app JS: `supabase.from('characters').select('*')` still
  returns 0 rows / permission denied, and `get_character('<token>')` still works
  (guest plane intact).
- As a signed-in **player**: `select` returns only their owned/assigned rows;
  updating someone else's row, self-promoting to `admin`, or reassigning all fail.
- As **gm/admin**: `select` returns all rows; update/assign succeed; only `admin`
  may change a role.
