-- Run in the Supabase SQL Editor after 0004_function_permissions.sql.
-- Every *_matches column should be true.

with expected(signature, anon_execute, authenticated_execute) as (
  values
    ('public._h(text)', false, false),
    ('public._mint_token()', false, false),
    ('public.handle_new_user()', false, false),
    ('public.guard_role_change()', false, false),
    ('public.patch_live_by_id(uuid,jsonb)', false, true),
    ('public.create_character(text,text,jsonb,jsonb)', true, true),
    ('public.get_character(text)', true, true),
    ('public.update_character_data(text,text,jsonb,bigint)', true, true),
    ('public.patch_live(text,jsonb)', true, true),
    ('public.list_characters(text)', true, true),
    ('public.rotate_token(text,uuid)', true, true),
    ('public.delete_character(text,uuid)', true, true)
)
select
  signature,
  has_function_privilege('anon', signature, 'execute') = anon_execute
    as anon_matches,
  has_function_privilege('authenticated', signature, 'execute') = authenticated_execute
    as authenticated_matches
from expected
order by signature;

select
  to_regprocedure('public.caller_role()') is null as public_caller_role_removed,
  to_regprocedure('public.is_gm_or_admin()') is null as public_gm_helper_removed,
  not has_schema_privilege('anon', 'private', 'usage') as private_hidden_from_anon,
  has_schema_privilege('authenticated', 'private', 'usage') as private_available_to_rls;
