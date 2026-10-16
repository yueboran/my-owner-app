'use strict';
// Port of ebook-ai-studio/server/bqg_import.py's JSON API adapter (no HTML fetching).
const crypto=require('node:crypto');
const path=require('node:path');
const {performance}=require('node:perf_hooks');
const {buildBook,esc}=require('../lib/book.cjs');
const HOSTS=new Set(['bqg726.xyz','www.bqg726.xyz','bqg308.xyz','www.bqg308.xyz',...(process.env.BQG_EXTRA_HOSTS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)]);
const CONCURRENCY=8,RETRIES=4,CORRECTION_INTERVAL=5000;
const BAIT=['大学阿拉伯语专业的学生','全班一共３０人','典型东北大汉的身材'];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let correctionSerial=Promise.resolve(),lastCorrection=-Infinity;

function parseBqgSource(input){
 let url;try{url=new URL(String(input).trim());}catch{throw new Error('请输入完整的笔趣阁作品或章节链接。');}
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||!HOSTS.has(url.hostname))throw new Error('不支持此笔趣阁域名，请使用 bqg308.xyz、bqg726.xyz 或已配置的镜像域名。');
 const target=url.hash?url.hash.slice(1):url.pathname;
 const match=target.match(/^\/?book\/(\d+)(?:\/(\d+)(?:\.html)?)?\/?$/);
 if(!match||!Number.isSafeInteger(Number(match[1]))||Number(match[1])<1||match[2]&&(!Number.isSafeInteger(Number(match[2]))||Number(match[2])<1))throw new Error('请粘贴具体作品或章节链接，例如 /#/book/30132/5.html。');
 return {kind:'bqg',url:url.href,origin:url.origin,bookId:Number(match[1]),chapter:Number(match[2]||1)};
}
function validateRange(start,end){if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>10000||end-start>1999)throw new Error('章节范围无效；每次最多2000章。');}
function chapterToken(bookId,chapterId){
 const code=crypto.createHash('md5').update('book@token.html').digest('hex');
 const cipher=crypto.createCipheriv('aes-128-cbc',Buffer.from(code.slice(16)),Buffer.from(code.slice(0,16)));
 return Buffer.concat([cipher.update(JSON.stringify({id:bookId,chapterid:chapterId})),cipher.final()]).toString('base64');
}
function cleanParagraphs(text){return String(text??'').replace(/\r/g,'').split('\n').map(s=>s.replace(/[\u00a0\u3000]+/g,' ').trim()).filter(Boolean).join('\n\n');}
function isBait(text){return BAIT.some(s=>text.includes(s))||(text.toLowerCase().match(/(?:bq\d+|81cnn|chaoji\d*)[^\n]{0,8}c+c?/g)||[]).length>=2;}
class BqgClient{
 constructor(source,{fetchImpl=globalThis.fetch,wait=sleep,correctionInterval=CORRECTION_INTERVAL}={}){this.source=source;this.fetch=fetchImpl;this.wait=wait;this.correctionInterval=correctionInterval;}
 async request(endpoint,{method='GET',params,form,chapter}={}){
  const url=new URL('/api/'+endpoint,this.source.origin);
  if(params)url.search=new URLSearchParams(params).toString();
  const headers={'User-Agent':'Mozilla/5.0 InkMind authorized importer/2.1','Accept':'application/json'};
  if(chapter){headers.Origin=this.source.origin;headers.Referer=`${this.source.origin}/#/book/${this.source.bookId}/${chapter}.html`;headers['X-Requested-With']='XMLHttpRequest';}
  if(form)headers['Content-Type']='application/x-www-form-urlencoded';
  const response=await this.fetch(url,{method,headers,body:form?new URLSearchParams(form).toString():undefined,signal:AbortSignal.timeout(30000),redirect:'error'});
  if(!response.ok)throw new Error(`笔趣阁接口请求失败（HTTP ${response.status}）。`);
  let data;try{data=await response.json();}catch{throw new Error('笔趣阁接口未返回有效 JSON，镜像可能已变更接口或需要验证。');}
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('笔趣阁接口数据格式无效。');
  return data;
 }
 async get(endpoint,options){for(let attempt=0;attempt<RETRIES;attempt++){try{return await this.request(endpoint,options);}catch(error){if(attempt===RETRIES-1)throw error;await this.wait(750*2**attempt);}}}
 async catalog(){
  const [info,list]=await Promise.all([this.get('book',{params:{id:this.source.bookId}}),this.get('booklist',{params:{id:this.source.bookId}})]);
  if(!Array.isArray(list.list)||!list.list.length)throw new Error('笔趣阁未返回章节目录。');
  return {title:String(info.title||`作品 ${this.source.bookId}`),author:String(info.author||'未知作者'),total:list.list.length,chapters:list.list.map((title,i)=>({number:i+1,title:String(title)}))};
 }
 async corrected(number,title,time){
  const work=correctionSerial.then(async()=>{
   for(let attempt=0;attempt<RETRIES;attempt++){
    const remaining=this.correctionInterval-(performance.now()-lastCorrection);if(remaining>0)await this.wait(remaining);
    try{
     const data=await this.request('action',{method:'POST',chapter:number,form:{action:'chapter_error',bookid:this.source.bookId,chapterid:number,chaptername:title,time}});
     const text=cleanParagraphs(data.txt);if(text&&!isBait(text))return text;
    }catch(error){if(attempt===RETRIES-1)throw error;}finally{lastCorrection=performance.now();}
   }
   throw new Error(`第 ${number} 章纠错接口暂未返回正确正文。`);
  });
  correctionSerial=work.catch(()=>{});return work;
 }
 async chapter(number,fallback){
  const data=await this.get('chapter',{params:{token:chapterToken(this.source.bookId,number)},chapter:number});
  let text=cleanParagraphs(data.txt);const title=String(data.chaptername||fallback);
  if(!text||isBait(text))text=await this.corrected(number,title,Number(data.time)||0);
  const paragraphs=text.split('\n\n');
  return {number,title,encrypted:false,images:[],assets:[],text:paragraphs,content:paragraphs.map(p=>`<p>${esc(p)}</p>`),evidence:[{source:'bqg-json-api',sha256:crypto.createHash('sha256').update(text).digest('hex')}]};
 }
}
async function runBqg(engine,job){
 let saves=Promise.resolve();
 const save=()=>{const result=saves.then(()=>engine.save(job));saves=result.catch(()=>{});return result;};
 try{
  job.status='running';job.error=null;job.message='正在读取笔趣阁作品信息与目录…';await save();
  const client=new BqgClient(parseBqgSource(job.url),engine.bqgClientOptions);
  const catalog=await client.catalog();
  if(job.end>catalog.total)throw new Error(`结束章超过目录范围，当前共 ${catalog.total} 章。`);
  if(!job.title)job.title=catalog.title;job.author=catalog.author;job.catalogTotal=catalog.total;await save();
  const remaining=[];for(let n=job.start;n<=job.end;n++)if(!job.chapters.some(c=>c.number===n))remaining.push(n);
  let cursor=0,failure=null;
  async function worker(){
   while(!engine.stopRequested&&!failure&&cursor<remaining.length){
    const n=remaining[cursor++];
    try{
     const chapter=await client.chapter(n,catalog.chapters[n-1].title);
     job.chapters.push(chapter);job.chapters.sort((a,b)=>a.number-b.number);
     job.message=`笔趣阁正文已保存 ${job.chapters.length} / ${job.end-job.start+1} 章`;await save();
    }catch(error){failure=error;}
   }
  }
  await Promise.all(Array.from({length:Math.min(CONCURRENCY,remaining.length)},worker));
  if(failure)throw failure;
  job.status=engine.stopRequested?'paused':'complete';
 }catch(error){job.status=engine.stopRequested?'paused':'failed';job.error=engine.stopRequested?null:String(error.message);}
 finally{
  try{
   await saves;
   if(job.chapters.length)job.artifacts=await buildBook(job,path.join(engine.jobsDir,job.id));
   job.message=job.status==='complete'?'笔趣阁章节正文已保存，电子书已生成。':job.status==='paused'?'已暂停；完整章节保留，可继续抓取。':'笔趣阁抓取停止；已保存章节保留，可继续或导出。';
  }catch(error){job.status='failed';job.error='电子书导出失败：'+error.message;}
  try{await engine.save(job);}finally{engine.current=null;}
 }
}
function installBqgEngine(engine){
 if(engine.bqgInstalled)return;engine.bqgInstalled=true;
 const catalog=engine.catalog.bind(engine),update=engine.update.bind(engine);
 engine.catalog=async(url,kind)=>kind==='bqg'?new BqgClient(parseBqgSource(url),engine.bqgClientOptions).catalog():catalog(url);
 engine.update=async config=>{
  const job=await engine.load(config.id);if(job.kind!=='bqg')return update(config);
  if(engine.current||engine.opening||engine.editing)throw new Error('请先暂停正在运行的任务，再编辑任务记录。');
  engine.editing=true;
  try{
   const source=parseBqgSource(config.url??job.url),start=Number(config.start??job.start),end=Number(config.end??job.end),title=String(config.title??job.title).trim();
   validateRange(start,end);if(!title||title.length>120)throw new Error('任务名称不能为空，最多120个字符。');
   if(job.chapters.length&&(source.bookId!==job.bookId||job.chapters.some(c=>c.number<start||c.number>end)))throw new Error('新来源与范围必须保留当前作品及已保存的章节。');
   Object.assign(job,source,{start,end,title,error:null,updatedAt:new Date().toISOString(),status:job.chapters.length===end-start+1?'complete':'paused',message:'笔趣阁任务已更新，已保存章节保留。'});
   if(job.chapters.length)job.artifacts=await buildBook(job,path.join(engine.jobsDir,job.id));
   await engine.save(job);return job;
  }finally{engine.editing=false;}
 };
}
module.exports={parseBqgSource,validateRange,chapterToken,cleanParagraphs,isBait,BqgClient,runBqg,installBqgEngine};
