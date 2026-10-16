'use strict';
const {parseSource}=require('../lib/capture.cjs');
const {normalizeSource}=require('./source.cjs');
async function readCatalog(engine, url) {
  if(engine.current || engine.opening) throw new Error('请等待当前操作结束。');
  const source=parseSource(normalizeSource(url)), page=engine.reader;
  if(!page || page.isClosed()) throw new Error('请先打开阅读浏览器并完成登录。');
  if(source.kind !== 'qq') return engine.catalog(url);
  if(parseSource(normalizeSource(page.url())).bookId !== source.bookId) throw new Error('浏览器中的书籍与输入网址不一致，请重新打开阅读浏览器。');
  const target=`https://book.qq.com/book-chapter/${source.bookId}`;
  if(new URL(page.url()).pathname !== new URL(target).pathname) {
    await page.goto(target,{waitUntil:'domcontentloaded',timeout:45000});
  }
  const selector=`a[href*="/book-read/${source.bookId}/"]`;
  try { await page.locator(selector).first().waitFor({state:'attached',timeout:15000}); }
  catch { throw new Error('目录页未加载到章节链接，请检查阅读浏览器中的登录、验证或网络提示后重试。'); }
  // A chapter list may be hydrated after the initial document has loaded.
  return page.evaluate(bookId=>{
    const chapters=new Map();
    for(const a of document.querySelectorAll('a[href]')) {
      const u=new URL(a.href,location.href);
      const match=u.pathname.match(new RegExp('^/book-read/'+bookId+'/(\\d+)/?$'));
      if(u.hostname==='book.qq.com' && match && Number(match[1])>0) {
        const number=Number(match[1]);
        chapters.set(number,{number,title:a.innerText.trim(),url:u.href});
      }
    }
    const list=[...chapters.values()].sort((a,b)=>a.number-b.number);
    return {title:document.querySelector('h1')?.innerText.trim()||document.title,total:Math.max(0,...list.map(c=>c.number)),chapters:list};
  },source.bookId);
}
module.exports={readCatalog};
