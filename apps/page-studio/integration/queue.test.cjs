'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {TaskQueue}=require('./queue.cjs');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(check){for(let i=0;i<150;i++){if(await check())return;await sleep(20);}throw new Error('queue wait timed out');}
async function setup(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-queue-'));let concurrent=0,maxConcurrent=0;const order=[];
 const engine={root,jobsDir:path.join(root,'任务'),current:null,open:async()=>{},
  save:async job=>{const dir=path.join(root,'任务',job.id);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'task.json'),JSON.stringify(job));},
  load:async id=>JSON.parse(await fs.readFile(path.join(root,'任务',id,'task.json'),'utf8')),
  run:async job=>{concurrent++;maxConcurrent=Math.max(maxConcurrent,concurrent);order.push(job.title);job.status='running';await engine.save(job);await sleep(50);job.status=job.title==='失败'?'failed':'complete';await engine.save(job);engine.current=null;concurrent--;},
 };
 engine.runImport=engine.run;const queue=new TaskQueue(engine);queue.paused=true;await queue.init();return {queue,engine,order,max:()=>maxConcurrent};
}
const config=title=>({url:'https://example.com/article',title,start:1,end:1});
test('concurrent submissions persist, reorder/remove, and execute online/import jobs serially',async()=>{
 const {queue,engine,order,max}=await setup();
 try{
  const [a,b,c]=await Promise.all(['甲','乙','丙'].map(title=>queue.enqueue(config(title))));
  assert.deepEqual(queue.pending,[a.id,b.id,c.id]);
  await queue.control('top',c.id);await queue.control('down',c.id);assert.deepEqual(queue.pending,[a.id,c.id,b.id]);
  await queue.control('remove',c.id);assert.equal((await engine.load(c.id)).status,'paused');
  const imported=await queue.enqueueImport('/test.html','导入');assert.equal(imported.kind,'import');
  await queue.control('resume');await waitFor(()=>order.length===1);
  const d=await queue.enqueue(config('运行时新增'));assert.ok(queue.pending.includes(d.id));
  await assert.rejects(queue.control('remove',a.id),/已开始/);
  await waitFor(()=>order.length===4&&!queue.working);
  assert.deepEqual(order,['甲','乙','导入','运行时新增']);assert.equal(max(),1);
  assert.deepEqual(JSON.parse(await fs.readFile(queue.file,'utf8')).pending,[]);
 }finally{queue.stop();}
});
test('failed task pauses remaining jobs, explicit resume continues without retrying failure',async()=>{
 const {queue,order,engine}=await setup();
 try{const fail=await queue.enqueue(config('失败')),next=await queue.enqueue(config('后续'));await queue.control('resume');await waitFor(()=>queue.paused&&!queue.working);assert.deepEqual(order,['失败']);assert.deepEqual(queue.pending,[next.id]);assert.equal((await engine.load(fail.id)).status,'failed');await queue.control('resume');await waitFor(()=>order.length===2&&!queue.working);assert.deepEqual(order,['失败','后续']);}finally{queue.stop();}
});
test('restart restores active and pending tasks in order and waits for manual resume',async()=>{
 const {queue,engine,order}=await setup();
 const a=await queue.enqueue(config('恢复中断')),b=await queue.enqueue(config('恢复等待'));queue.stop();
 await fs.writeFile(queue.file,JSON.stringify({activeId:a.id,pending:[b.id],paused:false}));
 const recovered=new TaskQueue(engine);await recovered.init();
 try{assert.equal(recovered.paused,true);assert.deepEqual(recovered.pending,[a.id,b.id]);await sleep(350);assert.deepEqual(order,[]);await recovered.control('resume');await waitFor(()=>order.length===2&&!recovered.working);assert.deepEqual(order,['恢复中断','恢复等待']);}finally{recovered.stop();}
});
test('validation rejects invalid range and pause does not interrupt current work',async()=>{
 const {queue,order}=await setup();
 try{await assert.rejects(queue.enqueue({...config('bad'),end:2}),/单页/);await assert.rejects(queue.enqueue({...config('bad'),start:0}),/范围/);await queue.enqueue(config('当前'));await queue.enqueue(config('等待'));await queue.control('resume');await waitFor(()=>order.length===1);await queue.control('pause');await waitFor(()=>!queue.working);assert.deepEqual(order,['当前']);assert.equal(queue.pending.length,1);}finally{queue.stop();}
});
test('paused capture stays at queue head and can resume before later jobs',async()=>{
 const {queue,engine,order}=await setup();const originalRun=engine.run;
 try{
  engine.run=async job=>{order.push(job.title);job.status='paused';await engine.save(job);engine.current=null;};
  const a=await queue.enqueue(config('暂停任务')),b=await queue.enqueue(config('下一任务'));await queue.control('resume');await waitFor(()=>queue.paused&&!queue.working);
  assert.deepEqual(queue.pending,[a.id,b.id]);engine.run=originalRun;await queue.resume(a.id);await waitFor(()=>order.length===3&&!queue.working);assert.deepEqual(order,['暂停任务','暂停任务','下一任务']);
 }finally{queue.stop();}
});
test('restart does not duplicate partially converted HTML chapters',async()=>{
 const {queue,engine}=await setup();const job=await queue.enqueueImport('/input.html','部分导入');queue.stop();job.chapters=[{number:1,title:'已保存'}];job.status='running';await engine.save(job);await fs.writeFile(queue.file,JSON.stringify({activeId:job.id,pending:[]}));const recovered=new TaskQueue(engine);await recovered.init();
 try{assert.deepEqual(recovered.pending,[]);assert.equal((await engine.load(job.id)).chapters.length,1);await assert.rejects(recovered.resume(job.id),/重新导入/);}finally{recovered.stop();}
});
