import {randomBytes} from 'node:crypto';
import {repository,tokenHash,RequestError} from '../../../server/repository.mjs';
import {intelligenceService} from '../../../intelligence/service.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const cookieName='evolution_demo_session';
const token=request=>request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);
const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
const reply=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{...headers,...extra}});
function localOnly(request){if(!['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname))throw new RequestError('Este experimento está disponível somente localmente.',403);}
function failure(error){if(error instanceof RequestError)return reply({error:error.message},error.status);if(error.code?.includes('SQLITE'))return reply({error:'Não foi possível confirmar o salvamento. Seu preenchimento foi mantido.'},503);if(error instanceof SyntaxError)return reply({error:'Não foi possível ler a operação enviada.'},400);return reply({error:error.message||'Não foi possível concluir a operação.'},400);}
export async function GET(request){
  try{
    localOnly(request);const current=token(request);
    if(current&&/^[a-f0-9]{64}$/.test(current)){try{return reply({state:repository().read(tokenHash(current))});}catch(error){if(error.status!==401)throw error;}}
    const next=randomBytes(32).toString('hex');
    return reply({state:repository().create(next)},200,{'Set-Cookie':`${cookieName}=${next}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`});
  }catch(error){return failure(error);}
}
export async function POST(request){
  try{
    localOnly(request);
    if(request.headers.get('origin')!==new URL(request.url).origin)throw new RequestError('Origem da operação inválida.',403);
    const current=token(request);if(!current||!/^[a-f0-9]{64}$/.test(current))throw new RequestError('Atualize a página para iniciar sua sessão.',401);
    if(!request.headers.get('content-type')?.startsWith('application/json'))throw new RequestError('Formato da operação inválido.');
    const reader=request.body?.getReader();if(!reader)throw new RequestError('Operação vazia.');
    let size=0;const chunks=[];while(true){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>2900000){await reader.cancel();throw new RequestError('A imagem excede o limite desta demonstração.',413);}chunks.push(Buffer.from(item.value));}
    const {action,payload}=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new RequestError('Operação inválida.');
    if(action==='assistant')return reply(await intelligenceService()(repository(),tokenHash(current),payload));
    return reply(repository().mutate(tokenHash(current),action,payload));
  }catch(error){return failure(error);}
}
