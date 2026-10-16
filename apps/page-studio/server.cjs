'use strict';
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createReadStream}=require('node:fs');const {spawn}=require('node:child_process');
const {CaptureEngine}=require('./lib/capture.cjs');
const root=process.env.BOOK_DATA_DIR?path.resolve(process.env.BOOK_DATA_DIR):path.join(__dirname,'数据'),engine=new CaptureEngine(root),token=crypto.randomBytes(32).toString('hex');
const publicDir=path.join(__dirname,'public');
const summary=j=>j?{id:j.id,kind:j.kind,format:j.format,url:j.url,title:j.title,start:j.start,end:j.end,status:j.status,message:j.message,error:j.error?String(j.error).split(/Call log:|\n/)[0].replace(/https?:\/\/\S+/g,'[资源地址已隐藏]'):null,progress:j.progress,createdAt:j.createdAt,artifacts:j.artifacts,chapters:j.chapters.map(c=>({number:c.number,title:c.title,encrypted:c.encrypted,imageCount:c.images.length}))}:null;
async function body(req,limit=65536){const chunks=[];let size=0;for await(const b of req){size+=b.length;if(size>limit)throw new Error('文件过大。HTML 导入上限为 100 MB，请使用较小的已修复版本。');chunks.push(b);}return Buffer.concat(chunks);}
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
function allowed(req){const host=req.headers.host;return !!host&&/^127\.0\.0\.1:\d+$/.test(host)&&(!req.headers.origin||req.headers.origin===`http://${host}`);}
const server=http.createServer(async(req,res)=>{try{
 if(!allowed(req))return json(res,403,{error:'只允许从本机工作台访问。'});
 const u=new URL(req.url,'http://'+req.headers.host);
 if(req.method==='GET'&&['/','/app.js','/style.css'].includes(u.pathname)){
  const file=u.pathname==='/'?'index.html':u.pathname.slice(1);let data=await fs.readFile(path.join(publicDir,file));if(file==='index.html')data=Buffer.from(data.toString('utf8').replace('__TOKEN__',token));
  res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'"});return res.end(data);
 }
 if(u.pathname.startsWith('/download/')){
  const parts=u.pathname.split('/').slice(2).map(decodeURIComponent);if(parts.length!==2||!/^[-\da-f]{36}$/.test(parts[0]))throw new Error('文件地址无效。');const job=await engine.load(parts[0]);if(!job.artifacts.includes(parts[1]))throw new Error('文件尚未生成。');
  const file=path.join(engine.jobsDir,job.id,parts[1]);const info=await fs.stat(file);res.writeHead(200,{'Content-Length':info.size,'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(parts[1])}`,'X-Content-Type-Options':'nosniff'});return createReadStream(file).pipe(res);
 }
 if(!u.pathname.startsWith('/api/'))return json(res,404,{error:'没有这个地址。'});
 if(req.headers['x-studio-token']!==token)return json(res,403,{error:'工作台已重启，请刷新页面。'});
 if(req.method==='GET'&&u.pathname==='/api/state')return json(res,200,{jobs:(await engine.list()).map(summary),current:summary(engine.current),browserOpen:!!engine.reader&&!engine.reader.isClosed()});
 if(req.method!=='POST')return json(res,405,{error:'请求方法不支持。'});
 if(u.pathname==='/api/import'){
  if(engine.current)throw new Error('已有任务正在运行，请先暂停。');const data=await body(req,100*1024*1024);if(!data.length)throw new Error('文件为空。');
  const uploadDir=path.join(root,'导入');await fs.mkdir(uploadDir,{recursive:true});const filename=path.join(uploadDir,crypto.randomUUID()+'.html');await fs.writeFile(filename,data);
  return json(res,200,await engine.importHtml(filename,u.searchParams.get('title')));
 }
 const data=JSON.parse((await body(req)).toString('utf8')||'{}');let result;
 if(engine.editing)throw new Error('正在保存任务编辑，请稍候。');
 switch(u.pathname){
  case '/api/open':result=await engine.open(data.url);break;
  case '/api/catalog':result=await engine.catalog(data.url);break;
  case '/api/inspect':result=await engine.inspect();break;
  case '/api/start':result=await engine.start(data);break;
  case '/api/pause':result=await engine.pause();break;
  case '/api/resume':result=await engine.resume(data.id);break;
  case '/api/export':result=await engine.export(data.id);break;
  case '/api/update':result=await engine.update(data);break;
  default:return json(res,404,{error:'没有这个操作。'});
 }
 return json(res,200,result);
 }catch(error){if(!res.headersSent)json(res,400,{error:error.message});else res.destroy();}});
async function main(){await engine.init();const requested=Number(process.env.BOOK_PORT||43821);server.listen(requested,'127.0.0.1',()=>{const address=`http://127.0.0.1:${server.address().port}`;console.log(`\n书页工坊已启动：${address}\n任务与电子书保存在：${engine.jobsDir}\n关闭此窗口会停止程序；完整章节会保留。\n`);if(!process.env.BOOK_NO_OPEN)spawn('explorer.exe',[address],{stdio:'ignore',detached:true}).unref();});server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'端口已占用：程序可能已启动，请打开 http://127.0.0.1:'+requested:e.message);process.exitCode=1;});}
process.on('SIGINT',async()=>{await engine.close();server.close();process.exit(0);});
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={server,engine};

