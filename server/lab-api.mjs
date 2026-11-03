import { LabError } from './lab-store.mjs';

function send(res,status,payload) {
  res.writeHead(status,{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'Referrer-Policy':'no-referrer',
    'X-Content-Type-Options':'nosniff',
  }).end(JSON.stringify(payload));
}
function onlyKeys(body,allowed) {
  if (Object.keys(body).some(key=>!allowed.includes(key))) {
    throw new LabError(422,'El laboratorio no admite datos personales ni campos adicionales.');
  }
}
function tokenOf(req) {
  const header=req.headers.authorization;
  if (typeof header!=='string' || !/^Bearer [A-Za-z0-9_-]{43}$/.test(header)) {
    throw new LabError(401,'Inicie sesión con una cuenta ficticia.');
  }
  return header.slice(7);
}
function versionOf(req) {
  const raw=req.headers['if-match'];
  return typeof raw==='string' && /^(0|[1-9]\d*)$/.test(raw) ? Number(raw) : -1;
}
/**
 * Rutas de laboratorio separadas de /v1/demo. NO representan identidad legal.
 * Cada cuenta de prueba solo puede consultar sus propias reservas.
 */
export async function handleLabApi(req,res,{url,readBody,lab}) {
  const path=url.pathname;
  if (!path.startsWith('/v1/lab/')) return false;
  const method=req.method;
  if (method==='POST' && (path==='/v1/lab/register'||path==='/v1/lab/login')) {
    const body=await readBody(req);
    if (path==='/v1/lab/register') {
      onlyKeys(body,['username','password','role','subject','confirmDemo']);
      send(res,201,{demo:true,user:lab.register(body)});
    } else {
      onlyKeys(body,['username','password']);
      send(res,200,lab.login(body));
    }
    return true;
  }
  const token=tokenOf(req);
  const principal=lab.authenticate(token);
  if (method==='GET') {
    if (path==='/v1/lab/me') {
      send(res,200,{demo:true,user:principal});return true;
    }
    if (path==='/v1/lab/tutors') {
      send(res,200,{demo:true,items:lab.tutors()});return true;
    }
    if (path==='/v1/lab/bookings') {
      send(res,200,lab.snapshot(principal.id));return true;
    }
    if (path==='/v1/lab/sync') {
      const after=url.searchParams.get('after');
      if (!/^(0|[1-9]\d*)$/.test(after||'')) throw new LabError(400,'Cursor de sincronización inválido.');
      const current=lab.snapshot(principal.id);
      send(res,200,{
        demo:true,revision:current.revision,changed:Number(after)!==current.revision,
        ...(Number(after)!==current.revision ? {bookings:current.bookings} : {}),
      });
      return true;
    }
  }
  if (method==='POST') {
    if (path==='/v1/lab/logout'||path==='/v1/lab/logout-all') {
      const body=await readBody(req);
      onlyKeys(body,[]);
      send(res,200,lab.logout(token,path.endsWith('logout-all')));return true;
    }
    if (path==='/v1/lab/learners') {
      throw new LabError(403,'No se permiten fichas de menores en este laboratorio.');
    }
    if (path==='/v1/lab/bookings') {
      const body=await readBody(req);
      onlyKeys(body,['tutorId','subject','mode','startsAt','audience','confirmDemo']);
      const result=lab.change({
        userId:principal.id,key:req.headers['idempotency-key'],
        revision:versionOf(req),operation:'request',payload:body,
      });
      send(res,200,result);return true;
    }
    const match=path.match(/^\/v1\/lab\/bookings\/(lab-[a-f0-9-]{36})\/(accept|reject|cancel)$/);
    if (match) {
      const body=await readBody(req);
      onlyKeys(body,[]);
      const result=lab.change({
        userId:principal.id,key:req.headers['idempotency-key'],
        revision:versionOf(req),operation:match[2],payload:{bookingId:match[1]},
      });
      send(res,200,result);return true;
    }
  }
  throw new LabError(404,'Ruta privada de prueba no disponible.');
}
