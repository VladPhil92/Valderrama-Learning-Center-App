// Servidor privilegiado de revisión. NUNCA importar ni exponer la service_role en el navegador.
// Se requiere un proyecto Supabase dedicado y ALLOWED_ORIGIN de producción.
import { createClient } from '@supabase/supabase-js';

const URL = Deno.env.get('SUPABASE_URL') ?? '';
const SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '';
const admin = createClient(URL, SECRET, {auth:{persistSession:false, autoRefreshToken:false}});
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ticket = /^[A-Z]{2,10}-[0-9]{4,12}$/;
const checksRequiredForAdult = ['identity','academic'];
const checksRequiredForMinor = ['identity','academic','legal_eligibility','safeguarding_training'];
type Body = {action?:string; tutor_id?:string; credential_id?:string; learner_id?:string; status?:string; check_type?:string; result?:string; evidence_ticket?:string};
function cors(origin:string) {
  return {
    'Access-Control-Allow-Origin': origin === ALLOWED_ORIGIN ? origin : 'null',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'authorization, apikey, content-type',
    'Vary':'Origin',
  };
}
function response(status:number,payload:unknown,origin:string) {
 return new Response(JSON.stringify(payload),{status,headers:{...cors(origin),'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
}
function validTicket(value:unknown): value is string { return typeof value==='string' && ticket.test(value); }
function validId(value:unknown): value is string { return typeof value==='string' && uuid.test(value); }
async function log(reviewer_id:string,action:string,target_id:string,details:Record<string,unknown>) {
 const {error} = await admin.from('review_audit').insert({reviewer_id,action,target_id,details});
 if(error) throw new Error('No fue posible registrar la auditoría. Revisar el estado en consola.');
}
async function checked(tutor_id:string,needed:string[]) {
 const {data,error}=await admin.from('tutor_checks').select('check_type,result').eq('tutor_id',tutor_id);
 if(error) throw new Error('No se pudieron consultar los controles');
 return needed.every(key=>data?.some(row=>row.check_type===key && row.result==='passed'));
}
async function verifiedCredential(tutor_id:string) {
 const {data:docs,error}=await admin.from('tutor_credentials').select('id').eq('tutor_id',tutor_id);
 if(error || !docs?.length) return false;
 const {data:verified,evidenceError}=await (async()=>{
   const q=await admin.from('credential_reviews').select('credential_id,status').in('credential_id',docs.map(d=>d.id));
   return {data:q.data,evidenceError:q.error};
 })();
 if(evidenceError) return false;
 return verified?.some(x=>x.status==='verified') ?? false;
}
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin') ?? '';
 if(req.method==='OPTIONS') return response(origin===ALLOWED_ORIGIN?204:403,{},origin);
 if(req.method!=='POST') return response(405,{error:'Método no permitido'},origin);
 if(!ALLOWED_ORIGIN || (origin && origin!==ALLOWED_ORIGIN)) return response(403,{error:'Origen no autorizado'},origin);
 try {
  if(!SECRET || !URL) return response(503,{error:'Servicio sin configurar'},origin);
  const bearer=req.headers.get('authorization') ?? '';
  if(!bearer.startsWith('Bearer ')) return response(401,{error:'Se requiere autenticación'},origin);
  // getUser(token) valida el JWT ante Supabase Auth; no confiar en campos enviados por el cliente.
  const {data:auth,error:authError}=await admin.auth.getUser(bearer.slice(7));
  const user=auth?.user;
  if(authError || !user) return response(401,{error:'Sesión inválida'},origin);
  const {data:staff,error:staffError}=await admin.from('staff_members').select('staff_role').eq('user_id',user.id).maybeSingle();
  if(staffError || !staff) return response(403,{error:'No autorizado para revisar'},origin);
  const body:Body=await req.json();
  const restricted = ['review_credential','review_tutor','review_check'];
  if(restricted.includes(body.action??'') && !['reviewer','admin'].includes(staff.staff_role)) return response(403,{error:'Solo revisores'},origin);
  if(body.action==='review_credential') {
    if(!validId(body.credential_id) || !['verified','rejected'].includes(body.status??''))
      return response(422,{error:'Datos de acreditación inválidos'},origin);
    const {data:doc}=await admin.from('tutor_credentials').select('id,tutor_id').eq('id',body.credential_id).maybeSingle();
    if(!doc) return response(404,{error:'Acreditación no encontrada'},origin);
    if(!validTicket(body.evidence_ticket)) return response(422,{error:'Se requiere ticket de evidencia interna (ej. CRED-1234)'},origin);
    const {error}=await admin.from('credential_reviews').update({
       status:body.status,reviewer_id:user.id,reviewed_at:new Date().toISOString()
    }).eq('credential_id',doc.id);
    if(error) throw error;
    if(body.status==='rejected') {
       const {data:v}=await admin.from('tutor_verifications').select('status').eq('tutor_id',doc.tutor_id).single();
       if(v?.status?.startsWith('approved')) {
         await admin.from('tutor_verifications').update({status:'suspended',reviewer_id:user.id,reviewed_at:new Date().toISOString()}).eq('tutor_id',doc.tutor_id);
         await admin.from('tutor_profiles').update({public_visible:false}).eq('user_id',doc.tutor_id);
       }
    }
    await log(user.id,'review_credential',doc.id,{status:body.status,evidence_ticket:body.evidence_ticket});
    return response(200,{ok:true},origin);
  }
  if(body.action==='review_check') {
    if(!validId(body.tutor_id) || !checksRequiredForMinor.includes(body.check_type??'') ||
       !['passed','failed'].includes(body.result??'') || !validTicket(body.evidence_ticket))
      return response(422,{error:'Control o ticket de evidencia inválido'},origin);
    if(['legal_eligibility','safeguarding_training'].includes(body.check_type??'') && staff.staff_role!=='admin')
      return response(403,{error:'Esta verificación requiere rol administrador'},origin);
    const {data:profile}=await admin.from('tutor_profiles').select('user_id').eq('user_id',body.tutor_id).maybeSingle();
    if(!profile) return response(404,{error:'Docente no encontrado'},origin);
    const {error}=await admin.from('tutor_checks').upsert({
      tutor_id:body.tutor_id,check_type:body.check_type,result:body.result,
      evidence_ticket:body.evidence_ticket,reviewer_id:user.id,reviewed_at:new Date().toISOString()
    },{onConflict:'tutor_id,check_type'});
    if(error) throw error;
    if(body.result==='failed') {
      await admin.from('tutor_verifications').update({status:'suspended',reviewer_id:user.id,reviewed_at:new Date().toISOString()}).eq('tutor_id',body.tutor_id);
      await admin.from('tutor_profiles').update({public_visible:false}).eq('user_id',body.tutor_id);
    }
    await log(user.id,'review_check',body.tutor_id,{check_type:body.check_type,result:body.result,evidence_ticket:body.evidence_ticket});
    return response(200,{ok:true},origin);
  }
  if(body.action==='review_tutor') {
    const allowed=['in_review','approved_adults','approved_minors','rejected','suspended'];
    if(!validId(body.tutor_id) || !allowed.includes(body.status??''))
      return response(422,{error:'Docente o decisión inválidos'},origin);
    if(body.status==='approved_minors' && staff.staff_role!=='admin')
      return response(403,{error:'La aprobación para menores requiere un administrador'},origin);
    const {data:profile}=await admin.from('tutor_profiles').select('user_id,submitted_at,headline,subjects').eq('user_id',body.tutor_id).maybeSingle();
    if(!profile?.submitted_at) return response(409,{error:'El docente no ha enviado su solicitud'},origin);
    if(body.status?.startsWith('approved')) {
      const needed=body.status==='approved_minors'?checksRequiredForMinor:checksRequiredForAdult;
      if(!profile.headline || !profile.subjects?.length || !(await checked(body.tutor_id!,needed)) || !(await verifiedCredential(body.tutor_id!)))
        return response(409,{error:'Faltan verificaciones documentadas para aprobar este docente'},origin);
    }
    const {error}=await admin.from('tutor_verifications').update({
      status:body.status,reviewer_id:user.id,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()
    }).eq('tutor_id',body.tutor_id);
    if(error) throw error;
    const {error:pubError}=await admin.from('tutor_profiles').update({
      public_visible:body.status?.startsWith('approved')
    }).eq('user_id',body.tutor_id);
    if(pubError) throw pubError;
    await log(user.id,'review_tutor',body.tutor_id!,{status:body.status});
    return response(200,{ok:true},origin);
  }
  if(body.action==='review_guardian') {
    if(!['safeguarding','admin'].includes(staff.staff_role))
      return response(403,{error:'No autorizado'},origin);
    if(!validId(body.learner_id) || !['verified','rejected','suspended'].includes(body.status??'') || !validTicket(body.evidence_ticket))
      return response(422,{error:'Se requiere decisión válida y ticket de verificación del representante'},origin);
    const {error}=await admin.from('guardian_reviews').update({
      status:body.status,evidence_ticket:body.evidence_ticket,
      reviewer_id:user.id,reviewed_at:new Date().toISOString()
    }).eq('learner_id',body.learner_id);
    if(error) throw error;
    await log(user.id,'review_guardian',body.learner_id!,{status:body.status,evidence_ticket:body.evidence_ticket});
    return response(200,{ok:true},origin);
  }
  return response(400,{error:'Acción desconocida'},origin);
 }catch(err){
  console.error('Review function failed',err instanceof Error ? err.message : 'unknown');
  return response(500,{error:'No se pudo finalizar la revisión. Revise el registro administrativo.'},origin);
 }
});
