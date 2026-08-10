-- Lock down mutation policies to the owner while keeping agency-wide read access
-- (auth is already restricted to @vanguardamartech.com.br emails by a separate trigger).

DROP POLICY IF EXISTS "agency clients update" ON public.clients;
DROP POLICY IF EXISTS "agency clients delete" ON public.clients;
DROP POLICY IF EXISTS "agency pages update" ON public.landing_pages;
DROP POLICY IF EXISTS "agency pages delete" ON public.landing_pages;

CREATE POLICY "owner clients update"
ON public.clients
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner clients delete"
ON public.clients
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "owner pages update"
ON public.landing_pages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner pages delete"
ON public.landing_pages
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);