'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright-core');
const {browserPath}=require('../lib/capture.cjs');
const {installSessionPersistence}=require('./session.cjs');
test('session cookies survive browser and engine restart, logout is retained',{timeout:20000},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-session-'));
 const executablePath=await browserPath();
 const make=()=>{
  const engine={root,context:null,async contextReady(){if(this.context)return this.context;const ctx=await chromium.launchPersistentContext(path.join(root,'浏览器会话'),{executablePath,headless:true});this.context=ctx;ctx.on('close',()=>{this.context=null;});return ctx;}};
  installSessionPersistence(engine);return engine;
 };
 let engine=make(),context;
 try{
  context=await engine.contextReady();
  await context.addCookies([{name:'test_session',value:'isolated-test',domain:'.qq.com',path:'/',httpOnly:true,secure:true,sameSite:'Lax'},{name:'unrelated',value:'excluded',domain:'example.com',path:'/'}]);
  await engine.browserSession.save();
  const saved=JSON.parse(await fs.readFile(path.join(root,'浏览器会话','qq-session.json'),'utf8'));
  assert.equal(saved.cookies.length,1);assert.equal(saved.cookies[0].expires,-1);
  // Simulate the native window closing rather than the context.close wrapper.
  const closed=new Promise(resolve=>context.once('close',resolve));
  const cdp=await context.newCDPSession(context.pages()[0]);
  await cdp.send('Browser.close').catch(()=>{});await closed;context=null;
  engine=make();context=await engine.contextReady();
  assert.equal((await context.cookies()).find(c=>c.name==='test_session')?.value,'isolated-test');
  await context.clearCookies();
  await engine.browserSession.save();
  await context.close();context=null;
  engine=make();context=await engine.contextReady();
  assert.equal((await context.cookies()).some(c=>c.name==='test_session'),false);
 }finally{if(context)await context.close();}
});
