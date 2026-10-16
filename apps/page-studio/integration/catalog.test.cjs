'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('../node_modules/playwright-core');
const {browserPath}=require('../lib/capture.cjs');
const {readCatalog}=require('./catalog.cjs');
test('QQ catalog waits for navigation and delayed links, deduplicates and sorts',async()=>{
 const browser=await chromium.launch({executablePath:await browserPath(),headless:true});
 try{
  const page=await browser.newPage();
  await page.route('https://book.qq.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>目录测试</h1><script>setTimeout(()=>{document.body.insertAdjacentHTML("beforeend",\'<a href="/book-read/123/88">最后一章</a><a href="/book-read/123/1">封面</a><a href="/book-read/123/1">重复</a><a href="/book-read/456/100">其他书</a>\')},100)</script>'}));
  await page.goto('https://book.qq.com/book-read/123/5');
  const engine={reader:page};
  const result=await readCatalog(engine,'https://book.qq.com/book-read/123/5');
  assert.equal(result.total,88);assert.deepEqual(result.chapters.map(c=>c.number),[1,88]);
  assert.match(page.url(),/book-chapter\/123$/);
  assert.equal((await readCatalog(engine,'https://book.qq.com/book-read/123/5')).total,88);
  await assert.rejects(readCatalog(engine,'https://book.qq.com/book-read/456/5'),/不一致/);
  await assert.rejects(readCatalog({reader:null},'https://book.qq.com/book-read/123/5'),/先打开/);
 }finally{await browser.close();}
});
