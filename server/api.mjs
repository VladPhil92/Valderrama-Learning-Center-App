import { handleLabApi } from './lab-api.mjs';
import { LabError } from './lab-store.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  requestClass, decideClass, rescheduleClass, completeClass,
  reviewClass, reportIncident, getSummary, createEmptyMarketplace,
} from '../src/marketplace.js';
import { ConflictError, PreconditionError } from './store.mjs';

const assets = new Map([
  ['/', ['sync/index.html','text/html; charset=utf-8']],
  ['/sync/', ['sync/index.html','text/html; charset=utf-8']],
  ['/sync/index.html', ['sync/index.html','text/html; charset=utf-8']],
  ['/sync/app.js', ['sync/app.js','text/javascript; charset=utf-8']],
  ['/sync/styles.css', ['sync/styles.css','text/css; charset=utf-8']],
  ['/sync/secure/', ['sync/secure/index.html','text/html; charset=utf-8']],
  ['/sync/secure/index.html', ['sync/secure/index.html','text/html; charset=utf-8']],
  ['/sync/secure/app.js', ['sync/secure/app.js','text/javascript; charset=utf-8']],
  ['/sync/secure/styles.css', ['sync/secure/styles.css','text/css; charset=utf-8']],
]);

function json(res, status, value, extra = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...extra,
  }).end(JSON.stringify(value));
}

async function inputJson(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
    throw new HttpError(415, 'Se requiere Content-Type: application/json.');
  }
  let text = '';
  for await (const chunk of req) {
    text += chunk.toString('utf8');
    if (text.length > 8192) throw new HttpError(413, 'Solicitud demasiado extensa.');
  }
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error();
    return body;
  } catch {
    throw new HttpError(400, 'JSON inválido.');
  }
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function isTrustedLocalOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // Clientes móviles no envían Origin.
  try {
    const source = new URL(origin);
    const target = req.headers.host;
    return source.host === target && source.protocol === 'http:';
  } catch { return false; }
}

export function createDemoApiServer(store) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname;
      const method = req.method || 'GET';
      if (!['GET', 'POST'].includes(method)) throw new HttpError(405, 'Método no permitido.');
      if (!isTrustedLocalOrigin(req)) throw new HttpError(403, 'Origen de acceso no permitido.');
      if (method === 'GET' && assets.has(path)) {
        const [file,mime] = assets.get(path);
        const content = await readFile(resolve(process.cwd(),file));
        res.writeHead(200, {
          'Content-Type': mime, 'Cache-Control':'no-store',
          'X-Content-Type-Options':'nosniff',
          'Content-Security-Policy':"default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        }).end(content);
        return;
      }
      if (path.startsWith('/v1/lab/')) {
        await handleLabApi(req,res,{url,readBody:inputJson,lab:store.lab});
        return;
      }
      if (method === 'GET' && path === '/v1/health') {
        json(res,200,{ok:true,demo:true,service:'vlc-local-api',version:'v1'}); return;
      }
      if (method === 'GET' && path === '/v1/tutors') {
        json(res,200,store.publicCatalog()); return;
      }
      if (method === 'GET' && path === '/v1/demo/snapshot') {
        const s = store.snapshot();
        json(res,200,{demo:true,revision:s.revision,updatedAt:s.updatedAt,
          bookings:s.state.bookings, reviews:s.state.reviews,
          incidents:s.state.incidents, summary:getSummary(s.state)}); return;
      }
      if (method === 'GET' && path === '/v1/demo/sync') {
        const after = url.searchParams.get('after');
        if (!/^\d+$/.test(after || '')) throw new HttpError(400,'Cursor de revisión inválido.');
        const s = store.snapshot();
        json(res,200,{demo:true,revision:s.revision,changed:Number(after)!==s.revision,
          ...(Number(after)!==s.revision ? {bookings:s.state.bookings,
            reviews:s.state.reviews,incidents:s.state.incidents,
            summary:getSummary(s.state)} : {})});
        return;
      }
      if (method !== 'POST') throw new HttpError(404,'Recurso no disponible.');
      if (!path.startsWith('/v1/demo/')) throw new HttpError(404,'Recurso no disponible.');
      const body = await inputJson(req);
      const version = req.headers['if-match'];
      if (!/^(0|[1-9]\d*)$/.test(version || '')) throw new PreconditionError('Falta If-Match con revisión del servidor.');
      const key = req.headers['idempotency-key'];
      const meta = {revision:Number(version),key,method:path,payload:body};
      let transition;
      let operation;
      if (path === '/v1/demo/bookings') {
        if (Object.keys(body).some(k=>!['tutorId','subject','mode','startsAt'].includes(k))) {
          throw new HttpError(422,'Sólo se admiten campos de la simulación adulta; sin datos personales ni menores.');
        }
        operation='booking.request';
        transition = state => requestClass(state,{
          tutorId:body.tutorId,subject:body.subject,mode:body.mode,startsAt:body.startsAt,
          audience:'adult',requesterId:'adult-demo',requesterRole:'adult',consent:true,
        });
      } else if (path === '/v1/demo/reset') {
        operation='demo.reset';
        transition = state => createEmptyMarketplace(state.tutors);
      } else {
        const match=path.match(/^\/v1\/demo\/bookings\/(vlc-demo-\d+)\/(decision|reschedule|complete|review|incident)$/);
        if (!match) throw new HttpError(404,'Operación desconocida.');
        const [,id,action]=match;
        const state=store.snapshot().state;
        const booking=state.bookings.find(b=>b.id===id);
        if (!booking) throw new HttpError(404,'Clase ficticia no encontrada.');
        // Identidades NO autenticadas: roles son simulados por el servidor LOCAL.
        switch(action) {
          case 'decision': operation='booking.decide';
            transition = s => decideClass(s,id,booking.tutorId,body.decision); break;
          case 'reschedule': operation='booking.reschedule';
            transition = s => rescheduleClass(s,id,'adult-demo',body.startsAt); break;
          case 'complete': operation='booking.complete_demo';
            transition = s => completeClass(s,id,booking.tutorId,
              new Date(new Date(booking.startsAt).getTime()+booking.durationMinutes*60000+1000)); break;
          case 'review': operation='booking.review';
            transition = s => reviewClass(s,id,'adult-demo',body.stars,body.comment); break;
          case 'incident': operation='booking.report';
            transition = s => reportIncident(s,id,'adult-demo',body.category); break;
        }
      }
      const response=store.mutate({...meta,operation,transition});
      json(res,200,response,{'ETag':String(response.revision)});
    } catch (error) {
      if (error instanceof LabError) { json(res,error.status,{error:error.message,demo:true});return; }
      if (error instanceof ConflictError) {json(res,409,{error:error.message,code:'REVISION_CONFLICT'});return;}
      if (error instanceof PreconditionError) {json(res,428,{error:error.message,code:'PRECONDITION_REQUIRED'});return;}
      if (error instanceof HttpError) {json(res,error.status,{error:error.message});return;}
      if (error instanceof Error && (/inválid|debe |Solo |Esta |El horario|La clase|No puede|Ya existe|Máximo|Puntuación|Se requiere|No se puede|no admite/i).test(error.message)) {
        json(res,422,{error:error.message});return;
      }
      console.error('[vlc-local-demo]',randomUUID(),error);
      json(res,500,{error:'Error interno en el simulador.'});
    }
  });
}
