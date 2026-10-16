'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {parseSource}=require('../lib/capture.cjs');
const {newJob}=require('../lib/book.cjs');
const {normalizeSource}=require('./source.cjs');
const {parseBqgSource,runBqg}=require('./bqg.cjs');

class TaskQueue {
  constructor(engine){
    this.engine=engine;this.file=path.join(engine.root,'queue.json');
    this.pending=[];this.activeId=null;this.paused=false;this.error=null;
    this.serial=Promise.resolve();this.working=false;this.closed=false;
  }
  transaction(work){const result=this.serial.then(work);this.serial=result.catch(()=>{});return result;}
  snapshot(){return {pending:[...this.pending],activeId:this.activeId,paused:this.paused,error:this.error};}
  async persist(){const temp=this.file+'.tmp';await fs.writeFile(temp,JSON.stringify(this.snapshot(),null,2));await fs.rename(temp,this.file);}
  async init(){
    let saved;
    try{saved=JSON.parse(await fs.readFile(this.file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw new Error('队列记录无法读取，请保留 queue.json 并检查文件。');}
    if(saved){
      if(!Array.isArray(saved.pending))throw new Error('队列记录格式无效。');
      this.pending=[...new Set([saved.activeId,...saved.pending].filter(Boolean))];
      this.paused=true;this.error=saved.error||null;
      const recover=[];
      for(const id of this.pending){
        let job;try{job=await this.engine.load(id);}catch{continue;}
        if(job.status==='complete')continue;
        if(job.kind==='import'&&job.chapters.length){job.status='paused';job.message='HTML导入已中断，请重新导入文件；已保存章节保留。';await this.engine.save(job);continue;}
        job.status='queued';job.message='队列已恢复，点击运行队列后继续。';await this.engine.save(job);recover.push(id);
      }
      this.pending=recover;
    }
    await this.persist();
    this.timer=setInterval(()=>this.kick(),300);this.timer.unref();
  }
  kick(){if(!this.closed)void this.pump().catch(error=>{this.paused=true;this.error=error.message;});}
  async enqueue(config){
    const source=config.kind==='bqg'?parseBqgSource(config.url):parseSource(normalizeSource(config.url));
    const start=Number(config.start??source.chapter),end=Number(config.end??start);
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>10000||end-start>1999)throw new Error('章节范围无效；每次最多2000章。');
    if(source.kind==='article'&&start!==end)throw new Error('普通网址只保存单页，连续章节请使用 {n} 模板。');
    return this.add(newJob({...source,start,end,title:String(config.title||'').trim(),selector:String(config.selector||'').trim(),author:'',format:'mixed'}));
  }
  async enqueueImport(filename,title){return this.add(newJob({kind:'import',url:'本地 HTML',title:title||'导入电子书',start:1,end:1,author:'',importFile:filename}));}
  async add(job){
    return this.transaction(async()=>{
      job.status='queued';job.message='已加入执行队列。';await this.engine.save(job);
      this.pending.push(job.id);await this.persist();this.kick();return job;
    });
  }
  async resume(id){
    return this.transaction(async()=>{
      const job=await this.engine.load(id);
      if(this.activeId===id||this.engine.current?.id===id)throw new Error('任务正在执行。');
      if(job.status==='complete')throw new Error('任务已完成，可重新导出。');
      if(job.kind==='import'&&(!job.importFile||job.chapters.length))throw new Error('HTML导入中断后请重新导入文件，已保存章节保留。');
      if(!this.pending.includes(id)){job.status='queued';job.message='等待继续执行。';await this.engine.save(job);this.pending.push(id);}
      this.paused=false;this.error=null;await this.persist();this.kick();return job;
    });
  }
  async control(action,id){
    return this.transaction(async()=>{
      if(action==='pause')this.paused=true;
      else if(action==='resume'){this.paused=false;this.error=null;}
      else{
        const index=this.pending.indexOf(id);
        if(index<0)throw new Error('该任务已开始执行或不在等待队列中。');
        if(action==='remove'){
          const job=await this.engine.load(id);job.status='paused';job.message='已移出队列，可从历史记录继续任务。';await this.engine.save(job);this.pending.splice(index,1);
        }else{
          const target=action==='up'?Math.max(0,index-1):action==='down'?Math.min(this.pending.length-1,index+1):action==='top'?0:null;
          if(target===null)throw new Error('未知队列操作。');
          this.pending.splice(index,1);this.pending.splice(target,0,id);
        }
      }
      await this.persist();this.kick();return this.snapshot();
    });
  }
  async pump(){
    if(this.working||this.paused||!this.pending.length||this.engine.current||this.engine.opening||this.engine.editing||this.closed)return;
    this.working=true;
    let job;
    try{
      await this.transaction(async()=>{
        if(this.paused||!this.pending.length)return;
        job=await this.engine.load(this.pending[0]);
        this.activeId=job.id;this.pending.shift();await this.persist();
      });
      if(!job)return;
      if(!['import','bqg'].includes(job.kind))await this.engine.open(job.url);
      this.engine.current=job;this.engine.stopRequested=false;
      if(job.kind==='bqg')await runBqg(this.engine,job);
      else if(job.kind==='import')await this.engine.runImport(job,job.importFile);
      else await this.engine.run(job);
    }catch(error){
      if(job){job.status='failed';job.error=String(error.message).split(/Call log:|\n/)[0].replace(/https?:\/\/\S+/g,'[资源地址已隐藏]');job.message='队列任务停止，请处理错误后继续。';await this.engine.save(job);}
      else throw error;
    }finally{
      try{await this.transaction(async()=>{
        if(job?.status==='paused'){
          if(job.kind!=='import'||!job.chapters.length)this.pending.unshift(job.id);
          else this.error='HTML导入已暂停，请重新导入文件；已保存章节保留。';
          this.paused=true;
        }
        if(job?.status==='failed'){this.paused=true;this.error='任务“'+(job.title||'未命名电子书')+'”失败，队列已暂停。';}
        this.activeId=null;await this.persist();
      });}finally{this.working=false;}
    }
    this.kick();
  }
  stop(){this.closed=true;clearInterval(this.timer);}
}
module.exports={TaskQueue};
