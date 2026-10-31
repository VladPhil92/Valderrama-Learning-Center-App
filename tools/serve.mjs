import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('.');
const allowed=new Set([
 '/index.html','/styles.css','/SECURITY.md',
 '/src/app.js','/src/data.js','/src/filters.js',
 '/portal/index.html','/portal/styles.css','/portal/config.js',
 '/portal/app.js','/portal/client.js','/portal/validators.js',
 ...['CODIGO_CONDUCTA.md','REGLAMENTO_INTERNO.md','PRIVACIDAD_BORRADOR.md',
 'PROTECCION_INFANCIA.md','MARCO_LEGAL_COLOMBIA.md','ARQUITECTURA.md',
 'ROADMAP.md','PRODUCTO_MVP.md','FASE1_INSTALACION.md'].map(n=>'/docs/'+n),
]);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.md':'text/plain; charset=utf-8'};
const port=Number(process.env.PORT||4173);
createServer(async(req,res)=>{
 try{
   const url=new URL(req.url,'http://localhost');
   const pathname=decodeURIComponent(url.pathname);
   const path=pathname==='/'?'/index.html':pathname;
   if(!allowed.has(path)){res.writeHead(404).end('Archivo no encontrado');return;}
   let body;
   if(path==='/portal/config.js'){
     const key=process.env.VLC_SUPABASE_PUBLISHABLE_KEY??'';
     if(/service_role|sb_secret_/i.test(key)) throw new Error('Secreto detectado en variable pública');
     body='export const supabaseConfig = '+JSON.stringify({
       url:process.env.VLC_SUPABASE_URL??'',publishableKey:key
     })+';\n';
   }else body=await readFile(resolve(root,'.'+path));
   res.writeHead(200,{'Content-Type':mime[extname(path)],
     'X-Content-Type-Options':'nosniff',
     'Referrer-Policy':'strict-origin-when-cross-origin',
     'Cache-Control':path==='/portal/config.js'?'no-store':'no-cache',
     'Content-Security-Policy':"default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https:; img-src 'self' data:; script-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
   }).end(body);
 }catch(err){console.error(err);res.writeHead(500).end('Error interno');}
}).listen(port,()=>console.log('Valderrama Learning Center http://localhost:'+port));
