import {mkdir,cp,copyFile,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const out='dist';
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
await Promise.all([
  copyFile('index.html',join(out,'index.html')),
  copyFile('styles.css',join(out,'styles.css')),
  cp('src',join(out,'src'),{recursive:true}),
  cp('docs',join(out,'docs'),{recursive:true}),
  cp('portal',join(out,'portal'),{recursive:true}),
  cp('demo',join(out,'demo'),{recursive:true}),
  copyFile('SECURITY.md',join(out,'SECURITY.md')),
]);
const url=process.env.VLC_SUPABASE_URL ?? '';
const key=process.env.VLC_SUPABASE_PUBLISHABLE_KEY ?? '';
if(key && /service_role|sb_secret_/i.test(key)) throw new Error('Nunca compilar una clave secreta en el navegador.');
const config='export const supabaseConfig = '+JSON.stringify({url,publishableKey:key})+';\n';
await writeFile(join(out,'portal/config.js'),config);
console.log('Dist generado: portada + demo de marketplace + portal Fase 1. Sin backend no hay reservas reales.');
