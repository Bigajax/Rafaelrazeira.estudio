exports.revealClick=async(page,selector)=>{
  const element=await page.$(selector);
  if(element)await element.evaluate(target=>{
    for(let ancestor=target.parentElement;ancestor;ancestor=ancestor.parentElement){
      if(ancestor.tagName==='DETAILS'&&ancestor.querySelector(':scope > summary')!==target)ancestor.open=true;
    }
  });
  return page.click(selector);
};
// Background buttons still have rectangles while a native modal makes them
// inert. Text lookup must target the modal, just as a person clicking would.
exports.clickText=async(page,text)=>{
  const modals=await page.$$('dialog[open]'),root=modals.at(-1)??page;
  for(const element of await root.$$('button'))if(await element.evaluate((e,t)=>e.getClientRects().length&&e.textContent.trim()===t,text)){
    await element.click();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));return;
  }
  throw Error('Botão ausente: '+text);
};
