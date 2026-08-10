
CREATE POLICY "Users read own project materials"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own project materials"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own project materials"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'project-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own project materials"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-materials' AND auth.uid()::text = (storage.foldername(name))[1]);
