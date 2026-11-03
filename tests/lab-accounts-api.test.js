import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {openDemoStore} from '../server/store.mjs';
import {createDemoApiServer} from '../server/api.mjs';

const PASSWORD='Fake-only-password-2026!';
async function setup(){
  const dir=await mkdtemp(join(tmpdir(),'vlc-lab-'));
  const dbPath=join(dir,'lab.sqlite');
  const store=openDemoStore(dbPath);
  const server=createDemoApiServer(store);
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  async function request(path,{token,body,rev,key,origin,method}={}){
    const headers={Accept:'application/json'};
    if(token)headers.Authorization='Bearer '+token;
    if(origin)headers.Origin=origin;
    if(body!==undefined){
      headers['Content-Type']='application/json';
      if(rev!==undefined)headers['If-Match']=String(rev);
      if(key!==undefined)headers['Idempotency-Key']=key;
    }
    const response=await fetch(base+'/v1/lab/'+path,{
      method:method||(body===undefined?'GET':'POST'),
      headers,body:body===undefined?undefined:JSON.stringify(body),
    });
    return {status:response.status,data:await response.json()};
  }
  const register=async(username,role='adult')=>{
    const body={username,role,password:PASSWORD,confirmDemo:true};
    if(role==='tutor')body.subject='matematicas';
    const result=await request('register',{body});
    assert.equal(result.status,201,JSON.stringify(result.data));
    return result.data.user;
  };
  const login=async(username)=>{
    const res=await request('login',{body:{username,password:PASSWORD}});
    assert.equal(res.status,200,JSON.stringify(res.data));
    return res.data;
  };
  return {request,register,login,store,server,base,dbPath,
    done:async()=>{await new Promise(resolve=>server.close(resolve));store.close();await rm(dir,{recursive:true,force:true});}};
}

test('registro de cuentas de prueba aplica roles, scrypt y no concede verificación',async()=>{
  const f=await setup();
  try{
    const a=await f.register('adulto_demo_11');
    const tutor=await f.register('tutor_demo_11','tutor');
    const guardian=await f.register('familia_demo_11','guardian');
    assert.equal(a.verification,'unverified_demo');
    assert.equal(tutor.role,'tutor');
    assert.equal(guardian.guardianStatus,'pending_real_verification');
    const db=new DatabaseSync(f.dbPath,{readOnly:true});
    try{
      const record=db.prepare('SELECT password_hash,password_salt FROM lab_accounts WHERE username=?').get('adulto_demo_11');
      assert.ok(record.password_hash.length>=128);
      assert.equal(record.password_hash.includes(PASSWORD),false);
      assert.ok(record.password_salt.length===32);
    }finally{db.close();}
    const invalid=await f.request('register',{body:{username:'nombre',password:PASSWORD,role:'admin',confirmDemo:true}});
    assert.equal(invalid.status,422);
    const noConsent=await f.request('register',{body:{username:'nombre2',password:PASSWORD,role:'adult'}});
    assert.equal(noConsent.status,422);
  }finally{await f.done();}
});

test('aislamiento: adultos distintos no leen reservas ajenas, solo el tutor asignado decide',async()=>{
  const f=await setup();
  try{
    await f.register('adulto_demo_12');await f.register('adulto_demo_13');
    await f.register('tutor_demo_12','tutor');await f.register('tutor_demo_13','tutor');
    const a=await f.login('adulto_demo_12');
    const b=await f.login('adulto_demo_13');
    const tutor=await f.login('tutor_demo_12');
    const otherTutor=await f.login('tutor_demo_13');
    const list=await f.request('tutors',{token:a.token});
    assert.equal(list.status,200);
    assert.equal(list.data.items.length,2);
    const start=new Date(Date.now()+72*3600000).toISOString();
    const body={tutorId:tutor.user.id,subject:'Matemáticas',mode:'virtual',
      startsAt:start,audience:'adult',confirmDemo:true};
    const created=await f.request('bookings',{token:a.token,body,rev:0,key:'key-multi-accounts-01'});
    assert.equal(created.status,200,JSON.stringify(created.data));
    const id=created.data.bookingId;
    const hidden=await f.request('bookings',{token:b.token});
    assert.deepEqual(hidden.data.bookings,[]);
    assert.equal(hidden.data.revision,0); // no filtrar actividad ajena
    const access=await f.request('bookings/'+id+'/cancel',{
      token:b.token,body:{},rev:0,key:'key-multi-accounts-02',
    });
    assert.equal(access.status,403);
    const other=await f.request('bookings/'+id+'/accept',{
      token:otherTutor.token,body:{},rev:0,key:'key-multi-accounts-03',
    });
    assert.equal(other.status,403);
    const tutorView=await f.request('bookings',{token:tutor.token});
    assert.equal(tutorView.data.bookings.length,1);
    assert.equal(tutorView.data.revision,1);
    const accept=await f.request('bookings/'+id+'/accept',{
      token:tutor.token,body:{},rev:1,key:'key-multi-accounts-04',
    });
    assert.equal(accept.status,200);
    const updated=await f.request('sync?after=1',{token:a.token});
    assert.equal(updated.status,200);
    assert.equal(updated.data.changed,true);
    assert.equal(updated.data.bookings[0].status,'confirmed');
    assert.equal(updated.data.revision,2);
    const repeat=await f.request('bookings/'+id+'/accept',{
      token:tutor.token,body:{},rev:1,key:'key-multi-accounts-04',
    });
    assert.deepEqual(repeat,accept); // reintento seguro
    const cancel=await f.request('bookings/'+id+'/cancel',{
      token:a.token,body:{},rev:2,key:'key-multi-accounts-05',
    });
    assert.equal(cancel.status,200);
    assert.equal((await f.request('bookings',{token:tutor.token})).data.bookings[0].status,'cancelled');
    assert.equal((await f.request('bookings',{token:b.token})).data.bookings.length,0);
  }finally{await f.done();}
});

