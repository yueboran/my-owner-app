'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright-core');
const {browserPath}=require('../lib/capture.cjs');
test('authorization hint sits after reader buttons and refreshes without page errors',{timeout:20000},async()=>{
 const data=await fs.mkdtemp(path.join(os.tmpdir(),'studio-auth-ui-'));
 const child=spawn(process.execPath,['integration/host.cjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,BOOK_PORT:'0',BOOK_DATA_DIR:data},stdio:['ignore','pipe','pipe']});
 let browser;
 try{
  const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('startup timeout')),10000);child.stdout.on('data',chunk=>{const match=chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});child.once('exit',()=>{clearTimeout(timer);reject(new Error('host exited'));});});
  browser=await chromium.launch({executablePath:await browserPath(),headless:true});
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/studio-app/');
  await page.locator('#reader-auth-status[data-state="closed"]').waitFor();
  assert.equal(await page.locator('#open-reader + #reader-auth-status').count(),1);
  assert.equal(await page.locator('.book-fields > #catalog').count(),1);
  assert.equal(await page.locator('#browser-status').isVisible(),false);
  await page.evaluate(()=>{notice('浏览器已打开。请在该窗口完成登录或订阅，再回来读取目录或开始抓取。');});
  assert.equal(await page.locator('#action-feedback').isVisible(),false);
  await page.route('**/api/reader-auth',route=>route.fulfill({json:{status:'logged-in',message:'授权状态：已检测到 QQ 阅读登录态'}}));
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.locator('#reader-auth-status[data-state="logged-in"]').waitFor();
  const positions=await page.evaluate(()=>{const a=document.querySelector('#open-reader').getBoundingClientRect(),b=document.querySelector('#reader-auth-status').getBoundingClientRect(),u=document.querySelector('label[for="url"]').getBoundingClientRect(),end=document.querySelector('#end').getBoundingClientRect(),catalog=document.querySelector('#catalog').getBoundingClientRect();return {right:b.x>=a.right,sameRow:Math.abs(a.y-b.y)<a.height,above:a.bottom<=u.top,catalogRight:catalog.x>=end.right};});
  assert.deepEqual(positions,{right:true,sameRow:true,above:true,catalogRight:true});
  await page.route('**/api/reader-auth',route=>route.fulfill({json:{status:'logged-out',message:'授权状态：未登录，请在阅读浏览器完成登录'}}));
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.locator('#reader-auth-status[data-state="logged-out"]').waitFor();
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();child.kill();}
});
