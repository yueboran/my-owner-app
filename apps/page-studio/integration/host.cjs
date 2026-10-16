'use strict';
// The source application's files stay byte-for-byte identical to the root copy.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { server: original, engine } = require('../server.cjs');
const {readCatalog}=require('./catalog.cjs');
const {normalizeSource,requireQqSource}=require('./source.cjs');
const {installBrowserRecovery}=require('./browser.cjs');
const {installBqgEngine}=require('./bqg.cjs');
const {searchBook}=require('./search.cjs');
const {readerAuth}=require('./auth.cjs');
const {installSessionPersistence}=require('./session.cjs');
installSessionPersistence(engine);
const originalOpen=engine.open.bind(engine);
engine.open=installBrowserRecovery(engine,url=>originalOpen(requireQqSource(url,{allowBrowse:true})));
for(const name of ['start','update']){
  const operation=engine[name].bind(engine);
  engine[name]=config=>operation({...config,...(config.url?{url:normalizeSource(config.url)}:{})});
}
const originalCatalog=engine.catalog.bind(engine);
engine.catalog=(url,kind)=>{
  if(kind==='bqg')return originalCatalog(url,kind);
  const {parseSource}=require('../lib/capture.cjs');
  const normalized=requireQqSource(url);
  return parseSource(normalized).kind==='qq' ? readCatalog(engine,normalized) : originalCatalog(normalized);
};
const prefix = '/studio-app';
const localOrigin = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/;
const integrationVersion = 'root-migration-v1';
const {TaskQueue}=require('./queue.cjs');
const queue=engine.studioQueue||new TaskQueue(engine);
engine.studioQueue=queue;
installBqgEngine(engine);
engine.start=config=>{if(config.kind!=='bqg')requireQqSource(config.url);return queue.enqueue(config);};
engine.resume=id=>queue.resume(id);
engine.importHtml=async()=>{throw new Error('HTML导入功能已移除，请使用网址抓取。');};
const originalPause=engine.pause.bind(engine);
engine.pause=async()=>{await queue.control('pause');return originalPause();};
const originalUpdate=engine.update.bind(engine);
engine.update=async config=>{
  if(queue.pending.includes(config.id))throw new Error('请先将任务移出队列，再编辑。');
  return originalUpdate(config);
};
let studioToken;
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (!pathname.startsWith(prefix + '/')) return original.emit('request', req, res);
  const origin = req.headers.origin;
  if (!/^(?:127\.0\.0\.1|localhost):\d+$/.test(req.headers.host || '') || (origin && !localOrigin.test(origin))) {
    return json(res, 403, { error: '仅允许本机项目页面访问。' });
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (pathname === prefix + '/health') return json(res, 200, { version: integrationVersion, queueSupported:true,bqgSupported:true,qqOnly:true,agentSearchSupported:true });
  try {
    if(pathname===prefix+'/api/reader-auth'){
      if(!studioToken||req.headers['x-studio-token']!==studioToken)return json(res,403,{error:'请刷新工作台后重试。'});
      if(req.method!=='GET')return json(res,405,{error:'请求方法不支持。'});
      return json(res,200,await readerAuth(engine));
    }
    if([prefix+'/api/agent-search',prefix+'/api/agent-state'].includes(pathname)){
      if(!studioToken||req.headers['x-studio-token']!==studioToken)return json(res,403,{error:'请刷新工作台后重试。'});
      if(pathname.endsWith('/agent-state')&&req.method==='GET')return json(res,200,{trace:engine.searchTrace||null,busy:!!engine.opening});
      if(!pathname.endsWith('/agent-search')||req.method!=='POST')return json(res,405,{error:'请求方法不支持。'});
      let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw new Error('请求过大。');}
      const input=JSON.parse(body||'{}');
      if(engine.editing)throw new Error('正在保存编辑，请稍候。');
      return json(res,200,await searchBook(engine,{title:input.title,siteUrl:'https://book.qq.com/'}));
    }
    if(pathname===prefix+'/api/bqg/catalog'){
      if(!studioToken||req.headers['x-studio-token']!==studioToken)return json(res,403,{error:'请刷新工作台后重试。'});
      if(req.method!=='POST')return json(res,405,{error:'请求方法不支持。'});
      let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw new Error('请求过大。');}
      const {url}=JSON.parse(body||'{}');
      return json(res,200,await engine.catalog(url,'bqg'));
    }
    if(pathname===prefix+'/api/import')return json(res,410,{error:'HTML导入功能已移除，请使用网址抓取。'});
    if(pathname===prefix+'/api/queue'){
      if(!studioToken||req.headers['x-studio-token']!==studioToken)return json(res,403,{error:'请刷新工作台后重试。'});
      if(pathname.endsWith('/queue')&&req.method==='GET')return json(res,200,queue.snapshot());
      if(req.method!=='POST')return json(res,405,{error:'请求方法不支持。'});
      const limit=4096;
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>limit)throw new Error('请求文件过大。');chunks.push(chunk);}
      const {action,id}=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
      return json(res,200,await queue.control(action,id));
    }
    if(pathname === prefix + '/api/delete') {
      if(req.method!=='POST')return json(res,405,{error:'请求方法不支持。'});
      if(!studioToken || req.headers['x-studio-token']!==studioToken)return json(res,403,{error:'请刷新工作台后重试。'});
      let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw new Error('请求过大。');}
      const {id}=JSON.parse(body);
      if(typeof id!=='string'||! /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id))throw new Error('任务编号无效。');
      if(engine.current||engine.editing||engine.opening||queue.activeId===id)throw new Error('请先暂停正在运行的任务，等待保存完成后再删除。');
      if(queue.pending.includes(id))await queue.control('remove',id);
      const directory=path.resolve(engine.jobsDir,id);
      if(path.dirname(directory)!==path.resolve(engine.jobsDir))throw new Error('任务目录无效。');
      const entry=await fs.lstat(directory);
      if(!entry.isDirectory()||entry.isSymbolicLink())throw new Error('任务目录无效。');
      const recycle=path.join(engine.root,'已删除任务');
      await fs.mkdir(recycle,{recursive:true});
      await fs.rename(directory,path.join(recycle,id+'-'+Date.now()));
      return json(res,200,{message:'任务已删除，文件已移至本机回收目录。'});
    }
    if ([prefix + '/theme.css', prefix + '/bridge.js',prefix+'/queue-ui.js',prefix+'/bqg-ui.js',prefix+'/agent-ui.js',prefix+'/agent.css'].includes(pathname)) {
      const filename = path.basename(pathname);
      const body = await fs.readFile(path.join(__dirname, filename));
      res.writeHead(200, { 'Content-Type': filename.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(body);
    }
    req.url = req.url.slice(prefix.length) || '/';
    // The proxy and iframe are local; preserve the original server's same-origin checks.
    req.headers.host = '127.0.0.1:' + req.socket.localPort;
    if (origin) req.headers.origin = 'http://' + req.headers.host;
    const writeHead = res.writeHead.bind(res);
    res.writeHead = (status, headers) => {
      if (headers && headers['Content-Security-Policy']) {
        headers['Content-Security-Policy'] = headers['Content-Security-Policy'].replace("frame-ancestors 'none'", 'frame-ancestors http://localhost:* http://127.0.0.1:*');
      }
      return writeHead(status, headers);
    };
    const end = res.end.bind(res);
    if(pathname===prefix+'/api/state'){
      res.end=body=>{const state=JSON.parse(body.toString('utf8'));if(state.jobs){state.queue=queue.snapshot();state.searchTrace=engine.searchTrace||null;}return end(JSON.stringify(state));};
    }
    if (pathname === prefix + '/' || pathname === prefix + '/app.js') {
      res.end = (body) => {
        let text = body.toString('utf8');
        if (pathname.endsWith('/app.js')) {
          text = text.replaceAll("'/api/", "'/studio-app/api/").replaceAll("'/download/", "'/studio-app/download/");
          text=text.replaceAll("['online','import']","['online']");
          const importStart=text.indexOf("$('import-button').onclick=");
          const importEnd=text.indexOf("$('pause').onclick=",importStart);
          if(importStart>=0&&importEnd>importStart)text=text.slice(0,importStart)+text.slice(importEnd);
          text=text.replace("$('import-button').disabled=!!current;",'');
          text=text.replace('还没有任务记录。登录浏览器后开始，或导入已有 HTML。','还没有任务记录。填写阅读网址后加入队列。');
        } else {
          studioToken=text.match(/name="studio-token" content="([a-f0-9]+)"/)?.[1];
          text = text.replaceAll('href="/', 'href="/studio-app/').replaceAll('src="/', 'src="/studio-app/');
          text=text.replace(/<button role="tab"[^>]*id="import-tab"[^>]*>.*?<\/button>/,'');
          const importStart=text.indexOf('<div id="import-panel"');
          const importEnd=text.indexOf('</section><section class="activity panel">',importStart);
          if(importStart>=0&&importEnd>importStart)text=text.slice(0,importStart)+text.slice(importEnd);
          text = text.replace('</head>', '<link rel="stylesheet" href="/studio-app/theme.css"><link rel="stylesheet" href="/studio-app/agent.css"><script src="/studio-app/bridge.js" defer></script><script src="/studio-app/queue-ui.js" defer></script><script src="/studio-app/bqg-ui.js" defer></script><script src="/studio-app/agent-ui.js" defer></script></head>');
        }
        return end(text);
      };
    }
    return original.emit('request', req, res);
  } catch (error) {
    if (!res.headersSent) json(res, pathname.startsWith(prefix+'/api/') ? 400 : 500, { error: error.message });
    else res.destroy();
  }
});
async function start(port = Number(process.env.BOOK_PORT || 43824)) {
  if (server.listening) return;
  await engine.init();
  if(!queue.timer)await queue.init();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
  });
}
if (require.main === module) start().then(() => console.log(`书页工坊项目接入服务：http://127.0.0.1:${server.address().port}/studio-app/`)).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { server, engine, queue, start, integrationVersion,bqgSupported:true,qqOnly:true };
