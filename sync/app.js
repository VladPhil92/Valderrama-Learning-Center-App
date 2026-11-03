const $ = id => document.getElementById(id);
const statuses = {pending:'Pendiente',confirmed:'Confirmada',rejected:'Rechazada',
  completed:'Finalizada',on_hold:'Suspendida por alerta'};
let revision = null;
let snapshot = null;
let tutors = [];
let busy = false;
const tag = (name,text,className) => {
  const e=document.createElement(name);e.textContent=String(text);
  if(className)e.className=className;
  return e;
};
function feedback(text,bad=false) {
  $('feedback').textContent=text;
  $('feedback').className=bad?'error':'success';
}
function localString(iso) {return new Date(iso).toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'});}
function buildFutureTime() {
  const date=new Date(Date.now()+2*86400000);
  date.setHours(16,0,0,0);
  const local = new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
  $('start').value=local;
}
async function request(path,init={}) {
  const result=await fetch(path,{cache:'no-store',...init});
  let payload;try{payload=await result.json();}catch{throw Error('Respuesta del servicio no interpretable.');}
  if(!result.ok)throw Error(payload.error||'Operación no disponible.');
  return payload;
}
function render() {
  if(!snapshot)return;
  $('revision').textContent='Revisión '+revision;
  for(const key of ['pending','confirmed','completed','incidents'])$(key).textContent=snapshot.summary[key];
  const list=$('bookings');list.replaceChildren();
  if(!snapshot.bookings.length)list.append(tag('p','No hay clases ficticias todavía.','muted'));
  for(const b of snapshot.bookings.slice().reverse()) {
    const tutor=tutors.find(t=>t.id===b.tutorId);
    const article=tag('article','','booking');
    article.append(tag('strong',(tutor?.name||'Docente')+' · '+b.subject));
    article.append(tag('p',localString(b.startsAt)+' · '+(statuses[b.status]||b.status),'small'));
    const actions=tag('div','','actions');
    const add=(label,action,body,kind='')=>{
      const btn=tag('button',label,kind);btn.type='button';btn.disabled=busy;
      btn.addEventListener('click',()=>{void submit('/v1/demo/bookings/'+b.id+'/'+action,body);});
      actions.append(btn);
    };
    if(b.status==='pending'){
      add('Aceptar (tutor simulado)','decision',{decision:'accept'});
      add('Rechazar','decision',{decision:'reject'},'danger');
    }
    if(['pending','confirmed'].includes(b.status)){
      add('Reprogramar +2 días','reschedule',{
        startsAt:new Date(new Date(b.startsAt).getTime()+2*86400000).toISOString()
      });
    }
    if(b.status==='confirmed')add('Simular clase finalizada','complete',{});
    if(b.status==='completed'&&!snapshot.reviews.some(r=>r.bookingId===b.id))
      add('Valorar 5 estrellas','review',{stars:5,comment:'Reseña de prueba'});
    if(['pending','confirmed','completed'].includes(b.status))
      add('Reportar alerta','incident',{category:'safeguarding'},'danger');
    article.append(actions);list.append(article);
  }
}
async function sync(force=false) {
  if(busy)return;
  try{
    const data=revision===null||force
      ?await request('/v1/demo/snapshot')
      :await request('/v1/demo/sync?after='+revision);
    if(data.demo!==true)throw Error('Backend no identificado como entorno de demostración.');
    if(force||revision===null||data.changed){
      revision=data.revision;
      snapshot=data;
      render();
    }
    $('connection').textContent='Conectado · datos ficticios';
    $('connection').className='online';
  }catch(error){
    $('connection').textContent='Sin conexión con servidor local';
    $('connection').className='offline';
    feedback(error.message,true);
  }
}
async function submit(path,body) {
  if(busy||revision===null)return;
  busy=true;
  try{
    await request(path,{
      method:'POST',
      headers:{'Content-Type':'application/json','If-Match':String(revision),
        'Idempotency-Key':'vlc-'+crypto.randomUUID()},
      body:JSON.stringify(body),
    });
    feedback('Operación ficticia guardada. Se reflejará en los otros clientes.');
  }catch(error){
    feedback(error.message,true);
  }finally{
    busy=false;
    await sync(true);
  }
}
async function start() {
  buildFutureTime();
  try {
    const catalog=await request('/v1/tutors');
    if(catalog.demo!==true||catalog.source!=='demo')throw Error('Catálogo de prueba no válido.');
    tutors=catalog.items;
    const select=$('tutor');
    for(const t of tutors){
      const option=tag('option',t.name+' · '+t.specialty);
      option.value=t.id;select.append(option);
    }
    if(tutors.length)$('mode').value=tutors[0].modes[0];
    select.addEventListener('change',()=>{
      const t=tutors.find(x=>x.id===select.value);
      const mode=$('mode');mode.replaceChildren();
      for(const m of t?.modes||[]){
        const opt=tag('option',m);opt.value=m;mode.append(opt);
      }
    });
    select.dispatchEvent(new Event('change'));
    await sync(true);
  }catch(error){feedback(error.message,true);}
  setInterval(()=>{void sync();},4000);
}
$('new-booking').addEventListener('submit',(event)=>{
  event.preventDefault();
  const date=new Date($('start').value);
  if(Number.isNaN(date.getTime())){feedback('Hora de inicio inválida',true);return;}
  void submit('/v1/demo/bookings',{
    tutorId:$('tutor').value,
    subject:$('subject').value,
    mode:$('mode').value,
    startsAt:date.toISOString(),
  });
});
$('reset').addEventListener('click',()=>{
  if(confirm('¿Borrar todas las sesiones ficticias guardadas localmente?'))void submit('/v1/demo/reset',{});
});
void start();
