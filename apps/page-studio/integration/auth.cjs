'use strict';
// Observe the existing session only; never navigate, focus or create a browser.
function inspectQqLogin(){
 const visible=selector=>[...document.querySelectorAll(selector)].some(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
 const state=window.$nuxt?.$store?.state||window.__NUXT__?.state;
 if(state?.isLogin===true&&state.userInfo?.nickname)return 'logged-in';
 if(visible('.unlogin'))return 'logged-out';
 return 'unknown';
}
async function readerAuth(engine){
 const result=(status,message)=>({status,message});
 const pages=engine.context?.pages?.()||[];
 const candidates=[engine.reader,...pages.slice().reverse()].filter((page,index,all)=>page&&!page.isClosed()&&all.indexOf(page)===index);
 const page=candidates.find(page=>{try{return new URL(page.url()).hostname==='book.qq.com';}catch{return false;}});
 if(!candidates.length)return result('closed','授权状态：阅读浏览器未打开');
 if(!page)return result('unknown','授权状态：请在阅读浏览器打开 QQ 阅读');
 let timer;
 try{
  const status=await Promise.race([page.evaluate(inspectQqLogin),new Promise(resolve=>{timer=setTimeout(()=>resolve('unknown'),2000);})]);
  if(status==='logged-in'){
   if(engine.browserSession?.save)await engine.browserSession.save();
   return result(status,engine.browserSession?.error?'授权状态：已登录，但本地会话保存失败':'授权状态：已检测到 QQ 阅读登录态');
  }
  if(status==='logged-out')return result(status,'授权状态：未登录，请在阅读浏览器完成登录');
  return result('unknown','授权状态：暂无法确认登录态');
 }catch{return result('unknown','授权状态：页面切换或连接异常，稍后重试');}
 finally{clearTimeout(timer);}
}
module.exports={readerAuth,inspectQqLogin};
