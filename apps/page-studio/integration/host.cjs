'use strict';
// The source application's files stay byte-for-byte identical to the root copy.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { server: original, engine } = require('../server.cjs');
const {readCatalog}=require('./catalog.cjs');
const {normalizeSource}=require('./source.cjs');
const {installBrowserRecovery}=require('./browser.cjs');
const originalOpen=engine.open.bind(engine);
engine.open=installBrowserRecovery(engine,url=>originalOpen(normalizeSource(url)));
for(const name of ['start','update']){
  const operation=engine[name].bind(engine);
  engine[name]=config=>operation({...config,...(config.url?{url:normalizeSource(config.url)}:{})});
}
const originalCatalog=engine.catalog.bind(engine);
engine.catalog=url=>{
  const {parseSource}=require('../lib/capture.cjs');
  const normalized=normalizeSource(url);
  return parseSource(normalized).kind==='qq' ? readCatalog(engine,normalized) : originalCatalog(normalized);
};
const prefix = '/studio-app';
const localOrigin = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/;
const integrationVersion = 'root-migration-v1';
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
  if (pathname === prefix + '/health') return json(res, 200, { version: integrationVersion });
  try {
    if(pathname === prefix + '/api/delete') {
      if(req.method!=='POST')return json(res,405,{error:'请求方法不支持。'});
      if(!studioToken || req.headers['x-studio-token']!==studioToken)return json(res,403,{error:'请刷新工作台后重试。'});
      let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw new Error('请求过大。');}
      const {id}=JSON.parse(body);
      if(typeof id!=='string'||! /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id))throw new Error('任务编号无效。');
      if(engine.current||engine.editing||engine.opening)throw new Error('请先暂停正在运行的任务，等待保存完成后再删除。');
      const directory=path.resolve(engine.jobsDir,id);
      if(path.dirname(directory)!==path.resolve(engine.jobsDir))throw new Error('任务目录无效。');
      const entry=await fs.lstat(directory);
      if(!entry.isDirectory()||entry.isSymbolicLink())throw new Error('任务目录无效。');
      const recycle=path.join(engine.root,'已删除任务');
      await fs.mkdir(recycle,{recursive:true});
      await fs.rename(directory,path.join(recycle,id+'-'+Date.now()));
      return json(res,200,{message:'任务已删除，文件已移至本机回收目录。'});
    }
    if ([prefix + '/theme.css', prefix + '/bridge.js'].includes(pathname)) {
      const filename = pathname.endsWith('.css') ? 'theme.css' : 'bridge.js';
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
    if (pathname === prefix + '/' || pathname === prefix + '/app.js') {
      res.end = (body) => {
        let text = body.toString('utf8');
        if (pathname.endsWith('/app.js')) {
          text = text.replaceAll("'/api/", "'/studio-app/api/").replaceAll("'/download/", "'/studio-app/download/");
        } else {
          studioToken=text.match(/name="studio-token" content="([a-f0-9]+)"/)?.[1];
          text = text.replaceAll('href="/', 'href="/studio-app/').replaceAll('src="/', 'src="/studio-app/');
          text = text.replace('</head>', '<link rel="stylesheet" href="/studio-app/theme.css"><script src="/studio-app/bridge.js" defer></script></head>');
        }
        return end(text);
      };
    }
    return original.emit('request', req, res);
  } catch (error) {
    if (!res.headersSent) json(res, pathname === prefix + '/api/delete' ? 400 : 500, { error: error.message });
    else res.destroy();
  }
});
async function start(port = Number(process.env.BOOK_PORT || 43824)) {
  if (server.listening) return;
  await engine.init();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
  });
}
if (require.main === module) start().then(() => console.log(`书页工坊项目接入服务：http://127.0.0.1:${server.address().port}/studio-app/`)).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { server, engine, start, integrationVersion };
