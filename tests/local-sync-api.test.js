import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {openDemoStore} from '../server/store.mjs';
import {createDemoApiServer} from '../server/api.mjs';

const future = () => new Date(Date.now()+72*3600000).toISOString();
async function fixture() {
  const dir=await mkdtemp(join(tmpdir(),'vlc-api-'));
  const dbPath=join(dir,'sandbox.sqlite');
  let store=openDemoStore(dbPath);
  const server=createDemoApiServer(store);
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  async function get(path) {
    const response=await fetch(base+path);
    return {status:response.status,data:await response.json(),headers:response.headers};
  }
  async function post(path,payload,revision,key) {
    const response=await fetch(base+path,{
      method:'POST',
      headers:{'Content-Type':'application/json','If-Match':String(revision),
        'Idempotency-Key':key},
      body:JSON.stringify(payload),
    });
    return {status:response.status,data:await response.json()};
  }
  return {base,dbPath,get,post,store,server,
    cleanup:async()=>{await new Promise(resolve=>server.close(resolve));store.close();await rm(dir,{recursive:true,force:true});}};
}

test('web y clientes móviles consultan el mismo catálogo ficticio, sin datos sensibles',async()=>{
  const app=await fixture();
  try{
    const catalog=await app.get('/v1/tutors');
    assert.equal(catalog.status,200);
    assert.equal(catalog.data.demo,true);
    assert.equal(catalog.data.source,'demo');
    assert.ok(catalog.data.items.length>3);
    assert.equal(catalog.data.items[0].id,'demo-01');
    assert.equal('requesterId' in catalog.data.items[0],false);
    const snap=await app.get('/v1/demo/snapshot');
    assert.equal(snap.data.revision,0);
    assert.deepEqual(snap.data.bookings,[]);
  }finally{await app.cleanup();}
});

test('la reserva se confirma por revisión, se sincroniza y persiste tras reiniciar store',async()=>{
  const app=await fixture();
  try{
    const payload={tutorId:'demo-01',subject:'Matemáticas',mode:'virtual',startsAt:future()};
    const key='key-save-booking-000001';
    const made=await app.post('/v1/demo/bookings',payload,0,key);
    assert.equal(made.status,200,JSON.stringify(made.data));
    assert.equal(made.data.revision,1);
    assert.equal(made.data.record.status,'pending');
    const a=await app.get('/v1/demo/sync?after=0');
    assert.equal(a.data.changed,true);
    assert.equal(a.data.bookings.length,1);
    const b=await app.get('/v1/demo/sync?after=1');
    assert.equal(b.data.changed,false);
    const duplicate=await app.post('/v1/demo/bookings',payload,0,key);
    assert.equal(duplicate.status,200);
    assert.deepEqual(duplicate.data,made.data);
    assert.equal((await app.get('/v1/demo/snapshot')).data.bookings.length,1);
    // Segundo proceso/conexión al mismo archivo debe leer la revisión persistida.
    const reopened=openDemoStore(app.dbPath);
    try{assert.equal(reopened.snapshot().revision,1);assert.equal(reopened.snapshot().state.bookings.length,1);}
    finally{reopened.close();}
  }finally{await app.cleanup();}
});

test('una carrera con revisión vieja no duplica horarios y exige deduplicación',async()=>{
  const app=await fixture();
  try{
    const payload={tutorId:'demo-02',subject:'Inglés',mode:'virtual',startsAt:future()};
    const made=await app.post('/v1/demo/bookings',payload,0,'key-first-booking-0001');
    assert.equal(made.status,200);
    const stale=await app.post('/v1/demo/bookings',payload,0,'key-second-booking-0002');
    assert.equal(stale.status,409);
    const wrongKey=await app.post('/v1/demo/bookings',{...payload,subject:'Otra'},1,'key-first-booking-0001');
    assert.equal(wrongKey.status,409);
    const withoutVersion=await fetch(app.base+'/v1/demo/bookings',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),
    });
    assert.equal(withoutVersion.status,428);
  }finally{await app.cleanup();}
});

test('el servidor controla estados, bloquea menores en fase real y admite alertas ficticias',async()=>{
  const app=await fixture();
  try{
    const payload={tutorId:'demo-02',subject:'Química',mode:'virtual',startsAt:future(),audience:'minor'};
    const noMinor=await app.post('/v1/demo/bookings',payload,0,'key-minor-booking-0001');
    assert.equal(noMinor.status,422);
    const made=await app.post('/v1/demo/bookings',{tutorId:'demo-02',subject:'Química',
      mode:'virtual',startsAt:payload.startsAt},0,'key-adult-booking-0001');
    assert.equal(made.status,200);
    const id=made.data.record.id;
    const accepted=await app.post('/v1/demo/bookings/'+id+'/decision',{decision:'accept'},1,'key-accept-booking-001');
    assert.equal(accepted.status,200);
    const hold=await app.post('/v1/demo/bookings/'+id+'/incident',{category:'safeguarding'},2,'key-report-booking-001');
    assert.equal(hold.status,200);
    const snapshot=await app.get('/v1/demo/snapshot');
    assert.equal(snapshot.data.bookings[0].status,'on_hold');
    assert.equal(snapshot.data.summary.incidents,1);
    const complete=await app.post('/v1/demo/bookings/'+id+'/complete',{},3,'key-complete-booking-1');
    assert.equal(complete.status,422);
  }finally{await app.cleanup();}
});

test('rechazo de orígenes ajenos y no exposición de rutas privadas',async()=>{
  const app=await fixture();
  try{
    const res=await fetch(app.base+'/v1/demo/snapshot',{headers:{Origin:'https://unknown.example'}});
    assert.equal(res.status,403);
    const path=await fetch(app.base+'/supabase/migrations/20261030010000_phase1_core.sql');
    assert.equal(path.status,404);
    const site=await fetch(app.base+'/sync/');
    assert.equal(site.status,200);
    assert.match(await site.text(),/Laboratorio de sincronización/);
  }finally{await app.cleanup();}
});
