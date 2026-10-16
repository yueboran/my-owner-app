'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http');
test('adapter upgrade preserves listening server and active capture object',async()=>{
 process.env.BOOK_DATA_DIR=await fs.mkdtemp(path.join(os.tmpdir(),'studio-upgrade-'));
 const {engine}=require('../server.cjs');await engine.init();const active={id:'active-test'};engine.current=active;
 const {TaskQueue}=require('./queue.cjs');const existingQueue=new TaskQueue(engine);await existingQueue.init();
 const previous=http.createServer((q,r)=>r.end('old'));await new Promise(resolve=>previous.listen(0,'127.0.0.1',resolve));
 const filename=require.resolve('./host.cjs');require.cache[filename]={id:filename,filename,loaded:true,exports:{server:previous,engine,queue:existingQueue}};
 const sourceFile=require.resolve("./source.cjs");const source=require(sourceFile);require.cache[sourceFile].exports={normalizeSource:source.normalizeSource};
 let upgraded;
 try{upgraded=await require('./reload.cjs').loadHost();assert.equal(upgraded.server,previous);assert.equal(engine.current,active);assert.equal(upgraded.queue,existingQueue);const result=await(await fetch('http://127.0.0.1:'+previous.address().port+'/studio-app/health')).json();assert.equal(result.queueSupported,true);assert.equal(result.bqgSupported,true);assert.equal(result.agentSearchSupported,true);await upgraded.start();assert.equal(engine.current,active);await assert.rejects(upgraded.engine.open("https://example.com/"),/仅支持QQ阅读/);const waiting=upgraded.queue.pending;const again=await require("./reload.cjs").loadHost();assert.equal(again.queue,upgraded.queue);assert.equal(again.queue.pending,waiting);assert.equal(engine.current,active);}
 finally{engine.current=null;upgraded?.queue.stop();await new Promise(resolve=>previous.close(resolve));}
});


