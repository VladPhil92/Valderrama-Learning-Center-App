/**
 * Catálogo público tipado y compartido por el contrato HTTP /v1/tutors.
 * Las fichas privadas y datos de menores NO pertenecen al catálogo.
 */
export type PublicTutor = {
  id: string;
  name: string;
  specialty: string;
  subjects: string[];
  levels: string[];
  modes: string[];
};
export type CatalogSnapshot = {
  items: PublicTutor[];
  revision: number;
  source: 'server' | 'demo';
};
function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length < 240;
}
function isStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 30 && value.every(isText);
}
export function parsePublicCatalog(value: unknown): CatalogSnapshot {
  if (!value || typeof value !== 'object') throw new Error('Respuesta de catálogo inválida');
  const record=value as Record<string,unknown>;
  if (!Array.isArray(record.items) || record.items.length > 200) throw new Error('Listado docente inválido');
  if (!Number.isSafeInteger(record.revision) || (record.revision as number) < 0) {
    throw new Error('Versión de datos inválida');
  }
  const items: PublicTutor[]=record.items.map(candidate=>{
    if(!candidate || typeof candidate !== 'object')throw new Error('Docente inválido');
    const item=candidate as Record<string,unknown>;
    if(!isText(item.id)||!isText(item.name)||!isText(item.specialty)||
       !isStrings(item.subjects)||!isStrings(item.levels)||!isStrings(item.modes)){
      throw new Error('Perfil docente público inválido');
    }
    return {id:item.id,name:item.name,specialty:item.specialty,
      subjects:item.subjects,levels:item.levels,modes:item.modes};
  });
  return {items,revision:record.revision as number,
    source:record.demo===true && record.source==='demo' ? 'demo':'server'};
}
