-- Valderrama Learning Center | Storage privado y trazabilidad del equipo revisor.
-- Los documentos nunca se sirven como públicos y no se permite reemplazo (upsert).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('tutor-credentials','tutor-credentials',false,8388608,
   array['application/pdf','image/jpeg','image/png']::text[]),
  ('tutor-photos','tutor-photos',false,8388608,
   array['image/jpeg','image/png']::text[])
on conflict (id) do nothing;

-- La validación del nombre de archivo y tipo debe hacerse tanto aquí como en el navegador.
create policy "owner uploads documents to own folder"
 on storage.objects for insert to authenticated with check (
 bucket_id='tutor-credentials'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and lower(storage.extension(name)) in ('pdf','jpg','png')
 and exists (select 1 from public.tutor_profiles p
   where p.user_id=(select auth.uid()) and p.public_visible=false)
 and not exists (select 1 from public.tutor_verifications v
   where v.tutor_id=(select auth.uid())
   and v.status in ('approved_adults','approved_minors','in_review','suspended'))
);
create policy "owner uploads portrait to own folder"
 on storage.objects for insert to authenticated with check (
 bucket_id='tutor-photos'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and lower(storage.extension(name)) in ('jpg','png')
 and exists (select 1 from public.tutor_profiles p
   where p.user_id=(select auth.uid()) and p.public_visible=false)
 and not exists (select 1 from public.tutor_verifications v
   where v.tutor_id=(select auth.uid())
   and v.status in ('approved_adults','approved_minors','in_review','suspended'))
);
create policy "owner and reviewer read private tutor files"
 on storage.objects for select to authenticated using (
 bucket_id in ('tutor-credentials','tutor-photos')
 and (
 (storage.foldername(name))[1]=(select auth.uid())::text
 or exists (select 1 from public.staff_members s
   where s.user_id=(select auth.uid()) and s.staff_role in ('reviewer','admin'))
 )
);

-- Sin políticas UPDATE/DELETE: los expedientes son apéndices inmutables;
-- la administración de retención/supresión requiere un flujo privilegiado y auditado.
-- Evidencias de revisión: registrar solo tickets internos, NO nombres, documentos ni hechos sensibles.
alter table public.tutor_checks
 add column if not exists evidence_ticket text
 check (evidence_ticket ~ '^[A-Z]{2,10}-[0-9]{4,12}$');
alter table public.guardian_reviews
 add column if not exists evidence_ticket text
 check (evidence_ticket is null or evidence_ticket ~ '^[A-Z]{2,10}-[0-9]{4,12}$');
