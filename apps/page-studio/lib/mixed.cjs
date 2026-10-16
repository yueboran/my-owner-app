'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
function imageFile(src,mime){const ext=({'image/png':'png','image/jpeg':'jpg','image/gif':'gif','image/webp':'webp','image/svg+xml':'svg'})[mime];return ext?'assets/'+require('node:crypto').createHash('sha256').update(src).digest('hex').slice(0,24)+'.'+ext:null;}
async function prefetchAssets(root,dir,context){
 const sources=await root.evaluate(el=>[...new Set([...(el.tagName==='IMG'?[el]:[]),...el.querySelectorAll('img')].filter(i=>!i.closest('nav,aside,.recommend,.recommend-list')&&getComputedStyle(i).display!=='none').map(i=>i.currentSrc||i.src).filter(u=>/^https?:/.test(u)))]);
 const pending=new Map();let next=0;await fs.mkdir(path.join(dir,'assets'),{recursive:true});
 for(const src of sources){let resolve;const promise=new Promise(r=>resolve=r);pending.set(src,{promise,resolve});}
 async function worker(){while(next<sources.length){const src=sources[next++];let value=null;try{const r=await context.request.get(src,{timeout:60000});const mime=(r.headers()['content-type']||'').split(';')[0],file=imageFile(src,mime);if(r.ok()&&file){const data=await r.body();if(data.length){await fs.writeFile(path.join(dir,file),data);value={file,mime,source:src};}}}catch{}pending.get(src).resolve(value);}}
 // Image requests overlap with serial, verified text capture. They never scroll the page.
 const done=Promise.all(Array.from({length:Math.min(3,sources.length)},worker));
 return {pending,done};
}
async function captureMarkup(locator,assets,dir,context,prefetch){
 const block=await locator.evaluate(el=>{
  const skip='script,style,noscript,iframe,nav,button,input,select,textarea,aside,[role="navigation"],[role="button"],.reader-tools,.recommend,.recommend-list';
  const allowed=new Set('p div span strong b em i u s sub sup br hr h1 h2 h3 h4 h5 h6 ul ol li table thead tbody tfoot tr th td blockquote pre code figure figcaption img'.split(' ')),images=[];
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function walk(n){if(n.nodeType===3)return esc(n.textContent);if(n.nodeType!==1||n.matches(skip))return '';const style=getComputedStyle(n);if(style.display==='none'||style.visibility==='hidden')return '';let tag=n.tagName.toLowerCase();if(tag==='canvas')throw Error('正文包含画布，无法直接生成可复制文字。');if(tag==='img'){const src=n.currentSrc||n.src;if(!src)return '';const index=images.length;images.push({src,alt:n.alt||''});return `<img src="__ASSET_${index}__" alt="${esc(n.alt||'插图')}"/>`;}
   if(!allowed.has(tag))tag='div';const attrs=['colspan','rowspan'].filter(a=>n.hasAttribute(a)&&/^\d+$/.test(n.getAttribute(a))).map(a=>` ${a}="${n.getAttribute(a)}"`).join('');const css=[];if(+style.fontWeight>=600)css.push('font-weight:bold');if(style.fontStyle==='italic')css.push('font-style:italic');const attr=attrs+(css.length?` style="${css.join(';')}"`:'');if(tag==='br'||tag==='hr')return `<${tag}/>`;return `<${tag}${attr}>${[...n.childNodes].map(walk).join('')}</${tag}>`;
  }
  return {html:walk(el),images};
 });
 for(let i=0;i<block.images.length;i++){
  const {src}=block.images[i];let asset=assets.find(a=>a.source===src);
  if(!asset&&prefetch?.pending.has(src)){asset=await prefetch.pending.get(src).promise;if(asset&&!assets.some(a=>a.source===src))assets.push(asset);}
  if(!asset){let data,mime;
   // Reuse the already decoded browser image where canvas access is allowed.
   const decoded=await locator.evaluate((el,src)=>{const img=[...(el.tagName==='IMG'?[el]:[]),...el.querySelectorAll('img')].find(i=>(i.currentSrc||i.src)===src);if(!img?.complete||!img.naturalWidth)return null;try{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);return c.toDataURL('image/png').split(',')[1];}catch{return null;}},src);
   if(decoded){data=Buffer.from(decoded,'base64');mime='image/png';}
   else {for(let attempt=0;attempt<3;attempt++){try{if(/^(data:|blob:)/.test(src)){const v=await locator.evaluate(async(_,u)=>{const r=await fetch(u);return{bytes:[...new Uint8Array(await r.arrayBuffer())],mime:r.headers.get('content-type')};},src);data=Buffer.from(v.bytes);mime=v.mime;}else{const r=await context.request.get(src,{timeout:60000});if(!r.ok())throw Error('http');data=await r.body();mime=(r.headers()['content-type']||'').split(';')[0];}if(!/^image\/(png|jpeg|gif|webp|svg\+xml)$/.test(mime))throw Error('type');break;}catch{if(attempt===2)throw Error('正文插图下载失败，已自动重试3次；已完成章节保留，可继续任务。');}}}
   const ext=({'image/png':'png','image/jpeg':'jpg','image/gif':'gif','image/webp':'webp','image/svg+xml':'svg'})[mime];const file='assets/'+require('node:crypto').createHash('sha256').update(src).digest('hex').slice(0,24)+'.'+ext;await fs.mkdir(path.join(dir,'assets'),{recursive:true});await fs.writeFile(path.join(dir,file),data);asset={file,mime,source:src};assets.push(asset);
  }
  block.html=block.html.replace(`__ASSET_${i}__`,asset.file);
 }
 return block.html;
}
module.exports={captureMarkup,prefetchAssets};

