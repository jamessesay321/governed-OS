-- ============================================================
-- Advisory OS — Migration 026: Vault File Storage
-- Adds file_upload type to vault_item_type enum and creates
-- Supabase Storage bucket for vault file uploads.
-- ============================================================

-- Add file_upload to the vault_item_type enum
alter type public.vault_item_type add value if not exists 'file_upload';

-- ============================================================
-- Supabase Storage bucket: vault-files
-- Files stored at: vault-files/{org_id}/{vault_item_id}/{filename}
-- ============================================================

-- Create the storage bucket (private by default)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vault-files',
  'vault-files',
  false,
  52428800, -- 50 MB max file size
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'text/csv',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
) on conflict (id) do nothing;

-- ============================================================
-- Storage RLS Policies
-- Scoped to org_id path prefix so orgs can only access their own files.
-- Path convention: {org_id}/{vault_item_id}/{filename}
-- ============================================================

-- Members can read files belonging to their org
create policy "Org members can read vault files"
  on storage.objects for select
  using (
    bucket_id = 'vault-files'
    and (storage.foldername(name))[1]::uuid = public.user_org_id()
  );

-- Advisors+ can upload files to their org folder
create policy "Advisors can upload vault files"
  on storage.objects for insert
  with check (
    bucket_id = 'vault-files'
    and (storage.foldername(name))[1]::uuid = public.user_org_id()
    and public.user_has_role('advisor')
  );

-- Admins can delete vault files from their org folder
create policy "Admins can delete vault files"
  on storage.objects for delete
  using (
    bucket_id = 'vault-files'
    and (storage.foldername(name))[1]::uuid = public.user_org_id()
    and public.user_has_role('admin')
  );
