# Supabase setup (cloud sync)

Cloud sync is **off by default**. The supported deployment uses authenticated
accounts for character creation while preserving existing token-bearing guest
links. Nothing here affects the localStorage-only app until `VITE_AUTH=on` is set.

## 1. Create the project
1. Create a free project at https://supabase.com (any region near your players).
2. Project Settings → API: copy the **Project URL** and the **anon public** key.

## 2. Apply the schema
Apply every file in `migrations/` in numeric order through the Supabase **SQL
Editor** (or, with the Supabase CLI linked: `supabase db push`). Migration 0006
requires signed-in creation, preserves existing guest-link RPCs, and adds the
payload constraints documented below.

## 3. Wire the keys
- **Local dev:** copy `.env.example` → `.env.local` and fill in
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_AUTH=on`.
- **Production (GitHub Pages):** repo → Settings → Secrets and variables →
  Actions → **Variables**, add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  and `VITE_AUTH=on`. The deploy workflow injects these into the build. The anon
  key is **public by design**.

## 4. Verify the security boundary

Run these SQL Editor scripts after the migrations:

1. `verify_function_permissions.sql`
2. `verify_character_update_authorization.sql`
3. `verify_anonymous_creation_controls.sql`

The last script proves that repeated anonymous and authenticated calls to
`create_character` are denied, authenticated direct INSERT still works under
RLS, existing guest tokens can read/update/patch, and malformed or oversized
payloads fail. Each matrix runs in a transaction and rolls back its fixtures.

From an **anon-key browser client**, a direct
`supabase.from('characters').select('*')` must still return a permission error or
no rows. `supabase.rpc('create_character', ...)` must return permission denied.

## Security model (why the anon key being public is fine)
- The `characters` table has **no grants** to `anon` and no token-plane RLS
  policies, so a guest cannot read or write it directly.
- Existing guest access uses six `SECURITY DEFINER` RPCs with a 256-bit secret:
  a per-character **token** (in the share/play link) or the legacy per-GM **key**.
- `create_character` exists for schema compatibility but migration 0006 revokes
  it from `PUBLIC`, `anon`, and `authenticated`. New rows are direct signed-in
  INSERTs authorized by RLS. The retired guest **Push to cloud** UI and client
  creation path cannot expose a control the database rejects.
- `characters.name` is limited to 200 Unicode characters. `data` and `live`
  must be JSON objects and are limited to 256 KiB and 64 KiB respectively,
  measured as UTF-8 bytes of normalized `jsonb::text`. These bounds apply to
  both authenticated writes and existing capability-token updates.
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
   `anon` plane and the original capability RPCs are initially untouched.
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

6. Apply `migrations/0004_function_permissions.sql`. This hardens the database
   function execution matrix after the role/RLS migration:
   - `_h`, `_mint_token`, `handle_new_user`, and `guard_role_change` cannot be
     called through the Data API;
   - role-policy helpers move to the unexposed `private` schema;
   - authenticated `patch_live_by_id` uses `SECURITY INVOKER`, so character RLS
     remains the access boundary;
   - new functions no longer inherit PostgreSQL's default public execution grant.

   Rerun the Supabase Security Advisor after applying it. The seven original guest
   capability RPCs (`create_character`, `get_character`, `update_character_data`,
   `patch_live`, `list_characters`, `rotate_token`, `delete_character`) will still
   produce 0028/0029 warnings at this migration stage. Migration 0006 removes
   `create_character` from the browser roles while retaining the other six for
   token/GM-key links.
   Run `verify_function_permissions.sql` in the SQL Editor afterward; every
   reported boolean should be `true`.

7. Apply `migrations/0005_character_update_authorization.sql`. This repairs the
   authenticated update boundary: owners and assigned players may update
   character content/live counters, only GM/admin users may reassign ownership,
   and non-GM direct writes cannot alter capability hashes or revision counters.
   Revisions for direct authenticated content writes are bumped by the database,
   preserving optimistic concurrency without trusting client-supplied metadata.
   The guest capability RPCs are otherwise unchanged at this stage. Run
   `verify_character_update_authorization.sql` in the
   SQL Editor afterward; it executes an anon/owner/assignee/GM/admin matrix inside
   a transaction and rolls all fixtures back.

8. Apply `migrations/0006_anonymous_creation_controls.sql`. It retires anonymous
   RPC creation and adds the object-shape/name/serialized-size constraints above.
   Production was preflighted before rollout: 14 rows, zero non-object payloads,
   maximum name 19 characters, maximum `data` 8,662 bytes, and maximum `live`
   161 bytes. Run both `verify_function_permissions.sql` and
   `verify_anonymous_creation_controls.sql` afterward.

### RLS smoke test (two planes)
- As **anon** from the app JS: `supabase.from('characters').select('*')` still
  returns 0 rows / permission denied, and `get_character('<token>')` still works
  (guest plane intact).
- As a signed-in **player**: `select` returns only their owned/assigned rows and
  content/live updates to either succeed; updating someone else's row,
  self-promoting to `admin`, or changing ownership/assignment/capability/revision
  fields fails.
- As **gm/admin**: `select` returns all rows; update/assign succeed; only `admin`
  may change a role.
