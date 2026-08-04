-- KREATON private source assets for paid AI logos.
--
-- Review and run manually in the Supabase SQL Editor. The backend uses the
-- service-role key and therefore bypasses RLS. There are deliberately no
-- anon/authenticated policies below: browser access is deny-by-default.

insert into storage.buckets (id, name, public)
values ('private-assets', 'private-assets', false)
on conflict (id) do update set public = false;

-- Do not add public SELECT policies for storage.objects in this bucket.
-- Signed URLs are minted only by GET /ai/logo/{logo_id}/download after Stripe
-- confirms checkout.session.completed for the logo.
