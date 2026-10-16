const {test}=require('node:test'),assert=require('node:assert/strict');const {normalizeSource}=require('./source.cjs');const {parseSource}=require('../lib/capture.cjs');
test('QQ detail and catalog links with appended chapter normalize consistently',()=>{
 for(const type of ['detail','chapter']){const result=normalizeSource(`https://book.qq.com/book-${type}/40055543/5`);assert.equal(result,'https://book.qq.com/book-read/40055543/5');assert.equal(parseSource(result).bookId,'40055543');assert.equal(parseSource(result).chapter,5);}
 for(const url of ['https://book.qq.com/book-detail/40055543','https://book.qq.com/book-read/40055543/5','https://example.com/book-detail/40055543/5'])assert.equal(normalizeSource(url),url);
});
