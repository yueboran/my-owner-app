'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const safeName=s=>String(s||'电子书').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/,'').slice(0,80)||'电子书';
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(data){let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
// EPUB requires the first entry to be the uncompressed, exact mimetype string.
async function zipStore(filename,entries){
 if(entries.length>65535)throw new Error('图片条目过多，请缩小章节范围、分卷导出。');
 const out=await fs.open(filename+'.tmp','w');let offset=0;const central=[];
 try{for(const entry of entries){const name=Buffer.from(entry.name),data=entry.file?await fs.readFile(entry.file):Buffer.from(entry.data),crc=crc32(data);
  if(offset+data.length>0xffffffff)throw new Error('电子书超过 ZIP 4 GB 限制，请分卷导出。');
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);
  local.writeUInt16LE(33,12);c.writeUInt16LE(33,14);
  await out.write(local);await out.write(name);await out.write(data);offset+=30+name.length+data.length;central.push(c,name);
 }
 const centralOffset=offset;for(const c of central){await out.write(c);offset+=c.length;}
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(offset-centralOffset,12);end.writeUInt32LE(centralOffset,16);await out.write(end);
 }finally{await out.close();}
 await fs.rename(filename+'.tmp',filename);
}
const xhtml=(title,body)=>`<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN"><head><title>${esc(title)}</title><meta charset="utf-8"/><link rel="stylesheet" href="style.css"/></head><body>${body}</body></html>`;
async function buildBook(job,dir){
 const chapters=job.chapters.slice().sort((a,b)=>a.number-b.number);if(!chapters.length)throw new Error('还没有完整抓取的章节，不能导出。');
 const title=job.title||'我的电子书',id='urn:uuid:'+job.id,entries=[{name:'mimetype',data:'application/epub+zip'},{name:'META-INF/container.xml',data:'<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'}];
 let manifest='<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="css" href="style.css" media-type="text/css"/>',spine='',nav='',ncx='',htmlBody='',allText=[];
 const mixed=chapters.every(c=>Array.isArray(c.content));
 const css='body{margin:1em;color:#222;background:#fff;font-family:serif;line-height:1.8}h1{font-size:1.45em;margin:1.5em 0}p{line-height:1.8;text-indent:2em}img{display:block;max-width:100%;height:auto;margin:0 auto 1em;break-inside:avoid}table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #bbb;padding:.4em}nav ol{line-height:2}';
 entries.push({name:'OEBPS/style.css',data:css});
 for(let i=0;i<chapters.length;i++){
  const ch=chapters[i],key='c'+ch.number;let body=`<h1>${esc(ch.title)}</h1>`,html=`<section id="${key}"><h2>${esc(ch.title)}</h2>`;
  if(ch.content){let markup=ch.content.join('\n'),offline=markup;for(let j=0;j<ch.assets.length;j++){const asset=ch.assets[j],data=await fs.readFile(path.join(dir,asset.file)),name=`images/${key}-${j+1}.${asset.file.split('.').at(-1)}`;entries.push({name:'OEBPS/'+name,data});manifest+=`<item id="${key}a${j}" href="${name}" media-type="${esc(asset.mime)}"/>`;markup=markup.split(`src="${asset.file}"`).join(`src="${name}"`);offline=offline.split(`src="${asset.file}"`).join(`src="data:${asset.mime};base64,${data.toString('base64')}"`);}body+=markup;html+=offline;}
  for(let j=0;j<ch.images.length;j++){
   const image=ch.images[j],name=`images/${key}-${j+1}.png`,data=await fs.readFile(path.join(dir,image.file));
   entries.push({name:'OEBPS/'+name,data});manifest+=`<item id="${key}i${j}" href="${name}" media-type="image/png"/>`;
   body+=`<img src="${name}" alt="${esc(ch.title)}，第${j+1}段"/>`;html+=`<img src="data:image/png;base64,${data.toString('base64')}" alt="${esc(ch.title)}，第${j+1}段" loading="lazy"/>`;
  }
  entries.push({name:`OEBPS/${key}.xhtml`,data:xhtml(ch.title,body)});manifest+=`<item id="${key}" href="${key}.xhtml" media-type="application/xhtml+xml"/>`;spine+=`<itemref idref="${key}"/>`;nav+=`<li><a href="${key}.xhtml">${esc(ch.title)}</a></li>`;ncx+=`<navPoint id="${key}" playOrder="${i+1}"><navLabel><text>${esc(ch.title)}</text></navLabel><content src="${key}.xhtml"/></navPoint>`;htmlBody+=html+'</section>';allText.push(ch.title+'\n\n'+ch.text.join('\n\n'));
 }
 entries.push({name:'OEBPS/nav.xhtml',data:xhtml('目录',`<nav epub:type="toc" id="toc"><h1>${esc(title)}</h1><ol>${nav}</ol></nav>`)});
 entries.push({name:'OEBPS/toc.ncx',data:`<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${id}"/></head><docTitle><text>${esc(title)}</text></docTitle><navMap>${ncx}</navMap></ncx>`});
 entries.push({name:'OEBPS/content.opf',data:`<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="zh-CN"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">${id}</dc:identifier><dc:title>${esc(title)}</dc:title><dc:language>zh-CN</dc:language><dc:creator>${esc(job.author||'本地保存')}</dc:creator><dc:description>${mixed?'可复制正文与独立插图，保留章节目录。':'旧版图片电子书，正文不可选择复制。'}</dc:description><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z/,'Z')}</meta></metadata><manifest>${manifest}</manifest><spine toc="ncx">${spine}</spine></package>`});
 const partial=job.status==='complete'?'':'_已完成章节',base=safeName(title)+partial;
 await zipStore(path.join(dir,base+'.epub'),entries);
 const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css}body{max-width:860px;margin:40px auto;padding:0 20px}section{margin-top:3em}h2{font-size:1.4em}</style><h1>${esc(title)}</h1><p>${chapters.length}章 · ${mixed?'可复制文字＋独立插图':'旧版图片正文，无 OCR'}</p><nav><ol>${chapters.map(c=>`<li><a href="#c${c.number}">${esc(c.title)}</a></li>`).join('')}</ol></nav>${htmlBody}</html>`;
 await fs.writeFile(path.join(dir,base+'.html'),html);
 const artifacts=[base+'.epub',base+'.html'];
 if(chapters.every(c=>!c.encrypted)&&chapters.some(c=>c.text.join('').trim())){
  await fs.writeFile(path.join(dir,base+'.txt'),allText.join('\n\n\n'));artifacts.push(base+'.txt');
 }
 await fs.writeFile(path.join(dir,'抓取校验报告.json'),JSON.stringify({version:2,title,source:job.url,capturedAt:job.createdAt,completed:chapters.length,planned:job.end-job.start+1,format:mixed?'text-and-images':'visual-images-without-ocr',notices:[mixed?'正文为真实文字，插图独立保存；无OCR。':'旧版截图任务不会自动转换为文字。','校验确认页面恢复与资源加载，不能替代原文逐字校对。'],chapters:chapters.map(c=>({number:c.number,title:c.title,paragraphs:c.content?.length??c.images.length,encrypted:c.encrypted,evidence:c.evidence}))},null,2));artifacts.push('抓取校验报告.json');
 return artifacts;
}
function newJob(config){return {id:crypto.randomUUID(),createdAt:new Date().toISOString(),status:'ready',chapters:[],artifacts:[],message:'准备开始',...config};}
module.exports={esc,safeName,crc32,zipStore,buildBook,newJob};
