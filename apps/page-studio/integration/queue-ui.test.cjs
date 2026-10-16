'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {chromium}=require('../node_modules/playwright-core');const {browserPath}=require('../lib/capture.cjs');
test('real browser manages persisted queue and adds jobs while capture is running',{timeout:90000},async()=>{
 const data=await fs.mkdtemp(path.join(os.tmpdir(),'studio-queue-ui-'));
 process.env.BOOK_DATA_DIR=data;
 const host=require('./host.cjs');let browser;
 const ready=host.engine.contextReady.bind(host.engine);
 host.engine.contextReady=async()=>{const context=await ready();if(!context.qqFixture){context.qqFixture=true;await context.route('https://book.qq.com/**',route=>route.fulfill({contentType:'text/html',body:'<html><title>队列真实抓取</title><article><h1>章节</h1>'+Array.from({length:24},(_,i)=>'<p>第'+i+'段，真实排队采集文字。</p>').join('')+'</article></html>'}));}return context;};
 try{
  await host.start(0);const base='http://127.0.0.1:'+host.server.address().port;
  browser=await chromium.launch({executablePath:await browserPath(),headless:true});const page=await browser.newPage({viewport:{width:1450,height:1100}});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/studio-app/');await page.locator('#queue-pause').click();await page.locator('#queue-status').filter({hasText:'队列已暂停'}).waitFor();
  async function add(title){await page.locator('#online-tab').click();await page.locator('#url').fill('https://book.qq.com/book-read/123/1');await page.locator('#title').fill(title);await page.locator('#start').fill('1');await page.locator('#end').fill('2');await page.locator('#start-capture').click();await page.locator('#queue-list strong').filter({hasText:title}).waitFor();}
  await add('队列甲');await add('队列乙');
  await page.locator('#queue-list li').filter({hasText:'队列乙'}).getByRole('button',{name:'上移',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#queue-list strong')?.textContent.includes('队列乙'));
  await add('移出样例');await page.locator('#queue-list li').filter({hasText:'移出样例'}).getByRole('button',{name:'移出队列',exact:true}).click();await page.locator('#queue-list strong').filter({hasText:'移出样例'}).waitFor({state:'hidden'});
  await page.reload();await page.locator('#queue-status').filter({hasText:'队列已暂停'}).waitFor();await page.waitForFunction(()=>document.querySelector('#queue-list strong')?.textContent.includes('队列乙'));
  await page.screenshot({path:path.join(data,'queue-waiting.png'),fullPage:true});
  await page.locator('#queue-run').click();await page.locator('#queue-active').filter({hasText:'队列乙'}).waitFor();await add('运行中新增');
  async function waitForState(check){let state;for(let i=0;i<150;i++){state=await page.evaluate(async()=>await api('state'));if(check(state))return state;await page.waitForTimeout(300);}throw new Error(JSON.stringify({state,errors}));}
  await waitForState(s=>['队列甲','队列乙','运行中新增'].every(title=>s.jobs.some(j=>j.title===title&&j.status==='complete')));
  await page.locator('#completed-count').filter({hasText:/2 \/ 2/}).waitFor();
  assert.equal(await page.getByRole('tab',{name:'导入 HTML'}).count(),0);
  assert.equal(await page.locator('input[type=file]').count(),0);
  const epub=await page.getByRole('link',{name:'下载 EPUB',exact:true}).getAttribute('href');
  const downloaded=await fetch(base+epub);const bytes=Buffer.from(await downloaded.arrayBuffer());assert.equal(bytes.subarray(0,2).toString(),'PK');
  await page.screenshot({path:path.join(data,'queue-desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(data,'queue-mobile.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  const report=await page.evaluate(async()=>{const s=await api('state');return {queue:s.queue,jobs:s.jobs.map(j=>({title:j.title,status:j.status,chapters:j.chapters.length}))};});
  await fs.writeFile(path.join(data,'report.json'),JSON.stringify(report,null,2));console.log('Queue UI evidence:',data);
 }finally{if(browser)await browser.close();host.queue.stop();await host.engine.close();host.server.closeAllConnections();await new Promise(resolve=>host.server.close(resolve));}
});

