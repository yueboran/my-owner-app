'use strict';
async function showReader(page){
  let session;
  let restored=false;
  try{
    session=await page.context().newCDPSession(page);
    const {windowId,bounds}=await session.send('Browser.getWindowForTarget');
    if(bounds.windowState==='minimized'){
      await session.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal'}});
      restored=true;
    }
  }catch{/* Other Chromium hosts may not expose native window management. */}
  finally{if(session)await session.detach().catch(()=>{});}
  await page.bringToFront();
  return restored;
}
function installBrowserRecovery(engine,open){
  return async url=>{
    let result;
    try{result=await open(url);}
    catch(error){
      if(engine.current || !/Target (?:page|browser|context).*closed|has been closed|Browser closed|disconnected/i.test(error.message))throw error;
      const stale=engine.context;
      if(stale)await stale.close().catch(()=>{});
      engine.context=null;engine.reader=null;
      result=await open(url);
    }
    const restored=await showReader(engine.reader);
    return {...result,message:restored?'阅读浏览器窗口已从最小化恢复，请在独立窗口中阅读或登录。':result.message};
  };
}
module.exports={showReader,installBrowserRecovery};
