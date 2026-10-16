'use strict';
// QQ detail/catalog URLs sometimes arrive with a chapter number appended.
function normalizeSource(input){
  let url;try{url=new URL(String(input).trim());}catch{return input;}
  const match=url.hostname==='book.qq.com'&&url.pathname.match(/^\/book-(?:detail|chapter)\/(\d+)\/(\d+)\/?$/);
  if(match){url.pathname=`/book-read/${match[1]}/${match[2]}`;return url.href;}
  return input;
}
function requireQqSource(input,{allowBrowse=false}={}){
  const normalized=normalizeSource(input);
  let url;try{url=new URL(String(normalized).trim());}catch{throw new Error('请输入完整的QQ阅读网址。');}
  if(!['http:','https:'].includes(url.protocol)||url.hostname!=='book.qq.com'||url.username||url.password)throw new Error('此页面仅支持QQ阅读，请输入 book.qq.com 的网址。');
  if(!allowBrowse&&require('../lib/capture.cjs').parseSource(url.href).kind!=='qq')throw new Error('请填写QQ阅读书籍的详情页、目录页或阅读页网址；首页不能直接读取目录或加入队列。');
  return url.href;
}
module.exports={normalizeSource,requireQqSource};
