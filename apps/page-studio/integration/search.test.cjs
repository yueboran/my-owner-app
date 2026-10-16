'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {sourceUrl,readingUrl,decide,searchBook,exactBook,matchingBook}=require('./search.cjs');
test('partial title selects the first containing result while preferring a unique full match',()=>{
 const books=[{name:'圈子圈套（全集）'},{name:'你的圈子决定未来'},{name:'圈子'}];
 assert.equal(matchingBook(books.slice(0,2),'圈子'),books[0]);assert.equal(matchingBook(books,'圈子'),books[2]);assert.equal(matchingBook(books,'不存在'),undefined);assert.equal(matchingBook(books,''),null);
});
test('only a unique full title match bypasses ambiguous model selection',()=>{
 const book={name:'圈子圈套（全集）',href:'https://book.qq.com/book-detail/39429976'};
 assert.equal(exactBook([book,{name:'圈套'}],'圈子圈套'),book);
 assert.equal(exactBook([book,book],'圈子圈套'),null);
 assert.equal(exactBook([book],'圈子'),null);
});
test('search clicks and fills input, submits into popup and opens matching detail popup',{timeout:30000},async()=>{
 const {chromium}=require('playwright-core'),{browserPath}=require('../lib/capture.cjs');
 const browser=await chromium.launch({executablePath:await browserPath(),headless:true});
 try{
  const ctx=await browser.newContext();let searched=false;
  const existing=await ctx.newPage();
  // A visible detail page must succeed even if an image never finishes loading.
  await ctx.route('https://slow.example/**',()=>{});
  await ctx.route('https://book.qq.com/**',async route=>{
   const url=new URL(route.request().url());let html;
   if(url.pathname==='/')html='<form action="/so" target="_blank"><input name="q" placeholder="请输入书籍名或作者名"><button id="searchBtn">搜索</button></form><a href="/book-detail/999" title="首页推荐">无关推荐</a>';
   else if(url.pathname==='/so'){searched=url.searchParams.get('q')==='圈子圈套';html='<a href="/book-detail/99" target="_blank" title="圈套">无关书</a><a title="圈子圈套（全集）" href="/book-detail/39429976" target="_blank">会员 圈子圈套（全集） 简介</a>';}
   else html='<h1>圈子圈套（全集）</h1><img src="https://slow.example/pending.png">';
   await route.fulfill({contentType:'text/html; charset=utf-8',body:html});
  });
  const engine={contextReady:async()=>ctx};
  const result=await searchBook(engine,{title:'圈子圈套',siteUrl:'https://book.qq.com/'});
  assert.equal(searched,true);assert.equal(result.title,'圈子圈套（全集）');assert.equal(result.url,'https://book.qq.com/book-read/39429976/1');assert.equal(result.layaUsed,false);assert.equal(engine.opening,null);
  assert.deepEqual(ctx.pages(),[existing]);
  assert.equal(engine.searchTrace.status,'complete');assert.ok(engine.searchTrace.steps.some(s=>s.label==='点击搜索框'));assert.ok(engine.searchTrace.steps.every(s=>s.status==='complete'&&Number.isFinite(s.durationMs)));assert.ok(engine.searchTrace.durationMs>=0);
  const partial=await searchBook(engine,{title:'圈子',siteUrl:'https://book.qq.com/'});
  assert.equal(partial.url,'https://book.qq.com/book-read/39429976/1');assert.equal(partial.layaUsed,false);assert.equal(engine.searchTrace.steps.find(s=>s.label==='选择最相关书籍').source,'首个标题包含搜索词');
  assert.deepEqual(ctx.pages(),[existing]);
  await ctx.route('https://book.qq.com/',route=>route.abort());
  await assert.rejects(searchBook(engine,{title:'失败清理',siteUrl:'https://book.qq.com/'}));
  assert.deepEqual(ctx.pages(),[existing]);assert.equal(engine.opening,null);
 }finally{await browser.close();}
});
test('QQ detail and read URLs become the first reading chapter',()=>{
 assert.equal(readingUrl('https://book.qq.com/book-detail/39429976'),'https://book.qq.com/book-read/39429976/1');
 assert.equal(readingUrl('https://book.qq.com/book-read/40055543/5?from=search'),'https://book.qq.com/book-read/40055543/1');
 for(const url of ['https://evil.example/book-detail/1','https://book.qq.com/','https://book.qq.com/book-detail/1/1'])assert.throws(()=>readingUrl(url));
 assert.throws(()=>sourceUrl('https://book.qq.com.evil.example/'));assert.throws(()=>sourceUrl('https://user:pass@book.qq.com/'));
});

