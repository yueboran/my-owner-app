'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright-core');const {browserPath}=require('../lib/capture.cjs');
test('standalone script: different books, inclusive ranges, single chapter, and templates',{timeout:60000},async()=>{
 const script=await fs.readFile(path.join(__dirname,'../scripts/章节范围导出.js'),'utf8');const browser=await chromium.launch({executablePath:await browserPath(),headless:true});
 try{for(const options of [
  {url:'https://book.qq.com/book-read/111111/3',start:3,end:4,title:'第一本测试书'},
  {url:'https://book.qq.com/book-read/222222/8',start:8,end:8,title:'第二本测试书'},
  {url:'https://example.com/novel/55/{n}.html',start:2,end:3,title:'模板测试书',selector:'main'}
 ]){
  const context=await browser.newContext({acceptDownloads:true});const page=await context.newPage();let dialogError=null;page.on('dialog',async d=>{dialogError=d.message();await d.dismiss();});
  await context.route('**/*',route=>{const u=new URL(route.request().url()),n=Number(u.pathname.match(/\/(\d+)(?:\.html)?$/)?.[1]||1);const title=`第${n}章 测试正文`;return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><meta charset="utf-8"><title>${title}</title><h1>${title}</h1><main id="article"><div><p>本章第${n}章：我们一起来阅读，正确的文字应该始终完整保存，不能保存成屏幕外的变形字符。这里是一段足够长的测试正文。</p><p>第二段：一只手摸到椅子靠背。明天我们一起去上海，把正式方案交给经理。</p></div></main><script>for(const p of document.querySelectorAll('p')){p.original=p.innerHTML;p.initHTML=p.original.replace(/[一-仿]/g,c=>String.fromCharCode(c.charCodeAt(0)+1));p.innerHTML=p.initHTML}function update(){for(const p of document.querySelectorAll('p')){const r=p.getBoundingClientRect();p.innerHTML=r.bottom>0&&r.top<innerHeight?p.original:p.initHTML}}addEventListener('scroll',update);update();</script>`});});
  await page.goto(options.url.split('{n}').join(String(options.start)));await page.evaluate(o=>window.QQ_EXPORT_OPTIONS=o,options);
  const downloadPromise=page.waitForEvent('download',{timeout:45000});const execution=page.evaluate(s=>eval(s),script);const download=await downloadPromise;await execution;assert.equal(dialogError,null);
  assert.equal(download.suggestedFilename(),`${options.title}_第${options.start}-${options.end}章.html`);const html=await fs.readFile(await download.path(),'utf8');
  assert.equal((html.match(/<section id="chapter/g)||[]).length,options.end-options.start+1);
  for(let n=options.start;n<=options.end;n++)assert.ok(html.includes(`id="chapter${n}"`));assert.ok(html.includes('一只手摸到椅子靠背'));assert.ok(html.includes(`${options.title} 第${options.start}—${options.end}章`));assert.ok(!html.includes('圈子圈套'));await context.close();
 }
 const page=await browser.newPage();await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<h1>范围校验</h1>'}));await page.goto('https://book.qq.com/book-read/333333/1');
 await page.evaluate(()=>window.QQ_EXPORT_OPTIONS={url:location.href,start:7,end:3,title:'不合法范围'});await assert.rejects(page.evaluate(s=>eval(s),script),/章节范围无效/);assert.equal(await page.locator('iframe').count(),0);
 await page.evaluate(()=>window.QQ_EXPORT_OPTIONS={url:'https://other.example/book/{n}',start:1,end:2,title:'跨站'});await assert.rejects(page.evaluate(s=>eval(s),script),/不能跨站/);
 }finally{await browser.close();}
});
