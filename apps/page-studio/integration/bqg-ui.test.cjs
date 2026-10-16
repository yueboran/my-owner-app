'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright-core');
const {browserPath}=require('../lib/capture.cjs');

test('Bqg tab reads JSON catalog, enqueues, downloads text, edits and works on mobile',{timeout:45000},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-bqg-ui-'));process.env.BOOK_DATA_DIR=root;
 const host=require('./host.cjs');let browser;
 const requests=[];
 host.engine.bqgClientOptions={fetchImpl:async(url,options)=>{
  const u=new URL(url);requests.push(u.pathname);let data;
  assert.equal(u.origin,'https://www.bqg308.xyz');
  if(u.pathname==='/api/book')data={title:'笔趣阁接口验收',author:'作者'};
  else if(u.pathname==='/api/booklist')data={list:['第一章','第二章','第三章','第四章','第五章','第六章']};
  else {assert.equal(u.pathname,'/api/chapter');assert.equal(options.headers.Origin,u.origin);data={txt:'直接获取的真实文字格式\n第二段正文'};}
  return new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
 }};
 host.engine.open=async()=>{throw new Error('Bqg must not open browser');};
 try{
  await host.start(0);const base='http://127.0.0.1:'+host.server.address().port;
  browser=await chromium.launch({executablePath:await browserPath(),headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}});page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('UI error:',e.message);});
  await page.goto(base+'/studio-app/');await page.locator('#online-tab').waitFor();
  await page.locator('#online-tab').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#bqg-tab').getAttribute('aria-selected'),'true');assert.equal(await page.locator('#online-panel').isVisible(),false);
  assert.equal(await page.locator('#bqg-panel #open-reader').count(),0);assert.equal(await page.locator('#bqg-panel details').count(),0);
  await page.locator('#bqg-url').fill('https://www.bqg308.xyz/#/book/30132/5.html');await page.locator('#bqg-url').press('Tab');
  assert.equal(await page.locator('#bqg-start').inputValue(),'5');assert.equal(await page.locator('#bqg-end').inputValue(),'5');
  await page.locator('#bqg-catalog').click();await page.locator('#bqg-feedback').filter({hasText:'共 6 章'}).waitFor();assert.equal(await page.locator('#bqg-title').inputValue(),'笔趣阁接口验收');assert.equal(await page.locator('#bqg-end').inputValue(),'6');
  await page.locator('#queue-pause').click();await page.locator('#queue-status').filter({hasText:'队列已暂停'}).waitFor();
  await page.locator('#bqg-submit').click();await page.locator('#queue-list strong').filter({hasText:'笔趣阁接口验收'}).waitFor();
  const queued=await page.evaluate(()=>api('state'));assert.equal(queued.jobs[0].kind,'bqg');assert.equal(queued.jobs[0].start,5);assert.equal(queued.jobs[0].end,6);
  await page.reload();await page.locator('#queue-list strong').filter({hasText:'笔趣阁接口验收'}).waitFor();
  await page.locator('#history-list').getByRole('button',{name:'查看任务',exact:true}).or(page.locator('#history-list').getByRole('button',{name:'当前任务',exact:true})).click();
  assert.equal(await page.locator('#bqg-tab').getAttribute('aria-selected'),'true');
  await page.locator('#queue-run').click();await page.locator('#status-tag').filter({hasText:'已完成'}).waitFor();
  assert.equal(await page.locator('#completed-count').textContent(),'2 / 2 章完成');
  const txt=await page.getByRole('link',{name:'下载 TXT',exact:true}).getAttribute('href');const response=await fetch(base+txt);assert.match(await response.text(),/直接获取的真实文字格式/);
  await page.locator('#history-list').getByRole('button',{name:/^编辑任务：/}).click();await page.locator('#edit-title').fill('笔趣阁重命名');await page.locator('#edit-save').click();await page.locator('#edit-dialog').waitFor({state:'hidden'});await page.locator('#job-title').filter({hasText:'笔趣阁重命名'}).waitFor();
  await page.locator('#export').click();await page.getByRole('link',{name:'下载 EPUB',exact:true}).waitFor();
  const standaloneHtml=await(await fetch(base+'/')).text();assert.doesNotMatch(standaloneHtml,/bqg-ui.js/);
  const evidence=path.resolve(__dirname,'../../../scratch/page-studio-bqg');await fs.mkdir(evidence,{recursive:true});
  await page.screenshot({path:path.join(evidence,'bqg-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(evidence,'bqg-mobile.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(evidence,'ui-report.json'),JSON.stringify({errors,requests,queue:await page.evaluate(()=>api('state')),mobileOverflow:false},null,2));
 }finally{if(browser)await browser.close();host.queue.stop();await new Promise(resolve=>host.server.close(resolve));}
});
