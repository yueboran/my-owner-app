'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const qqCookie=c=>typeof c.domain==='string'&&/(^|\.)qq\.com$/.test(c.domain.replace(/^\./,''));
// Chromium drops session cookies on exit even with a persistent profile.
// Keep their original expiry and let the website validate restored credentials.
function installSessionPersistence(engine){
 const filename=path.join(engine.root,'浏览器会话','qq-session.json');
 let controller=engine.browserSession;
 if(!controller){controller={context:null,timer:null,pending:Promise.resolve(),error:null};engine.browserSession=controller;}
 async function attach(context,restore){
  if(controller.context===context)return context;
  if(restore){
   try{
    const saved=JSON.parse(await fs.readFile(filename,'utf8'));
    const existing=await context.cookies();
    const key=c=>[c.domain,c.path,c.name].join('\n');
    const keys=new Set(existing.map(key));
    const cookies=(saved.cookies||[]).filter(c=>qqCookie(c)&&!keys.has(key(c))&&(c.expires===-1||c.expires>Date.now()/1000));
    if(cookies.length)await context.addCookies(cookies);
   }catch(error){if(error.code!=='ENOENT')controller.error='登录会话恢复失败';}
  }
  controller.context=context;
  const save=()=>{
   const work=controller.pending.catch(()=>{}).then(async()=>{
    if(controller.context!==context)return;
    const cookies=(await context.cookies()).filter(qqCookie);
    await fs.mkdir(path.dirname(filename),{recursive:true});
    const temp=filename+'.tmp';
    await fs.writeFile(temp,JSON.stringify({version:1,cookies}),{mode:0o600});
    await fs.rename(temp,filename);
    controller.error=null;
   });
   controller.pending=work;
   return work.catch(()=>{controller.error='登录会话保存失败';});
  };
  controller.save=save;
  controller.timer=setInterval(save,1000);controller.timer.unref?.();
  const close=context.close.bind(context);
  context.close=async(...args)=>{await save();return close(...args);};
  context.once('close',()=>{clearInterval(controller.timer);controller.context=null;});
  await save();
  return context;
 }
 const ready=engine.contextReady.bind(engine);
 engine.contextReady=async()=>{
  const existing=engine.context;
  const context=await ready();
  return attach(context,context!==existing);
 };
 // A hot upgrade must preserve the live browser and capture its current cookies.
 if(engine.context)attach(engine.context,false).catch(()=>{controller.error='登录会话保存失败';});
}
module.exports={installSessionPersistence};
