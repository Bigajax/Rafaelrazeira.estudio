import {useEffect,useRef} from 'react';
let openDialogs=0,originalOverflow='';
export default function Dialog({id,className,labelId,onClose,children}){
  const ref=useRef(null),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{const dialog=ref.current,previous=document.activeElement;if(openDialogs===0)originalOverflow=document.body.style.overflow;dialog.showModal();openDialogs++;document.body.style.overflow='hidden';return ()=>{dialog.close();openDialogs=Math.max(0,openDialogs-1);if(openDialogs===0)document.body.style.overflow=originalOverflow;(previous?.isConnected?previous:document.querySelector('#page-title'))?.focus({preventScroll:true});};},[]);
  return <dialog ref={ref} id={id} className={className} aria-labelledby={labelId} onCancel={e=>{e.preventDefault();close.current();}} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();if(e.target===e.currentTarget&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))close.current();}}>{children}</dialog>;
}
