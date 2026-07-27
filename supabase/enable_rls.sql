-- KREATON Supabase RLS hardening.
--
-- Review and run manually in the Supabase SQL Editor.
-- This only enables RLS; it intentionally does not add anon/authenticated
-- policies, so direct client access is deny-by-default. The FastAPI backend
-- uses the Supabase service role key, which bypasses RLS by design.

ALTER TABLE IF EXISTS public.ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.domain_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
