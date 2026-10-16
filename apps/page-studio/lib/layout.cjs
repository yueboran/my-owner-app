'use strict';
const QQ_ROOTS=['#article','.chapter-content','#chapter-content','.epub-content','.reader-content','article','main'];
const BLOCK_SELECTOR='p,table,img,svg,canvas,h1,h2,h3,h4,li,pre';
function sameQqChapter(url,bookId,n){try{const u=new URL(url);return u.hostname==='book.qq.com'&&new RegExp('^/book-read/'+bookId+'/'+n+'/?$').test(u.pathname);}catch{return false;}}
async function candidate(root){
 if(!await root.isVisible())return false;
 return root.evaluate(el=>{
  const rect=el.getBoundingClientRect();if(rect.width<2||rect.height<2)return false;
  const copy=el.cloneNode(true);copy.querySelectorAll('script,style,iframe').forEach(e=>e.remove());
  const text=copy.textContent.trim();
  const pending=/^(?:正在加载|加载中|请稍候|loading)[.。…\s!！]*$/i.test(text);
  const image=[...el.querySelectorAll('img')].some(i=>{const r=i.getBoundingClientRect();return (i.currentSrc||i.getAttribute('src')||i.getAttribute('srcset'))&&r.width>10&&r.height>10;});
  const graphic=[...el.querySelectorAll('svg,canvas')].some(i=>{const r=i.getBoundingClientRect();return r.width>30&&r.height>30;});
  return (!!text&&!pending)||image||graphic;
 });
}
async function findRoot(page,job){
 const selectors=job.selector?[job.selector]:job.kind==='qq'?QQ_ROOTS:['article','main','[role="main"]'];
 const scopes=[page.mainFrame()];
 for(const frame of page.frames()){
  if(frame===page.mainFrame())continue;
  try{const host=await frame.frameElement();const belongs=await host.evaluate(el=>!!el.closest('#article,.chapter-content,#chapter-content,.epub-content,.reader-content,article,main'));await host.dispose();if(belongs)scopes.push(frame);}catch{}
 }
 for(const frame of scopes){
  const list=frame===page.mainFrame()?selectors:[...selectors,'body'];
  for(const selector of list){const roots=frame.locator(selector);for(let i=0;i<Math.min(await roots.count(),5);i++){const root=roots.nth(i);if(await candidate(root))return root;}}
 }
 return null;
}
async function gateReason(page){
 return page.evaluate(()=>{
  const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
  const controls=[...document.querySelectorAll('button,a,[role="button"],[role="dialog"]')].filter(visible).map(e=>e.innerText?.trim()||'');
  if(controls.some(t=>/^(?:登录订阅本章|订阅本章|购买本章|解锁本章|登录后阅读)$/.test(t)))return 'access';
  if(controls.some(t=>/^(?:请完成验证|完成验证|安全验证|验证码验证)$/.test(t)))return 'verification';
  return null;
 });
}
async function layoutInfo(page){
 const frames=[];for(const frame of page.frames())try{frames.push(await frame.evaluate(()=>({url:location.href.split('?')[0],title:document.title,headings:[...document.querySelectorAll('h1,h2')].slice(0,6).map(e=>e.innerText.trim()),roots:[...document.querySelectorAll('#article,.chapter-content,#chapter-content,.epub-content,.reader-content,article,main')].slice(0,12).map(e=>({tag:e.tagName,id:e.id,className:String(e.className).slice(0,120),textLength:e.innerText?.trim().length||0,paragraphs:e.querySelectorAll('p').length,images:e.querySelectorAll('img').length,frames:e.querySelectorAll('iframe').length}))})));}catch{}
 return {url:page.url().split('?')[0],frames};
}
module.exports={QQ_ROOTS,BLOCK_SELECTOR,sameQqChapter,findRoot,gateReason,layoutInfo};
