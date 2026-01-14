-- Políticas de storage para o bucket avatars (upload de fotos de perfil)

-- Policy para upload de avatar (authenticated users podem fazer upload na sua pasta)
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.agents 
    WHERE cpf = regexp_replace(auth.jwt()->>'email', '@.*$', '')
    LIMIT 1
  )
);

-- Policy para update de avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.agents 
    WHERE cpf = regexp_replace(auth.jwt()->>'email', '@.*$', '')
    LIMIT 1
  )
);

-- Policy para delete de avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.agents 
    WHERE cpf = regexp_replace(auth.jwt()->>'email', '@.*$', '')
    LIMIT 1
  )
);

-- Policy para leitura pública de avatars (bucket já é público)
CREATE POLICY "Public can read avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');