'use strict';
const {performance}=require('node:perf_hooks');
function createSearchTrace(engine,title){
 const started=performance.now();
 const trace=engine.searchTrace={title,status:'running',startedAt:Date.now(),durationMs:null,steps:[]};
 return {
  async step(label,source,work){
   const start=performance.now(),row={number:trace.steps.length+1,label,source,status:'running',startedAt:Date.now(),durationMs:null};trace.steps.push(row);
   try{const result=await work(row);row.status='complete';return result;}
   catch(error){row.status='failed';row.error=error.message;throw error;}
   finally{row.durationMs=Math.round(performance.now()-start);}
  },
  finish(status){trace.status=status;trace.durationMs=Math.round(performance.now()-started);}
 };
}
module.exports={createSearchTrace};
