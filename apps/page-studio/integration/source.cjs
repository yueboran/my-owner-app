'use strict';
// QQ detail/catalog URLs sometimes arrive with a chapter number appended.
function normalizeSource(input){
  let url;try{url=new URL(String(input).trim());}catch{return input;}
  const match=url.hostname==='book.qq.com'&&url.pathname.match(/^\/book-(?:detail|chapter)\/(\d+)\/(\d+)\/?$/);
  if(match){url.pathname=`/book-read/${match[1]}/${match[2]}`;return url.href;}
  return input;
}
module.exports={normalizeSource};
