import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { openDemoStore } from './store.mjs';
import { createDemoApiServer } from './api.mjs';

const host = process.env.VLC_DEMO_HOST || '127.0.0.1';
const port = Number(process.env.VLC_DEMO_PORT || '4180');
const filename = resolve(process.env.VLC_DEMO_DB || './.local/vlc-demo.sqlite');
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Puerto inválido');
if (!['127.0.0.1','localhost','::1'].includes(host) && process.env.VLC_ALLOW_LAN_DEMO !== 'I_UNDERSTAND') {
  throw new Error('La API ficticia solo debe escucharse en loopback. VLAN/LAN exige VLC_ALLOW_LAN_DEMO=I_UNDERSTAND');
}
await mkdir(dirname(filename),{recursive:true});
const store = openDemoStore(filename);
const server = createDemoApiServer(store);
server.listen(port,host,()=>console.log(
  'VLC DEMOSTRACIÓN LOCAL — http://'+host+':'+server.address().port+'/sync/ (sin identidades reales)'
));
function shutdown() {server.close(()=>{store.close();process.exit(0);});}
process.on('SIGTERM',shutdown);
process.on('SIGINT',shutdown);
