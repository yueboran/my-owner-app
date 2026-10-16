'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
test('project adapter preserves original authentication, routes and standalone UI', {timeout:20000}, async()=>{
 const data=await fs.mkdtemp(path.join(os.tmpdir(),'studio-remigration-'));
 const child=spawn(process.execPath,['integration/host.cjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,BOOK_PORT:'0',BOOK_DATA_DIR:data},stdio:['ignore','pipe','pipe']});
 try{
  const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('startup timeout')),10000);child.stdout.on('data',chunk=>{const m=chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});child.once('exit',code=>{clearTimeout(timer);reject(new Error('host exit '+code));});});
  assert.equal((await fetch(base+'/studio-app/health')).status,200);
  assert.equal((await fetch(base+'/studio-app/health',{headers:{Origin:'https://evil.example'}})).status,403);
  const embedded=await fetch(base+'/studio-app/');const html=await embedded.text();
  assert.match(html,/src="\/studio-app\/app.js"/);assert.match(html,/theme.css/);
  assert.match(embedded.headers.get('content-security-policy'),/frame-ancestors http:\/\/localhost:\*/);
  const token=html.match(/name="studio-token" content="([a-f0-9]+)"/)[1];
  assert.equal((await fetch(base+'/studio-app/api/state')).status,403);
  const state=await fetch(base+'/studio-app/api/state',{headers:{'x-studio-token':token,Origin:'http://localhost:3000'}});
  assert.equal(state.status,200);assert.deepEqual((await state.json()).jobs,[]);
  const id='12345678-1234-1234-1234-123456789abc';
  const directory=path.join(data,'任务',id);await fs.mkdir(directory,{recursive:true});
  await fs.writeFile(path.join(directory,'task.json'),JSON.stringify({id,title:'删除测试',status:'complete',createdAt:new Date().toISOString(),chapters:[],artifacts:['test.epub']}));
  await fs.writeFile(path.join(directory,'test.epub'),'preserved');
  const remove=(payload,headers={})=>fetch(base+'/studio-app/api/delete',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(payload)});
  assert.equal((await remove({id})).status,403);
  assert.equal((await remove({id:'../outside'},{'x-studio-token':token})).status,400);
  assert.equal((await remove({id},{'x-studio-token':token})).status,200);
  await assert.rejects(fs.access(directory));
  const recycled=await fs.readdir(path.join(data,'已删除任务'));
  assert.equal(await fs.readFile(path.join(data,'已删除任务',recycled[0],'test.epub'),'utf8'),'preserved');
  const after=await(await fetch(base+'/studio-app/api/state',{headers:{'x-studio-token':token}})).json();assert.deepEqual(after.jobs,[]);
  const script=await(await fetch(base+'/studio-app/app.js')).text();
  assert.match(script,/\/studio-app\/api\//);assert.match(script,/\/studio-app\/download\//);
  const standalone=await fetch(base+'/');assert.match(await standalone.text(),/src="\/app.js"/);
  assert.match(standalone.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 }finally{child.kill();}
});