test('agenda evita colisiones entre cuentas y jamás crea solicitudes para menores',async()=>{
  const f=await setup();
  try{
    await f.register('adulto_demo_21');await f.register('adulto_demo_22');
    await f.register('tutor_demo_21','tutor');await f.register('familia_demo_21','guardian');
    const a=await f.login('adulto_demo_21');
    const b=await f.login('adulto_demo_22');
    const t=await f.login('tutor_demo_21');
    const guardian=await f.login('familia_demo_21');
    const body={tutorId:t.user.id,subject:'Álgebra',mode:'virtual',
      startsAt:new Date(Date.now()+72*3600000).toISOString(),audience:'adult',confirmDemo:true};
    const minor=await f.request('bookings',{token:guardian.token,body:{...body,audience:'minor'},
      rev:0,key:'key-minor-denied-0001'});
    assert.equal(minor.status,403);
    const child=await f.request('learners',{token:guardian.token,body:{alias:'infante'}});
    assert.equal(child.status,403);
    const created=await f.request('bookings',{token:a.token,body,rev:0,key:'key-schedule-000001'});
    assert.equal(created.status,200);
    const collision=await f.request('bookings',{token:b.token,body,rev:0,key:'key-schedule-000002'});
    assert.equal(collision.status,409);
    const inject=await f.request('bookings',{token:b.token,
      body:{...body,requesterId:a.user.id},rev:0,key:'key-schedule-000003'});
    assert.equal(inject.status,422);
    const tutorCannot=await f.request('bookings',{token:t.token,body,rev:1,key:'key-schedule-000004'});
    assert.equal(tutorCannot.status,403);
  }finally{await f.done();}
});

test('sesiones se revocan localmente en web y móvil; contraseña errónea no inicia sesión',async()=>{
  const f=await setup();
  try{
    await f.register('adulto_demo_31');
    const wrong=await f.request('login',{body:{username:'adulto_demo_31',password:'incorrect-only-2026'}});
    assert.equal(wrong.status,401);
    const session1=await f.login('adulto_demo_31');
    const session2=await f.login('adulto_demo_31');
    assert.equal((await f.request('me',{token:session1.token})).status,200);
    const logout=await f.request('logout',{token:session1.token,body:{}});
    assert.equal(logout.status,200);
    assert.equal((await f.request('me',{token:session1.token})).status,401);
    assert.equal((await f.request('me',{token:session2.token})).status,200);
    const all=await f.request('logout-all',{token:session2.token,body:{}});
    assert.equal(all.status,200);
    assert.equal((await f.request('bookings',{token:session2.token})).status,401);
    assert.equal((await f.request('bookings')).status,401);
  }finally{await f.done();}
});

test('los cambios personales persisten al reiniciar conexiones SQLite sin exponer secretos',async()=>{
  const f=await setup();
  try{
    await f.register('adulto_demo_41');await f.register('tutor_demo_41','tutor');
    const a=await f.login('adulto_demo_41');
    const t=await f.login('tutor_demo_41');
    const created=await f.request('bookings',{token:a.token,
      body:{tutorId:t.user.id,subject:'Cálculo',mode:'virtual',
        startsAt:new Date(Date.now()+72*3600000).toISOString(),audience:'adult',confirmDemo:true},
      rev:0,key:'key-persist-accounts-01'});
    assert.equal(created.status,200);
    const other=openDemoStore(f.dbPath);
    try {
      assert.equal(other.lab.authenticate(a.token).id,a.user.id);
      assert.equal(other.lab.snapshot(a.user.id).bookings.length,1);
      assert.equal(other.lab.snapshot(t.user.id).bookings.length,1);
    } finally { other.close(); }
  }finally{await f.done();}
});

test('un origen externo no puede efectuar acciones desde un navegador contra el servidor local',async()=>{
  const f=await setup();
  try {
    const blocked=await f.request('register',{origin:'https://sitio-ejemplo.invalid',
      body:{username:'hacker_demo_01',password:PASSWORD,role:'adult',confirmDemo:true}});
    assert.equal(blocked.status,403);
    const ui=await fetch(f.base+'/sync/secure/');
    assert.equal(ui.status,200);
    assert.match(await ui.text(),/Fase de autorización/);
  }finally{await f.done();}
});
