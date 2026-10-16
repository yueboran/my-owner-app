'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const {spawn}=require('node:child_process');const {chromium}=require('../node_modules/playwright-core');const {browserPath}=require('../lib/capture.cjs');
test('delete current task supports cancel, confirmation and persistent removal',{timeout:20000},async()=>{
 const data=await fs.mkdtemp(path.join(os.tmpdir(),'studio-delete-ui-'));const id='12345678-1234-1234-1234-123456789abc';const dir=path.join(data,'任务',id);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'task.json'),JSON.stringify({id,title:'删除界面测试',kind:'article',format:'mixed',url:'https://example.com',start:1,end:1,status:'complete',message:'已完成',createdAt:new Date().toISOString(),chapters:[],artifacts:[]}));
 const child=spawn(process.execPath,['integration/host.cjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,BOOK_PORT:'0',BOOK_DATA_DIR:data},stdio:['ignore','pipe','pipe']});let browser;
 try{
  const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('startup timeout')),10000);child.stdout.on('data',c=>{const match=c.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});child.once('exit',()=>{clearTimeout(timer);reject(new Error('host exited'));});});
  browser=await chromium.launch({executablePath:await browserPath(),headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/studio-app/');
  const remove=page.getByRole('button',{name:'删除当前任务',exact:true});await remove.waitFor();await remove.click();await page.locator('#delete-cancel').click();assert.equal(await page.locator('#history-list .history-row').count(),1);
  await remove.click();await page.locator('#delete-confirm').click();await page.locator('#job-detail').waitFor({state:'hidden'});assert.equal(await page.locator('#history-list .history-row').count(),0);await page.reload();await page.getByText('还没有任务记录。填写阅读网址后加入队列。').waitFor();assert.deepEqual(errors,[]);await assert.rejects(fs.access(dir));
 }finally{if(browser)await browser.close();child.kill();}
});

