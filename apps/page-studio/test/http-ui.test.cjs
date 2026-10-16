'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');const {chromium}=require('playwright-core');const {browserPath}=require('../lib/capture.cjs');
test('HTTP protections and user-facing HTML import/download flow',{timeout:60000},async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'page-studio-ui-')),cwd=path.resolve(__dirname,'..'),child=spawn(process.execPath,['server.cjs'],{cwd,env:{...process.env,BOOK_PORT:'0',BOOK_NO_OPEN:'1',BOOK_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});let browser;
 try{
  const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('server timeout')),15000);child.stdout.on('data',b=>{const m=b.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});child.once('exit',code=>reject(new Error('server exit '+code)));});
  assert.equal((await fetch(base+'/api/state')).status,403);assert.equal((await fetch(base+'/',{headers:{Origin:'https://untrusted.example'}})).status,403);const html=await(await fetch(base+'/')).text();const token=html.match(/name="studio-token" content="([a-f0-9]+)"/)[1];
  const response=await fetch(base+'/api/start',{method:'POST',headers:{'x-studio-token':token,'content-type':'application/json'},body:JSON.stringify({url:'https://example.com',start:1,end:1})});assert.equal(response.status,400);assert.match((await response.json()).error,/先打开阅读浏览器/);
  browser=await chromium.launch({executablePath:await browserPath(),headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.getByRole('heading',{name:'从阅读页，到一本书。'}).waitFor();await page.screenshot({path:path.join(dir,'界面_空状态.png')});
  await page.getByRole('tab',{name:'导入 HTML'}).click();assert.equal(await page.getByRole('tab',{name:'导入 HTML'}).getAttribute('aria-selected'),'true');const sample=path.join(dir,'输入样例.html');await fs.writeFile(sample,'<meta charset="utf-8"><h1>样例全书</h1><section><h2>第一章 起点</h2><p>第一段：这是正常的中文正文，用于验证电子书转换。</p><p>第二段：我们一起把正确显示的页面按章保存。</p></section><section><h2>第二章 远方</h2><p>第三段：生成一本带有目录的电子书。</p></section>');
  await page.locator('#html-file').setInputFiles(sample);await page.locator('#import-title').fill('界面导入验证');await page.getByRole('button',{name:'转换为分章节电子书'}).click();await page.getByRole('link',{name:'下载 EPUB',exact:true}).waitFor({timeout:30000});
  assert.match(await page.locator('#completed-count').innerText(),/2 \/ 2/);assert.equal(await page.locator('#chapter-list li').count(),2);assert.deepEqual(errors,[]);const downloadLink=await page.getByRole('link',{name:'下载 EPUB',exact:true}).getAttribute('href');const epub=await fetch(base+downloadLink);assert.equal(epub.status,200);assert.equal(Buffer.from(await epub.arrayBuffer()).subarray(0,2).toString(),'PK');
  await page.screenshot({path:path.join(dir,'界面_已完成.png')});await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(dir,'界面_窄屏.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log('UI screenshots:',dir);
 }finally{if(browser)await browser.close();child.kill();}
});
