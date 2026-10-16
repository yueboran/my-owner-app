'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {chromium}=require('playwright-core'),{browserPath}=require('../lib/capture.cjs');
test('AI search shows live trace in third tab and fills QQ URL without changing queue or Bqg',{timeout:30000},async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'studio-agent-'));
 const child=spawn(process.execPath,['integration/host.cjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,BOOK_PORT:'0',BOOK_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});let browser;
 try{
  const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('startup timeout')),10000);child.stdout.on('data',b=>{const m=b.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});child.once('exit',()=>reject(Error('server exited')));});
  assert.equal((await fetch(base+'/studio-app/api/agent-state')).status,403);assert.equal((await fetch(base+'/studio-app/api/agent-search',{method:'POST',body:'{}'})).status,403);
  const html=await(await fetch(base+'/studio-app/')).text(),token=html.match(/name="studio-token" content="([a-f0-9]+)"/)[1];
  const invalid=await fetch(base+'/studio-app/api/agent-search',{method:'POST',headers:{'x-studio-token':token},body:JSON.stringify({title:''})});assert.equal(invalid.status,400);
  browser=await chromium.launch({executablePath:await browserPath(),headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}});page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/studio-app/');await page.locator('#agent-heading').waitFor();assert.equal(await page.locator('#agent-heading').innerText(),'AI代理搜索');
  assert.ok(await page.evaluate(()=>document.querySelector('#agent-heading').compareDocumentPosition(document.querySelector('#url'))&Node.DOCUMENT_POSITION_FOLLOWING));
  assert.equal(await page.locator('#activity-tabs [role=tab]').count(),3);assert.equal(await page.locator('#bqg-tab').count(),1);
  await page.locator('#activity-tab').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#agent-tab').getAttribute('aria-selected'),'true');assert.equal(await page.locator('#activity-panel').isVisible(),false);
  let release,started;const entered=new Promise(r=>started=r),wait=new Promise(r=>release=r);
  const trace={title:'圈子',status:'running',startedAt:Date.now(),durationMs:null,steps:[{number:1,label:'选择书籍',source:'Laya',status:'running',startedAt:Date.now(),confidence:0.85,operationConfidence:0.9,targetConfidence:0.85,modelLatencyMs:123}]};
  await page.route('**/api/agent-state',route=>route.fulfill({json:{trace}}));
  await page.route('**/api/agent-search',async route=>{assert.deepEqual(route.request().postDataJSON(),{title:'圈子'});started();await wait;await route.fulfill({json:{title:'圈子圈套（全集）',url:'https://book.qq.com/book-read/39429976/1'}});});
  await page.locator('#agent-query').fill('圈子');await page.locator('#agent-search').click();await entered;
  await page.waitForFunction(()=>document.getElementById('trace-steps').textContent.includes('85.0%'));assert.equal(await page.locator('#agent-search').isDisabled(),true);
  trace.steps=Array.from({length:40},(_,i)=>({...trace.steps[0],number:i+1,target:'圈子圈套（全集）'}));
  await page.waitForFunction(()=>document.querySelectorAll('#trace-steps li').length===40);
  const sizes=await page.evaluate(()=>({left:document.querySelector('.source.panel').getBoundingClientRect().height,right:document.querySelector('.activity.panel').getBoundingClientRect().height,scroll:document.getElementById('agent-panel').scrollHeight,visible:document.getElementById('agent-panel').clientHeight}));
  assert.ok(Math.abs(sizes.left-sizes.right)<2);assert.ok(sizes.scroll>sizes.visible);assert.ok(sizes.right<1800);
  await page.locator('#activity-tab').click();const captureHeight=await page.locator('.activity.panel').evaluate(e=>e.getBoundingClientRect().height);await page.locator('#agent-tab').click();assert.ok(Math.abs(captureHeight-sizes.right)<2);
  trace.status='complete';trace.durationMs=500;trace.steps[0].status='complete';trace.steps[0].durationMs=400;release();
  await page.waitForFunction(()=>document.getElementById('url').value==='https://book.qq.com/book-read/39429976/1');assert.equal(await page.locator('#title').inputValue(),'圈子圈套（全集）');
  await page.locator('#queue-tab').click();assert.equal(await page.locator('#queue-panel').isVisible(),true);assert.equal(await page.locator('#agent-panel').isVisible(),false);
  await page.route('**/api/agent-search',route=>route.fulfill({status:400,json:{error:'模型未就绪'}}));await page.locator('#agent-search').click();await page.waitForFunction(()=>document.getElementById('agent-feedback').textContent==='模型未就绪');assert.equal(await page.locator('#url').inputValue(),'https://book.qq.com/book-read/39429976/1');
  await page.screenshot({path:path.join(dir,'AI代理搜索.png'),fullPage:true});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);console.log('Agent UI screenshot:',dir);
 }finally{if(browser)await browser.close();child.kill();}
});
