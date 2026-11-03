import { parsePublicCatalog, type CatalogSnapshot } from './catalog';

const configuredUrl = process.env.EXPO_PUBLIC_VLC_API_URL?.trim() ?? '';

export function isApiConfigured(): boolean {
  return configuredUrl.length > 0;
}

/** Endpoint único y versionado para los tres clientes. Sin credenciales en la app. */
export async function getPublicTutorCatalog(): Promise<CatalogSnapshot> {
  if (!configuredUrl) throw new Error('API todavía no configurada');
  let base: URL;
  try {
    base = new URL(configuredUrl);
  } catch {
    throw new Error('URL del backend incorrecta');
  }
  if (!['https:', 'http:'].includes(base.protocol)) throw new Error('Protocolo de API inválido');
  if (base.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(base.hostname)) {
    throw new Error('Se requiere HTTPS fuera del desarrollo local');
  }
  const endpoint = new URL('v1/tutors', base.toString().replace(/\/?$/, '/'));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const result = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!result.ok) throw new Error('Servicio de docentes no disponible');
    return parsePublicCatalog(await result.json());
  } finally {
    clearTimeout(timeout);
  }
}
