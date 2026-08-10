
-- Share clients and landing pages across the whole agency (all authenticated users)
DROP POLICY IF EXISTS "own clients" ON public.clients;
DROP POLICY IF EXISTS "own pages" ON public.landing_pages;

CREATE POLICY "agency clients read" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "agency clients insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agency clients update" ON public.clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "agency clients delete" ON public.clients FOR DELETE TO authenticated USING (true);

CREATE POLICY "agency pages read" ON public.landing_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "agency pages insert" ON public.landing_pages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agency pages update" ON public.landing_pages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "agency pages delete" ON public.landing_pages FOR DELETE TO authenticated USING (true);

-- Require client linkage going forward (existing rows untouched)
ALTER TABLE public.landing_pages
  ADD CONSTRAINT landing_pages_client_fk
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS landing_pages_client_id_idx ON public.landing_pages(client_id);
