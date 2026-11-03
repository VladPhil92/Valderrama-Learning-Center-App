import { parsePublicCatalog, type CatalogSnapshot } from './catalog';

const configuredUrl = process.env.EXPO_PUBLIC_VLC_API_URL?.trim() ?? '';

export type DemoBooking = {
  id: string;
  tutorId: string;
  subject: string;
  mode: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'on_hold';
  startsAt: string;
};
export type DemoSnapshot = {
  demo: true;
  revision: number;
  bookings: DemoBooking[];
  summary: {pending:number;confirmed:number;completed:number;incidents:number};
};

export function isApiConfigured(): boolean {
  return configuredUrl.length > 0;
}

function endpoint(path: string): string {
  if (!configuredUrl) throw new Error('API todavía no configurada');
  let url: URL;
  try { url = new URL(configuredUrl); } catch { throw new Error('URL de API inválida'); }
  // El emulador Android conecta al host local por 10.0.2.2.
  const developmentHost = ['localhost','127.0.0.1','10.0.2.2','10.0.3.2'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && __DEV__ && developmentHost)) {
    throw new Error('HTTPS obligatorio fuera del entorno de desarrollo local.');
  }
  return new URL(path.replace(/^\//,''),url.toString().replace(/\/?$/,'/')).toString();
}

async function apiJson(path: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(),8000);
  try {
    const response=await fetch(endpoint(path),{
      method:'GET',headers:{Accept:'application/json',...init?.headers},
      signal:controller.signal,...init,
    });
    const data: unknown = await response.json();
    if (!response.ok) {
      const body = data && typeof data === 'object' ? data as Record<string,unknown> : {};
      throw new Error(typeof body.error === 'string' ? body.error : 'Servicio no disponible');
    }
    return data;
  } finally { clearTimeout(timeout); }
}

/** Mismo GET /v1/tutors para web, Android e iOS. */
export async function getPublicTutorCatalog(): Promise<CatalogSnapshot> {
  return parsePublicCatalog(await apiJson('/v1/tutors'));
}

export async function getDemoSnapshot(): Promise<DemoSnapshot> {
  const raw=await apiJson('/v1/demo/snapshot');
  if (!raw || typeof raw !== 'object') throw new Error('Sincronización inválida');
  const data=raw as Record<string,unknown>;
  if (data.demo !== true || !Number.isSafeInteger(data.revision) ||
      !Array.isArray(data.bookings) || !data.summary || typeof data.summary !== 'object') {
    throw new Error('Servicio no es un entorno de prueba válido');
  }
  // Solamente vista demostrativa. La autorización real estará en servidor.
  return data as DemoSnapshot;
}

/** La clave es de deduplicación de demostración, no una credencial. */
function newDemoRequestKey(): string {
  return 'vlc-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,13);
}

export async function sendDemoCommand(
  path: string, revision: number, payload: Record<string,unknown>,
): Promise<void> {
  if (!path.startsWith('/v1/demo/')) throw new Error('Acción fuera del sandbox');
  const result=await apiJson(path,{
    method:'POST',
    headers:{
      'Content-Type':'application/json','If-Match':String(revision),
      'Idempotency-Key':newDemoRequestKey(),
    },
    body:JSON.stringify(payload),
  });
  if (!result || typeof result !== 'object' || (result as Record<string,unknown>).demo !== true) {
    throw new Error('La operación no fue confirmada por el sandbox');
  }
}
