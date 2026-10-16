const {test}=require('node:test'),assert=require('node:assert/strict');const {normalizeSource}=require('./source.cjs');const {parseSource}=require('../lib/capture.cjs');
test('QQ detail and catalog links with appended chapter normalize consistently',()=>{
 for(const type of ['detail','chapter']){const result=normalizeSource(`https://book.qq.com/book-${type}/40055543/5`);assert.equal(result,'https://book.qq.com/book-read/40055543/5');assert.equal(parseSource(result).bookId,'40055543');assert.equal(parseSource(result).chapter,5);}
 for(const url of ['https://book.qq.com/book-detail/40055543','https://book.qq.com/book-read/40055543/5','https://example.com/book-detail/40055543/5'])assert.equal(normalizeSource(url),url);
});
const {requireQqSource}=require('./source.cjs');
test('QQ tab permits homepage browsing and requires concrete QQ books for capture',()=>{
 assert.equal(requireQqSource('https://book.qq.com/',{allowBrowse:true}),'https://book.qq.com/');
 assert.throws(()=>requireQqSource('https://book.qq.com/'),/首页/);
 assert.throws(()=>requireQqSource('https://example.com/book/1'),/仅支持QQ阅读/);
 assert.throws(()=>requireQqSource('https://book.qq.com.evil.example/book-read/1/1'),/仅支持QQ阅读/);
 assert.equal(requireQqSource('https://book.qq.com/book-detail/123/5'),'https://book.qq.com/book-read/123/5');
});