test('detail wait finds popups after three seconds and accepts content before DOMContentLoaded',{timeout:15000},async()=>{
 const {waitForBookDetail}=require('./search.cjs');
 const {chromium}=require('playwright-core'),{browserPath}=require('../lib/capture.cjs');
 const browser=await chromium.launch({executablePath:await browserPath(),headless:true});
 try{
  const ctx=await browser.newContext();
  await ctx.route('https://book.qq.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>目标书籍</h1><script src="https://pending.example/script.js"></script>'}));
  await ctx.route('https://pending.example/**',()=>{});
  const source=await ctx.newPage(),previous=ctx.pages();
  const waiting=waitForBookDetail(ctx,source,previous,'https://book.qq.com/book-detail/123',8000);
  await new Promise(resolve=>setTimeout(resolve,3200));
  const detail=await ctx.newPage();await detail.goto('https://book.qq.com/book-detail/123',{waitUntil:'commit'});
  assert.equal(await waiting,detail);
  assert.equal(await detail.evaluate(()=>document.readyState),'loading');
  const before=ctx.pages();
  await source.goto('https://book.qq.com/book-detail/456',{waitUntil:'commit'});
  assert.equal(await waitForBookDetail(ctx,source,before,'https://book.qq.com/book-detail/456',2000),source);
  await assert.rejects(waitForBookDetail(ctx,source,ctx.pages(),'https://book.qq.com/book-detail/999',200),/详情页超过/);
 }finally{await browser.close();}
});
test('model may select only a supplied target with the expected operation and confidence',async()=>{
 const page={url:()=> 'https://book.qq.com/',title:async()=> 'QQ阅读'},items=[{ref:'search-0',role:'link',name:'圈子圈套'}];
 const response=d=>async()=>({ok:true,json:async()=>d});
 assert.equal((await decide(page,'选择书籍',items,'CLICK','圈子圈套',response({operation:'CLICK',target_ref:'search-0',confidence:0.95}))).name,'圈子圈套');
 for(const d of [{operation:'CLICK',target_ref:'unknown',confidence:1},{operation:'CLICK',target_ref:'search-0',confidence:0.2},{operation:'DONE',target_ref:'search-0',confidence:1}])await assert.rejects(decide(page,'选择书籍',items,'CLICK','书名',response(d)),/可靠识别/);
 await assert.rejects(decide(page,'选择书籍',items,'CLICK','书名',async()=>{throw Error('offline');}),/无法连接 Laya/);
 const row={};await assert.rejects(decide(page,'选择书籍',items,'CLICK','书名',response({operation:'CLICK',target_ref:'search-0',confidence:0.3,operation_confidence:0.7,target_confidence:0.4,latency_ms:123}),row),/可靠识别/);assert.equal(row.confidence,0.3);assert.equal(row.modelLatencyMs,123);assert.equal(row.target,'圈子圈套');
});
test('search validates input and never interrupts an active capture',async()=>{
 await assert.rejects(searchBook({}, {title:'',siteUrl:'https://book.qq.com/'}),/书名/);
 await assert.rejects(searchBook({current:{}}, {title:'圈子圈套',siteUrl:'https://book.qq.com/'}),/暂停抓取/);
});
