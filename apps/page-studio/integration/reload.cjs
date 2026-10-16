'use strict';
// Upgrade the HTTP adapter without closing a browser or an in-flight capture.
async function loadHost(){
  const filename=require.resolve('./host.cjs');
  const previous=require.cache[filename]?.exports;
  for(const dependency of ['./source.cjs','./catalog.cjs','./browser.cjs','./bqg.cjs','./queue.cjs','./search.cjs','./search-trace.cjs','./auth.cjs','./session.cjs'])delete require.cache[require.resolve(dependency)];
  if(!previous?.server?.listening){delete require.cache[filename];return require(filename);}
  const current=previous.engine.current;
  if(previous.queue){
    previous.engine.studioQueue=previous.queue;
    const queueFile=require.resolve('./queue.cjs');delete require.cache[queueFile];
    Object.setPrototypeOf(previous.queue,require(queueFile).TaskQueue.prototype);
  }
  // Rebuild adapters from original methods instead of wrapping stale closures.
  const {CaptureEngine}=require('../lib/capture.cjs');
  for(const name of ['open','catalog','start','update','resume','pause','importHtml','contextReady'])previous.engine[name]=CaptureEngine.prototype[name];
  previous.engine.bqgInstalled=false;
  delete require.cache[filename];
  const upgraded=require(filename);
  if(upgraded.engine!==previous.engine||upgraded.engine.current!==current)throw new Error('无法安全复用当前抓取引擎。');
  if(!upgraded.queue.timer)await upgraded.queue.init();
  const handlers=upgraded.server.listeners('request');
  previous.server.removeAllListeners('request');
  for(const handler of handlers)previous.server.on('request',handler);
  upgraded.server=previous.server;
  upgraded.start=async()=>{};
  return upgraded;
}
module.exports={loadHost};
