export async function experimentRequest(action,payload,signal){
  const response=await fetch('/api/experiment',{method:action?'POST':'GET',credentials:'same-origin',cache:'no-store',signal,headers:action?{'Content-Type':'application/json'}:undefined,body:action?JSON.stringify({action,payload}):undefined});
  const result=await response.json();
  if(!response.ok)throw Object.assign(new Error(result.error??'Não foi possível confirmar a operação.'),{status:response.status});
  return result;
}
