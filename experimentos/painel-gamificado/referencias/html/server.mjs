import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const allowed=new Map([['/','index.html'],['/index.html','index.html'],['/app.js','app.js'],['/styles.css','styles.css'],['/domain/engine.mjs','domain/engine.mjs'],['/fixtures/stores.mjs','fixtures/stores.mjs'],['/assets/conjunto.svg','assets/conjunto.svg'],['/assets/detalhe.svg','assets/detalhe.svg'],['/assets/camisa.svg','assets/camisa.svg']]);
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
  const name=allowed.get(new URL(req.url,'http://127.0.0.1').pathname);
  if(!name||!['GET','HEAD'].includes(req.method)){res.writeHead(404);res.end('Não encontrado');return;}
  try{const data=await readFile(path.join(root,name));res.writeHead(200,{'Content-Type':mime[path.extname(name)]+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(500);res.end('Não foi possível abrir o protótipo.');}
});
server.listen(3405,'127.0.0.1',()=>console.log('Evolução da loja — experimento local: http://localhost:3405'));
