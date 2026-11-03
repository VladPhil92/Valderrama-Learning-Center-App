const $=id=>document.getElementById(id);
const label=(tag,value,cls)=>{const el=document.createElement(tag);el.textContent=String(value);if(cls)el.className=cls;return el;};
let token=null, current=null, tutors=[],working=false;
function message(value,error=false){$('message').textContent=value;$('message').className=error?'error':'success';}
function nextTime(){
  const d=new Date(Date.now()+3*86400000);
  d.setHours(15,0,0,0);
  $('when').value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
async function req(path,body=null,version=null) {
  const headers={'Accept':'application/json'};
  if(token)headers.Authorization='Bearer '+token;
  if(body!==null) {
    headers['Content-Type']='application/json';
    if(version!==null) {
      headers['If-Match']=String(version);
      headers['Idempotency-Key']='vlc-'+crypto.randomUUID();
    }
  }
  const response=await fetch('/v1/lab/'+path,{method:body===null?'GET':'POST',
    headers,body:body===null?undefined:JSON.stringify(body),cache:'no-store'});
  const data=await response.json();
  if(!response.ok){
    if(response.status===401&&token){token=null;current=null;showAuth();}
    throw Error(data.error||'Error del laboratorio.');
  }
  if(data.demo!==true)throw Error('Respuesta de servidor no reconocida como laboratorio.');
  return data;
}
function showAuth(){$('auth').hidden=false;$('dashboard').hidden=true;$('login').reset();}
function showDashboard(){ $('auth').hidden=true;$('dashboard').hidden=false; }
async function refresh(){
  if(!token||working)return;
  try{
    const result=await req('bookings');
    current=result;
    $('identity').textContent=result.user.displayName;
    $('role').textContent='Rol: '+result.user.role+' · Estado: '+result.user.verification+
      (result.user.guardianStatus?' · Representación: '+result.user.guardianStatus:'');
    $('revision').textContent='Revisión '+result.revision;
    $('booking').hidden=result.user.role==='tutor';
    const list=$('bookings');list.replaceChildren();
    if(!result.bookings.length)list.append(label('p','Sin solicitudes ficticias.','muted'));
    for(const b of result.bookings){
      const tutor=tutors.find(t=>t.id===b.tutorId);
      const item=label('article','','booking');
      item.append(label('strong',(tutor?.displayName||'Docente de prueba')+' · '+b.subject));
      item.append(label('span',new Date(b.startsAt).toLocaleString('es-CO')+' · '+b.status));
      const actions=label('div','','actions');
      const add=(name,action)=>{
        const button=label('button',name);button.type='button';button.disabled=working;
        button.onclick=()=>{void runAction('bookings/'+b.id+'/'+action,{});};
        actions.append(button);
      };
      if(b.status==='pending'&&result.user.role==='tutor'&&result.user.id===b.tutorId){
        add('Aceptar','accept');add('Rechazar','reject');
      }
      if(['pending','confirmed'].includes(b.status))add('Cancelar','cancel');
      item.append(actions);list.append(item);
    }
    showDashboard();
  }catch(error){message(error.message,true);}
}
async function listTutors(){
  const data=await req('tutors');
  tutors=data.items;
  const sel=$('tutor');sel.replaceChildren();
  for(const t of tutors){
    const op=label('option',t.displayName+' · '+t.specialty);
    op.value=t.id;sel.append(op);
  }
  if(!tutors.length){const op=label('option','Primero registre una cuenta docente ficticia.');op.value='';sel.append(op);}
}
async function runAction(path,body) {
  if(!current||working)return;
  working=true;
  try{
    await req(path,body,current.revision);
    message('Cambios ficticios guardados. Otro dispositivo con esta cuenta recibirá la actualización.');
  }catch(error){message(error.message,true);}
  finally{working=false;await refresh();}
}
$('new-role').addEventListener('change',()=>{
  $('subject-field').hidden=$('new-role').value!=='tutor';
});
$('registration').addEventListener('submit',event=>{
  event.preventDefault();
  void (async()=>{try{
    const body={username:$('new-username').value,password:$('new-password').value,
      role:$('new-role').value,confirmDemo:$('new-confirm').checked};
    if(body.role==='tutor')body.subject=$('new-subject').value;
    await req('register',body);
    $('username').value=body.username;$('password').value='';
    $('new-password').value='';
    message('Cuenta ficticia creada. Ingrese con su contraseña.');
  }catch(error){message(error.message,true);}})();
});
$('login').addEventListener('submit',event=>{
  event.preventDefault();
  void(async()=>{try{
    const data=await req('login',{username:$('username').value,password:$('password').value});
    $('password').value='';
    token=data.token;
    await listTutors();await refresh();
    message('Sesión ficticia activa. No se han validado identidades reales.');
  }catch(error){message(error.message,true);}})();
});
$('booking').addEventListener('submit',event=>{
  event.preventDefault();
  const date=new Date($('when').value);
  if(Number.isNaN(date.getTime())){message('Fecha inválida.',true);return;}
  void runAction('bookings',{tutorId:Number($('tutor').value),
    subject:$('booking-subject').value,mode:'virtual',startsAt:date.toISOString(),
    audience:'adult',confirmDemo:true});
});
async function logout(all=false){
  try{if(token)await req(all?'logout-all':'logout',{});}
  catch(error){message(error.message,true);}
  finally{token=null;current=null;showAuth();message('Sesión de prueba cerrada.');}
}
$('logout').onclick=()=>{void logout();};
$('logout-all').onclick=()=>{void logout(true);};
nextTime();setInterval(()=>{if(token&&!working)void refresh();},4000);
