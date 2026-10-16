'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readerAuth,inspectQqLogin}=require('./auth.cjs');
const {chromium}=require('playwright-core');
const {browserPath}=require('../lib/capture.cjs');
test('login inspection distinguishes account state, visible login entry and unknown pages',{timeout:20000},async()=>{
 const browser=await chromium.launch({executablePath:await browserPath(),headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent('<p class="unlogin">登录 | 注册</p>');
  assert.equal(await page.evaluate(inspectQqLogin),'logged-out');
  await page.evaluate(()=>{window.$nuxt={$store:{state:{isLogin:true,userInfo:{nickname:'测试'}}}};document.querySelector('.unlogin').style.display='none';});
  assert.equal(await page.evaluate(inspectQqLogin),'logged-in');
  await page.evaluate(()=>{window.$nuxt.$store.state.isLogin=false;});
  assert.equal(await page.evaluate(inspectQqLogin),'unknown');
  await page.evaluate(()=>document.querySelector('.unlogin').style.display='block');
  assert.equal(await page.evaluate(inspectQqLogin),'logged-out');
 }finally{await browser.close();}
});
test('reader auth only observes existing QQ tabs and handles closed or unreachable pages',async()=>{
 assert.equal((await readerAuth({})).status,'closed');
 const page={isClosed:()=>false,url:()=> 'https://book.qq.com/',evaluate:async()=> 'logged-in'};
 assert.equal((await readerAuth({context:{pages:()=>[page]}})).status,'logged-in');
 assert.equal((await readerAuth({reader:{...page,url:()=> 'https://example.com/'}})).status,'unknown');
 assert.equal((await readerAuth({reader:{...page,isClosed:()=>true}})).status,'closed');
 assert.equal((await readerAuth({reader:{...page,evaluate:async()=>{throw new Error('navigation');}}})).status,'unknown');
});
