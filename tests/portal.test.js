import test from 'node:test';
import assert from 'node:assert/strict';
import {VLCClient} from '../portal/client.js';
import {validatePassword, validateLearner, validateAttachment, sanitizeSubjects, makeObjectPath} from '../portal/validators.js';

test('contraseñas de 12+ caracteres, sin asumir fuerza real', () => {
 assert.equal(validatePassword('12345678901'),false);
 assert.equal(validatePassword('A-long-password-01'),true);
});
test('aprendices requieren etapa válida y apodo mínimo', () => {
 assert.equal(validateLearner('Luz','primary','3'),true);
 assert.equal(validateLearner('X','primary','3'),false);
 assert.equal(validateLearner('Luz','universidad','3'),false);
});
test('documentos solo PDF/JPG/PNG y hasta 8 MB', () => {
 assert.equal(validateAttachment({type:'application/pdf',size:1000}),'');
 assert.match(validateAttachment({type:'text/html',size:100}),/no permitido/);
 assert.match(validateAttachment({type:'application/pdf',size:9e6}),/8 MB/);
});
test('ruta de archivo aleatoria, no nombres de alumnos', () => {
 const uuid='e4c3821b-4f61-4c43-8df1-e29d23fb3bd5';
 assert.equal(makeObjectPath(uuid,{type:'image/jpeg',size:10},uuid), uuid+'/'+uuid+'.jpg');
});
test('sin key configurada o con key secreta, se niega iniciar',()=>{
 assert.throws(()=>new VLCClient({url:'https://test.supabase.co',publishableKey:'sb_secret_bad'}));
 assert.throws(()=>new VLCClient({url:'http://insecure.test',publishableKey:'sb_publishable_test'}));
});
test('API privada rechaza operación sin sesión',async()=>{
 const client=new VLCClient({url:'https://test.supabase.co',publishableKey:'sb_publishable_test'},()=>{throw new Error('no fetch');});
 await assert.rejects(client.rows('learners'),/iniciar sesión/);
});
test('Auth usa api key publicable, sin autorización administrativa',async()=>{
 const calls=[];
 const fake=async (url,options)=>{
   calls.push({url,options});
   return {ok:true,status:200,text:async()=>JSON.stringify(
     url.endsWith('/auth/v1/user')?{id:'test-user'}:{access_token:'access-test'})};
 };
 const client=new VLCClient({url:'https://test.supabase.co',publishableKey:'sb_publishable_test'},fake);
 await client.signIn('user@example.com','correct-password');
 assert.equal(client.userId,'test-user');
 assert.equal(calls[0].options.headers.apikey,'sb_publishable_test');
 assert.equal(calls[1].options.headers.Authorization,'Bearer access-test');
});
test('normaliza materias de forma determinista',()=>{
 assert.deepEqual(sanitizeSubjects('Historia, Filosofía,Historia'),['Historia','Filosofía']);
});
