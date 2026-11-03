import { labEndpoint } from './api';

export type LabRole = 'adult' | 'guardian' | 'tutor';
export type LabUser = {
  id:number;username:string;role:LabRole;displayName:string;
  verification:string;guardianStatus?:string;revision:number;
};
export type LabTutor = {id:number;displayName:string;specialty:string;modes:string[];eligibleForMinors:false};
export type LabBooking = {
  id:string;requesterId:number;tutorId:number;subject:string;mode:string;
  startsAt:string;status:'pending'|'confirmed'|'rejected'|'cancelled';
};
export type LabSnapshot = {demo:true;revision:number;user:LabUser;bookings:LabBooking[]};
export type LabLogin = {demo:true;token:string;expiresAt:string;user:LabUser};

export class LabHttpError extends Error {
  constructor(public status:number,message:string){super(message);}
}
function idempotencyKey() {
  return 'vlc-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,13);
}
async function call(
  path:string, token:string|null, body?:Record<string,unknown>,revision?:number,
):Promise<Record<string,unknown>> {
  if (!path.startsWith('/v1/lab/')) throw new Error('Ruta fuera del sandbox privado.');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try {
    const headers:Record<string,string>={Accept:'application/json'};
    if (token) headers.Authorization='Bearer '+token;
    if (body) {
      headers['Content-Type']='application/json';
      if (revision!==undefined) {
        headers['If-Match']=String(revision);
        headers['Idempotency-Key']=idempotencyKey();
      }
    }
    const response=await fetch(labEndpoint(path),{
      method:body===undefined?'GET':'POST',
      headers,body:body===undefined?undefined:JSON.stringify(body),
      signal:controller.signal,
    });
    const data:unknown=await response.json();
    if (!data||typeof data!=='object')throw new Error('Respuesta inválida');
    const parsed=data as Record<string,unknown>;
    if (!response.ok)throw new LabHttpError(response.status,
      typeof parsed.error==='string'?parsed.error:'Operación no disponible');
    if (parsed.demo!==true)throw new Error('El servidor no está en modo laboratorio.');
    return parsed;
  } finally {clearTimeout(timeout);}
}

export async function labRegister(
  username:string,password:string,role:LabRole,subject:string,
):Promise<void> {
  const payload:Record<string,unknown>={username,password,role,confirmDemo:true};
  if (role==='tutor')payload.subject=subject;
  await call('/v1/lab/register',null,payload);
}
export async function labLogin(username:string,password:string):Promise<LabLogin> {
  return await call('/v1/lab/login',null,{username,password}) as unknown as LabLogin;
}
export async function labLogout(token:string,all=false):Promise<void> {
  await call(all?'/v1/lab/logout-all':'/v1/lab/logout',token,{});
}
export async function labTutors(token:string):Promise<LabTutor[]> {
  const response=await call('/v1/lab/tutors',token);
  if(!Array.isArray(response.items))throw new Error('Catálogo incorrecto');
  return response.items as LabTutor[];
}
export async function labSnapshot(token:string):Promise<LabSnapshot> {
  const response=await call('/v1/lab/bookings',token);
  if(!Number.isSafeInteger(response.revision)||!Array.isArray(response.bookings)||
     !response.user||typeof response.user!=='object')throw new Error('Estado privado inválido');
  return response as unknown as LabSnapshot;
}
export async function labBooking(
  token:string,revision:number,tutorId:number,subject:string,
):Promise<void> {
  await call('/v1/lab/bookings',token,{
    tutorId,subject,mode:'virtual',
    startsAt:new Date(Date.now()+72*3600000).toISOString(),
    audience:'adult',confirmDemo:true,
  },revision);
}
export async function labDecision(
  token:string,revision:number,bookingId:string,action:'accept'|'reject'|'cancel',
):Promise<void> {
  await call('/v1/lab/bookings/'+bookingId+'/'+action,token,{},revision);
}
