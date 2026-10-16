'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const crypto=require('node:crypto');
const {chromium}=require('playwright-core');
const {buildBook,newJob}=require('./book.cjs');
const {BLOCK_SELECTOR,sameQqChapter,findRoot,gateReason,layoutInfo}=require('./layout.cjs');
const {captureMarkup,prefetchAssets}=require('./mixed.cjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function parseSource(input){
 let url;try{url=new URL(String(input).trim().replace(/[，,。；;]+$/,''));}catch{throw new Error('请输入完整的 http 或 https 网址。');}
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('只接受不含账号密码的 http/https 网址。');
 const href=url.href.replace(/%7Bn%7D/gi,'{n}'),pathname=url.pathname.replace(/%7Bn%7D/gi,'{n}');
 const read=url.hostname==='book.qq.com'&&pathname.match(/^\/book-read\/(\d+)\/(\d+|\{n\})\/?$/);
 const info=url.hostname==='book.qq.com'&&pathname.match(/^\/book-(?:detail|chapter)\/(\d+)\/?$/);
 const qq=read||(info&&[info[0],info[1],'1']);
 return {url:info?`${url.origin}/book-read/${info[1]}/1`:href,bookId:qq?.[1]||null,chapter:qq&&qq[2]!=='{n}'?Number(qq[2]):1,kind:qq?'qq':href.includes('{n}')?'template':'article'};
}
async function browserPath(){
 const choices=[process.env.BOOK_BROWSER,path.join(process.env.PROGRAMFILES||'C:/Program Files','Google/Chrome/Application/chrome.exe'),path.join(process.env['PROGRAMFILES(X86)']||'C:/Program Files (x86)','Microsoft/Edge/Application/msedge.exe'),path.join(process.env.PROGRAMFILES||'C:/Program Files','Microsoft/Edge/Application/msedge.exe')].filter(Boolean);
 for(const file of choices)try{await fs.access(file);return file;}catch{}
 throw new Error('没有找到 Chrome 或 Edge。请先安装其中一个，或设置 BOOK_BROWSER 指向浏览器程序。');
}
class CaptureEngine{
 constructor(root){this.root=root;this.jobsDir=path.join(root,'任务');this.current=null;this.context=null;this.reader=null;this.stopRequested=false;this.opening=null;}
 async init(){await fs.mkdir(this.jobsDir,{recursive:true});await fs.mkdir(path.join(this.root,'浏览器会话'),{recursive:true});}
 async save(job){const dir=path.join(this.jobsDir,job.id);await fs.mkdir(dir,{recursive:true});const data=JSON.stringify(job,null,2),temp=path.join(dir,'task.json.tmp'),target=path.join(dir,'task.json');await fs.writeFile(temp,data);for(let i=0;i<3;i++){try{await fs.rename(temp,target);return;}catch(e){if(!['EPERM','EBUSY','EACCES'].includes(e.code))throw e;await sleep(150*(i+1));}}await fs.writeFile(target,data);}
 async list(){const all=[];for(const id of await fs.readdir(this.jobsDir))try{const j=JSON.parse(await fs.readFile(path.join(this.jobsDir,id,'task.json'),'utf8'));if(['running','exporting'].includes(j.status)&&this.current?.id!==j.id){j.status='paused';j.message='上次程序退出，已保留完整章节，可继续';}all.push(j);}catch{}return all.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
 async load(id){if(!/^[\da-f-]{36}$/.test(id))throw new Error('任务编号无效。');return JSON.parse(await fs.readFile(path.join(this.jobsDir,id,'task.json'),'utf8'));}
 async inspect(){if(!this.reader||this.reader.isClosed())throw new Error('阅读浏览器尚未打开。');const info=await layoutInfo(this.reader);info.content=await this.reader.locator('#article').evaluateAll(els=>els.map(el=>el.outerHTML.slice(0,300000)));return info;}
 async contextReady(){
  if(this.context)return this.context;
  const executablePath=await browserPath();
  this.context=await chromium.launchPersistentContext(path.join(this.root,'浏览器会话'),{executablePath,headless:false,viewport:{width:1100,height:900},deviceScaleFactor:1,args:['--start-maximized']});
  this.context.on('close',()=>{this.context=null;this.reader=null;});return this.context;
 }
 async open(url){if(this.current)throw new Error('正在抓取，请先暂停当前任务。');if(this.opening)throw new Error('浏览器正在打开，请稍候。');const source=parseSource(url);this.opening=this._open(source);try{return await this.opening;}finally{this.opening=null;}}
 async _open(source){const ctx=await this.contextReady();if(!this.reader||this.reader.isClosed())this.reader=ctx.pages()[0]||await ctx.newPage();await this.reader.goto(source.url.split('{n}').join(String(source.chapter)),{waitUntil:'domcontentloaded',timeout:45000});await this.reader.bringToFront();return {message:'浏览器已打开。请在该窗口完成登录或订阅，再回来读取目录或开始抓取。',...source};}
 async catalog(url){
  if(this.current||this.opening)throw new Error('请等待当前操作结束。');const source=parseSource(url);if(!this.reader||this.reader.isClosed())throw new Error('请先打开阅读浏览器并完成登录。');
  if(source.kind==='qq'){
   const pageSource=parseSource(this.reader.url());if(pageSource.bookId!==source.bookId)throw new Error('浏览器中的书籍与输入网址不一致，请重新打开阅读浏览器。');
   const toc=this.reader.getByText('目录',{exact:true});if(await toc.count())try{await toc.first().click({timeout:2500});await sleep(600);}catch{}
  }
  return this.reader.evaluate(({bookId})=>{
   const links=[...document.querySelectorAll('a[href]')].map(a=>({title:a.innerText.trim(),url:a.href}));
   const chapters=bookId?links.filter(a=>a.url.includes('/book-read/'+bookId+'/')).map(a=>({...a,number:Number(a.url.match(/\/(\d+)\/?(?:\?.*)?$/)?.[1])})).filter(a=>a.number>0):[];
   const body=document.body.innerText;const total=Number(body.match(/(?:共|全部|总计)\s*(\d+)\s*章/)?.[1])||Math.max(0,...chapters.map(c=>c.number));
   return {title:document.querySelector('h1')?.innerText.trim()||document.title,total,chapters};
  },{bookId:source.bookId});
 }
 async start(config){
  if(this.current||this.opening)throw new Error('已有任务正在运行。');if(!this.reader||this.reader.isClosed())throw new Error('请先打开阅读浏览器，登录后再开始。');
  const source=parseSource(config.url),start=Number(config.start??source.chapter),end=Number(config.end??start);
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>10000||end-start>1999)throw new Error('章节范围无效；每次最多抓取 2000 章。');
  if(source.kind==='article'&&end!==start)throw new Error('其他网站连续章节请使用含 {n} 的网址模板；普通网址只保存单页。');
  const job=newJob({...source,start,end,title:String(config.title||'').trim(),selector:String(config.selector||'').trim(),author:'',format:'mixed'});
  await this.save(job);this.current=job;this.stopRequested=false;this.run(job).catch(()=>{});return job;
 }
 async resume(id){if(this.current||this.opening)throw new Error('已有任务正在运行。');if(!this.reader||this.reader.isClosed())throw new Error('请先打开阅读浏览器并登录。');const job=await this.load(id);if(job.kind==='import')throw new Error('HTML 导入中断后，请重新导入文件。');if(job.chapters.length===job.end-job.start+1)throw new Error('章节已经完整，无需继续；可以重新导出。');this.current=job;this.stopRequested=false;this.run(job).catch(()=>{});return job;}
 async pause(){if(this.current){this.stopRequested=true;this.current.message='正在完成当前段落后暂停…';}return {message:'暂停请求已接收。'};}
 async run(job){
  try{job.status='running';job.error=null;await this.save(job);
   for(let n=job.start;n<=job.end;n++){
    if(this.stopRequested)break;if(job.chapters.some(c=>c.number===n))continue;
    job.message=`正在加载第 ${n} 章`;job.progress={chapter:n,paragraph:0,total:0};await this.save(job);
    const url=job.kind==='qq'?`https://book.qq.com/book-read/${job.bookId}/${n}`:job.kind==='template'?job.url.split('{n}').join(String(n)):job.url;
    await this.reader.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
    const root=await this.waitForArticle(this.reader,job,n);const ch=await this.captureChapter(this.reader,root,job,n);
    if(!ch)break;job.chapters.push(ch);await this.save(job);if(this.fastCapture===false||job.format!=='mixed')await sleep(500);
   }
   job.status=this.stopRequested?'paused':'complete';job.message=this.stopRequested?'已暂停，完整章节已保存。':'全部章节已完成，正在生成电子书…';await this.save(job);
   if(job.chapters.length){job.artifacts=await buildBook(job,path.join(this.jobsDir,job.id));job.message=job.status==='complete'?'电子书已生成，可下载 EPUB 或 HTML。':'已暂停；已完成章节的电子书也可下载。';}
  }catch(error){job.status=this.stopRequested?'paused':'failed';job.error=this.stopRequested?null:String(error.message).split(/Call log:|\n/)[0].replace(/https?:\/\/\S+/g,'[资源地址已隐藏]');job.message=this.stopRequested?'已暂停；完整章节保留，可继续或导出。':'任务已停止；已完成章节保留，可继续或导出。';}
  finally{try{await this.save(job);}finally{this.current=null;}}
 }
 async waitForArticle(page,job,n){
  const timeout=this.layoutTimeoutMs??45000;
  const started=Date.now();while(Date.now()-started<timeout){
   if(this.stopRequested)throw new Error('任务已请求暂停。');
   if(job.kind==='qq'&&!sameQqChapter(page.url(),job.bookId,n)){await sleep(350);continue;}
   const gate=await gateReason(page);
   if(gate==='access')throw new Error(`第${n}页显示订阅或解锁入口；登录状态与本章阅读权限是不同条件，请确认该页已经可以正常阅读。`);
   if(gate==='verification')throw new Error(`第${n}页显示验证入口，请在阅读浏览器手动完成验证。`);
   const root=await findRoot(page,job);if(root)return root;
   await sleep(350);
  }
  const info=await layoutInfo(page).catch(()=>({url:page.url()}));
  if(job.id){const dir=path.join(this.jobsDir,job.id);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,`第${n}页_排版诊断.json`),JSON.stringify(info,null,2));}
  if(job.kind==='qq'&&!sameQqChapter(page.url(),job.bookId,n))throw new Error(`第${n}页未停留在目标阅读网址，实际地址：${info.url}。可能发生了重定向或章节不存在；没有判定为登录失败。`);
  throw new Error(`第${n}页未找到可见的文字、封面图片或可读取的内嵌正文。页面排版诊断已保存；这不代表未登录。可用“正文区域设置”指定阅读内容区域。`);
 }
 async captureChapter(page,root,job,n){
  await root.evaluate(()=>Promise.race([document.fonts.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('字体加载超时')),15000))]));
  const broken=await root.evaluate(el=>{const used=new Set([el,...el.querySelectorAll('*')].flatMap(e=>getComputedStyle(e).fontFamily.split(',').map(x=>x.trim().replace(/["']/g,''))));return [...document.fonts].filter(f=>f.status==='error'&&used.has(f.family.replace(/["']/g,''))).map(f=>f.family);});if(broken.length)throw new Error('正文字体未能加载：'+broken.join('、')+'。为避免保存乱码，已停止。');
  const meta=await root.evaluate(el=>({encrypted:el.classList.contains('font-encrypt')||[...document.fonts].some(f=>/YWHeiTi|Genuine/i.test(f.family)),title:el.querySelector('h1,h2')?.innerText.trim()||document.querySelector('.chapter-title,h1,h2')?.innerText.trim()||document.title}));
  if(job.kind==='qq'){const title=(await page.title()).match(/_(.+?)在线阅读(?:[-—_]?QQ阅读)?/);if(title?.[1])meta.title=title[1].trim();}
  if(job.format==='mixed'&&meta.encrypted)throw new Error('本章使用字体字符映射，尚未验证文字还原，已停止以避免导出错字；不会自动改为截图版。');
  if(!job.title){job.title=await page.evaluate(isQQ=>document.querySelector('a.book-name,.book-name')?.textContent.trim()||(isQQ?document.title.split('_')[0]:document.title).replace(/第.*章.*$/,'').replace(/[-_—]?QQ阅读.*$/,'').trim(),job.kind==='qq');if(!job.title)job.title='我的电子书';}
  const blocks=root.locator(BLOCK_SELECTOR);
  const items=[];
  const indices=await blocks.evaluateAll((els,selector)=>els.flatMap((el,i)=>el.parentElement?.closest(selector)?[]:[i]),BLOCK_SELECTOR);
  for(const i of indices)items.push(blocks.nth(i));
  // Avoid duplicate captures of images inside paragraphs, or paragraphs inside tables.
  const uncovered=await root.evaluate((el,selector)=>{const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){const p=node.parentElement;if(!node.textContent.trim()||p.closest('script,style,noscript'))continue;if(!p.closest(selector))return true;}return false;},BLOCK_SELECTOR);
  if(!items.length||uncovered){items.length=0;items.push(root);}
  if(job.kind==='qq'&&/^封[面底]$/.test(meta.title)){
   const pictures=root.locator('img');let cover=null,area=0;
   for(let i=0;i<await pictures.count();i++){const pic=pictures.nth(i),box=await pic.boundingBox();if(box&&box.width*box.height>area){cover=pic;area=box.width*box.height;}}
   if(cover&&area>10000){items.length=0;items.push(cover);}
  }
  const dir=path.join(this.jobsDir,job.id,'图片',String(n));await fs.mkdir(dir,{recursive:true});const images=[],text=[],evidence=[],content=[],assets=[];
  const prefetch=job.format==='mixed'&&this.fastCapture!==false?await prefetchAssets(root,path.join(this.jobsDir,job.id),page.context()):null;
  for(let i=0;i<items.length;i++){
   if(this.stopRequested)return null;
   job.message=`第 ${n} 页 · 校验并保存第 ${i+1} / ${items.length} 个内容块`;job.progress={chapter:n,paragraph:i+1,total:items.length};
   const para=items[i];
   if(job.format==='mixed'&&await para.evaluate(el=>el.tagName==='IMG')){
    const markup=await captureMarkup(para,assets,path.join(this.jobsDir,job.id),page.context(),prefetch);if(!markup.includes('<img'))throw new Error(`第${n}页有未能读取的插图，已停止，避免漏图。`);content.push(markup);evidence.push({paragraph:i+1,restored:true,resource:'image'});continue;
   }
   if(!await para.isVisible())continue;
   await para.evaluate(el=>{el.scrollIntoView({block:'center',behavior:'instant'});window.dispatchEvent(new Event('scroll'));});
   let snapshot=null;for(let retry=0,deadline=Date.now()+3800;retry<35||(this.fastCapture!==false&&job.format==='mixed'&&Date.now()<deadline);retry++){
    if(this.fastCapture===false||job.format!=='mixed')await sleep(retry===0?180:100);
    else await para.evaluate(()=>new Promise(resolve=>{let done=false;const finish=()=>{if(!done){done=true;resolve();}};setTimeout(finish,100);requestAnimationFrame(()=>requestAnimationFrame(finish));}));
    snapshot=await para.evaluate(el=>{const rect=el.getBoundingClientRect(),html=el.tagName==='IMG'?el.outerHTML:el.innerHTML;const substituted=[el,...el.querySelectorAll('p')].some(p=>typeof p.initHTML==='string'&&p.innerHTML===p.initHTML&&/[\u4e00-\u4eff]/.test(p.innerHTML));return {html,text:el.innerText,visible:rect.bottom>0&&rect.top<innerHeight,width:rect.width,height:rect.height,substituted};});
    if(snapshot.visible&&!snapshot.substituted){
     if(this.fastCapture!==false&&job.format==='mixed'){
      await sleep(40);const stable=await para.evaluate(el=>({html:el.tagName==='IMG'?el.outerHTML:el.innerHTML,substituted:[el,...el.querySelectorAll('p')].some(p=>typeof p.initHTML==='string'&&p.innerHTML===p.initHTML&&/[\u4e00-\u4eff]/.test(p.innerHTML))}));
      if(stable.html!==snapshot.html||stable.substituted){snapshot=null;continue;}
     }
     break;
    }
   }
   if(!snapshot||snapshot.substituted||!snapshot.visible){await fs.writeFile(path.join(this.jobsDir,job.id,'内容块诊断.json'),JSON.stringify({chapter:n,block:i+1,...snapshot,element:await para.evaluate(el=>({tag:el.tagName,init:el.initHTML,rect:el.getBoundingClientRect().toJSON(),style:getComputedStyle(el).display}))},null,2));throw new Error(`第${n}章第${i+1}段仍是屏幕外变形内容。请保持阅读浏览器打开、检查页面提示后继续。`);}
   const mediaOk=await para.evaluate(async el=>{const imgs=el.tagName==='IMG'?[el]:[...el.querySelectorAll('img')];for(const img of imgs){if(!img.complete)await Promise.race([new Promise(r=>{img.addEventListener('load',r,{once:true});img.addEventListener('error',r,{once:true});}),new Promise(r=>setTimeout(r,10000))]);if(!img.complete||!img.naturalWidth)return false;}return true;});
   if(!mediaOk)throw new Error(`第${n}页第${i+1}个内容块的图片未能加载，已停止，避免保存空白封面。`);
   if(job.format==='mixed'){
    content.push(await captureMarkup(para,assets,path.join(this.jobsDir,job.id),page.context(),prefetch));
    const after=await para.evaluate(el=>el.tagName==='IMG'?el.outerHTML:el.innerHTML);if(after!==snapshot.html)throw new Error(`第${n}页正文在保存时变化，已停止，请继续重试。`);
    if(snapshot.text?.trim())text.push(snapshot.text);
    evidence.push({paragraph:i+1,restored:true,sha256:crypto.createHash('sha256').update(snapshot.html).digest('hex')});continue;
   }
   if(snapshot.width<1||snapshot.height<1)continue;
   if(snapshot.height>16000)throw new Error(`第${n}章第${i+1}段超过图片高度限制，请缩小网页字号后继续。`);
   const file=path.join(dir,String(i+1).padStart(5,'0')+'.png');
   if(await para.evaluate(el=>el.tagName==='IMG')){
    const src=await para.evaluate(el=>el.currentSrc||el.src),response=/^(data:|blob:)/.test(src)?null:await page.context().request.get(src);
    if(response&&!response.ok())throw new Error('封面图片下载失败，未保存。');
    const inline=response?null:await para.evaluate(async el=>{const r=await fetch(el.currentSrc||el.src);return {bytes:[...new Uint8Array(await r.arrayBuffer())],mime:r.headers.get('content-type')};});
    const data=response?await response.body():Buffer.from(inline.bytes),mime=response?(response.headers()['content-type']||'image/jpeg'):inline.mime;
    if(!mime.startsWith('image/'))throw new Error('封面资源不是图片，未保存。');
    const clean=await page.context().newPage();try{await clean.setContent(`<style>body{margin:0}img{display:block;max-width:100%}</style><img src="data:${mime};base64,${data.toString('base64')}">`);await clean.locator('img').screenshot({path:file,type:'png',timeout:30000});}finally{await clean.close();}
   }else await para.screenshot({path:file,type:'png',timeout:30000});
   const after=await para.evaluate(el=>el.tagName==='IMG'?el.outerHTML:el.innerHTML);if(after!==snapshot.html)throw new Error(`第${n}章第${i+1}段在保存时发生变化，本章未标记为完成，请继续重试。`);
   images.push({file:path.relative(path.join(this.jobsDir,job.id),file),width:snapshot.width,height:snapshot.height});
   if(!meta.encrypted&&snapshot.text?.trim())text.push(snapshot.text);
   evidence.push({paragraph:i+1,restored:true,sha256:crypto.createHash('sha256').update(snapshot.html).digest('hex')});
  }
  if(!images.length&&!content.length)throw new Error('没有保存到可见正文段落。');
  return {number:n,title:meta.title||`第${n}页`,encrypted:meta.encrypted,images,text,evidence,...(job.format==='mixed'?{content,assets:assets.map(({source,...a})=>a)}:{})};
 }
 async export(id){if(this.current)throw new Error('请等待当前任务完成或暂停后导出。');const job=await this.load(id);job.artifacts=await buildBook(job,path.join(this.jobsDir,id));await this.save(job);return job;}
 async update(config){
  if(this.current||this.opening||this.editing)throw new Error('请先暂停正在运行的任务，再编辑任务记录。');
  this.editing=true;
  try{
   const job=await this.load(config.id),title=String(config.title??job.title).trim();
   if(!title||title.length>120)throw new Error('任务名称不能为空，最多120个字符。');
   if(job.kind!=='import'){
    const source=parseSource(config.url??job.url),start=Number(config.start??job.start),end=Number(config.end??job.end);
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>10000||end-start>1999)throw new Error('章节范围无效；每次最多2000章。');
    if(source.kind==='article'&&start!==end)throw new Error('普通网址只保存单页；连续章节需使用 {n} 模板。');
    if(job.chapters.length){
     const same=job.kind==='qq'?source.kind==='qq'&&source.bookId===job.bookId:source.kind===job.kind&&source.url===job.url;
     if(!same)throw new Error('已有正文的任务不能改成其他来源，请新建任务。');
     if(job.chapters.some(c=>c.number<start||c.number>end))throw new Error('新范围必须包含已保存的章节；不会删除已抓取内容。');
    }
    Object.assign(job,source,{start,end});
   }
   job.title=title;job.updatedAt=new Date().toISOString();job.error=null;
   job.status=job.chapters.length===job.end-job.start+1?'complete':'paused';
   job.message=job.status==='complete'?'任务已更新，电子书已按新名称生成。':'任务已更新；可继续抓取未完成章节。';
   if(job.chapters.length)job.artifacts=await buildBook(job,path.join(this.jobsDir,job.id));
   await this.save(job);return job;
  }finally{this.editing=false;}
 }
 async importHtml(filename,title){
  if(this.current||this.opening)throw new Error('请先暂停当前任务。');
  const job=newJob({kind:'import',title:title||'导入电子书',url:'本地 HTML',start:1,end:1,author:''});await this.save(job);this.current=job;this.stopRequested=false;
  this.runImport(job,filename).catch(()=>{});return job;
 }
 async runImport(job,filename){
  let ctx;try{
   job.status='running';job.message='正在检查导入文件…';await this.save(job);
   ctx=await chromium.launch({executablePath:await browserPath(),headless:true});const context=await ctx.newContext({javaScriptEnabled:false,viewport:{width:1100,height:900},deviceScaleFactor:1});
   await context.route(/^(https?:|file:)/,route=>{const u=route.request().url();return u===pathToFileURL(filename).href?route.continue():route.abort();});
   const page=await context.newPage();await page.goto(pathToFileURL(filename).href,{waitUntil:'domcontentloaded',timeout:60000});
   // Imported HTML is rendered as supplied. Source scripts and network resources are disabled.
   // It must already be a corrected, self-contained document, not an old scrambled export.
   const roots=page.locator('section');const count=await roots.count();job.end=count||1;
   if(!count){const root=page.locator('article, main, body').first();const ch=await this.captureChapter(page,root,job,1);if(ch)job.chapters.push(ch);}
   else for(let i=0;i<count;i++){
    if(this.stopRequested)break;const section=roots.nth(i);const heading=await section.locator('h1,h2,h3').first().innerText().catch(()=>`第${i+1}章`);const root=await section.locator('[id="article"],article').count()?section.locator('[id="article"],article').first():section;
    const ch=await this.captureChapter(page,root,job,i+1);if(!ch)break;ch.title=heading;job.chapters.push(ch);await this.save(job);
   }
   job.status=this.stopRequested?'paused':'complete';if(job.chapters.length)job.artifacts=await buildBook(job,path.join(this.jobsDir,job.id));job.message=this.stopRequested?'导入已暂停，完整章节保留。':'已按导入文件的实际显示生成分章节电子书。';
  }catch(error){job.status='failed';job.error=error.message;job.message='导入未完成；请查看错误原因。';}
  finally{if(ctx)await ctx.close();await this.save(job);this.current=null;}
 }
 async close(){this.stopRequested=true;if(this.context)await this.context.close();}
}
module.exports={CaptureEngine,parseSource,browserPath};
