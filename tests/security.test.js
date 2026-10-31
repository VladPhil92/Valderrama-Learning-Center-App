import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base='supabase/migrations/';
const core=readFileSync(base+'20261030010000_phase1_core.sql','utf8');
const storage=readFileSync(base+'20261030020000_phase1_private_storage.sql','utf8');

test('todas las tablas expuestas activan RLS',()=>{
 for(const name of ['user_profiles','staff_members','learners','guardian_reviews',
 'tutor_profiles','tutor_verifications','tutor_credentials',
 'credential_reviews','tutor_checks','review_audit'])
  assert.ok(core.includes('alter table public.'+name+' enable row level security;'),name);
});
test('no se conceden escrituras de revisiones a clientes autenticados',()=>{
 assert.ok(!/grant\s+(insert|update|delete)[^;]*on\s+public\.(tutor_verifications|tutor_checks|guardian_reviews|credential_reviews)/i.test(core));
});
test('buckets de documentos siempre privados',()=>{
 assert.ok(storage.includes("'tutor-credentials','tutor-credentials',false"));
 assert.ok(storage.includes("'tutor-photos','tutor-photos',false"));
 assert.ok(!storage.includes('for update to authenticated'));
});
test('el guardián es propietario obligatorio de sus alumnos',()=>{
 assert.ok(core.includes('guardian_id = (select auth.uid())'));
 assert.ok(core.includes("u.account_type='guardian'"));
});
