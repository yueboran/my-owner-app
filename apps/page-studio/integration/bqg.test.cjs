'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {parseBqgSource,chapterToken,cleanParagraphs,isBait,BqgClient,runBqg,installBqgEngine}=require('./bqg.cjs');
const {CaptureEngine}=require('../lib/capture.cjs');
const {newJob}=require('../lib/book.cjs');
const {TaskQueue}=require('./queue.cjs');
const json=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
function fixture(handler){return async(url,options)=>{
 const u=new URL(url);
 if(u.pathname==='/api/book')return json({title:'测试作品',author:'测试作者'});
 if(u.pathname==='/api/booklist')return json({list:Array.from({length:12},(_,i)=>'目录章 '+(i+1))});
 return handler(u,options);
};}
async function engine(){const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-bqg-'));const engine=new CaptureEngine(root);await engine.init();installBqgEngine(engine);return engine;}
const source=parseBqgSource('https://www.bqg308.xyz/#/book/30132/5.html');

test('mirror parsing and token remain compatible with Python importer',()=>{
 assert.equal(source.bookId,30132);assert.equal(source.chapter,5);assert.equal(source.kind,'bqg');
 assert.equal(parseBqgSource('https://bqg726.xyz/#/book/1325').chapter,1);
 assert.equal(chapterToken(1325,1),'gZpAUAAoRagwn59aS7/hNL/JNOK6BnQ29zI0oW7+VRU=');
 for(const url of ['https://bqg308.xyz.evil.test/#/book/1','https://user@bqg308.xyz/#/book/1','ftp://bqg308.xyz/#/book/1','https://bqg308.xyz/','https://bqg308.xyz/#/book/1/0.html'])assert.throws(()=>parseBqgSource(url));
 assert.equal(cleanParagraphs('　甲\r\n\n 乙'),'甲\n\n乙');assert.equal(isBait('大学阿拉伯语专业的学生'),true);assert.equal(isBait('正常正文'),false);
});
test('JSON requests follow mirror origin and recover bait through correction form',async()=>{
 const requests=[],waits=[];
 const client=new BqgClient(source,{wait:async ms=>waits.push(ms),correctionInterval:0,fetchImpl:async(url,options)=>{
  const u=new URL(url);requests.push({u,options});assert.equal(u.origin,source.origin);
  assert.equal(options.headers.Origin,source.origin);assert.equal(options.headers.Referer,source.origin+'/#/book/30132/5.html');
  if(u.pathname==='/api/chapter')return json({txt:'大学阿拉伯语专业的学生',chaptername:'第五章',time:123});
  assert.equal(u.pathname,'/api/action');assert.equal(options.method,'POST');
  const form=new URLSearchParams(options.body);assert.equal(form.get('action'),'chapter_error');assert.equal(form.get('time'),'123');assert.equal(form.get('chapterid'),'5');
  return json({txt:'正文一\n\n<正文二>&'});
 }});
 const chapter=await client.chapter(5,'fallback');
 assert.deepEqual(chapter.text,['正文一','<正文二>&']);assert.equal(chapter.content[1],'<p>&lt;正文二&gt;&amp;</p>');assert.equal(requests.length,2);assert.deepEqual(waits,[]);
});
test('failed API retries have bounded exponential waits; invalid data is not accepted',async()=>{
 const waits=[];let calls=0;
 const client=new BqgClient(source,{wait:async ms=>waits.push(ms),fetchImpl:async()=>{calls++;return new Response('blocked',{status:429});}});
 await assert.rejects(client.get('book'),/429/);assert.equal(calls,4);assert.deepEqual(waits,[750,1500,3000]);
 const invalid=new BqgClient(source,{fetchImpl:async()=>new Response('<html>challenge</html>')});
 await assert.rejects(invalid.request('book'),/有效 JSON/);
});
test('API queue runs without a browser, preserves numeric chapter order and exports real text',async()=>{
 const e=await engine();let active=0,max=0,opened=0;
 e.open=async()=>{opened++;throw new Error('browser must not open');};
 e.bqgClientOptions={fetchImpl:fixture(async(u)=>{
  assert.equal(u.pathname,'/api/chapter');active++;max=Math.max(max,active);
  await new Promise(r=>setTimeout(r,15));active--;
  return json({txt:'正文段落一\n正文段落二'});
 })};
 const queue=new TaskQueue(e);queue.paused=true;await queue.init();
 try{
  const job=await queue.enqueue({kind:'bqg',url:source.url,start:5,end:12});
  await queue.control('resume');
  for(let i=0;i<200&&(queue.working||queue.pending.length);i++)await new Promise(r=>setTimeout(r,15));
  const saved=await e.load(job.id);assert.equal(saved.status,'complete',saved.error);assert.equal(opened,0);assert.equal(max,8);
  assert.deepEqual(saved.chapters.map(c=>c.number),[5,6,7,8,9,10,11,12]);
  const text=await fs.readFile(path.join(e.jobsDir,job.id,saved.artifacts.find(f=>f.endsWith('.txt'))),'utf8');assert.match(text,/正文段落一/);
  const epub=await fs.readFile(path.join(e.jobsDir,job.id,saved.artifacts.find(f=>f.endsWith('.epub'))));assert.equal(epub.subarray(0,2).toString(),'PK');
  assert.match(epub.toString(),/<p>正文段落一<\/p>/);
 }finally{queue.stop();}
});
test('pause persists completed chapters; resume skips saved chapters and handles bad ranges',async()=>{
 const e=await engine();const numbers=[];let phase='pause';
 e.bqgClientOptions={fetchImpl:fixture(async(u)=>{
  const code=cryptoDecode(u.searchParams.get('token'));numbers.push(code.chapterid);
  if(phase==='pause')e.stopRequested=true;
  return json({txt:'完整章节'});
 })};
 const job=newJob({...source,start:5,end:6,title:'暂停测试',format:'mixed'});e.current=job;
 await runBqg(e,job);assert.equal(job.status,'paused');assert.equal(job.chapters.length,1);
 phase='resume';e.stopRequested=false;e.current=job;await runBqg(e,job);
 assert.equal(job.status,'complete');assert.deepEqual(numbers.sort((a,b)=>a-b),[5,6]);
 await assert.rejects(e.update({id:job.id,title:'编辑',url:'https://bqg308.xyz/#/book/2',start:5,end:6}),/当前作品/);
 const edited=await e.update({id:job.id,title:'编辑后',url:'https://bqg726.xyz/#/book/30132',start:5,end:7});assert.equal(edited.kind,'bqg');assert.equal(edited.chapters.length,2);
 const bad=newJob({...source,start:5,end:13,format:'mixed'});e.stopRequested=false;e.current=bad;await runBqg(e,bad);assert.equal(bad.status,'failed');assert.match(bad.error,/超过目录/);assert.equal(e.current,null);
});
function cryptoDecode(token){const crypto=require('node:crypto'),code=crypto.createHash('md5').update('book@token.html').digest('hex'),decipher=crypto.createDecipheriv('aes-128-cbc',Buffer.from(code.slice(16)),Buffer.from(code.slice(0,16)));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(token,'base64')),decipher.final()]).toString());}
