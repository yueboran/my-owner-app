'use strict';
// Layout only: the original app.js owns every action and all application state.
let scheduled = false;
function reportHeight() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    const height = Math.ceil(document.querySelector('main').getBoundingClientRect().bottom + 24);
    parent.postMessage({ type: 'page-studio:height', height }, '*');
  });
}
new ResizeObserver(reportHeight).observe(document.querySelector('main'));
window.addEventListener('load', reportHeight);
reportHeight();
// Keep action feedback beside the controls, inside the visible part of the iframe.
const feedback=document.createElement('p');
feedback.id='action-feedback';
feedback.setAttribute('role','status');
feedback.setAttribute('aria-live','polite');
feedback.className='login-tip';
feedback.hidden=true;
document.querySelector('#browser-status').after(feedback);
const noticeElement=document.querySelector('#notice');
new MutationObserver(()=>{
  if(/^(?:阅读)?浏览器(?:已打开|窗口已从最小化恢复)/.test(noticeElement.textContent)){feedback.hidden=true;return;}
  if(!noticeElement.hidden && noticeElement.textContent){feedback.textContent=noticeElement.textContent;feedback.hidden=false;}
}).observe(noticeElement,{attributes:true,childList:true,subtree:true,characterData:true});
const catalog=document.querySelector('#catalog');
const originalClick=catalog.onclick;
let reading=false;
catalog.onclick=async event=>{
  if(reading)return;
  reading=true;catalog.textContent='正在读取目录…';
  feedback.textContent='正在加载目录，请稍候…';feedback.hidden=false;
  try {await originalClick.call(catalog,event);}
  finally {reading=false;catalog.textContent='读取目录';}
};
// Project-only deletion; the original application files remain unchanged.
const deleteDialog=document.createElement('dialog');
deleteDialog.setAttribute('aria-labelledby','delete-heading');
deleteDialog.innerHTML='<h2 id="delete-heading">删除任务</h2><p id="delete-description"></p><p class="hint">任务将从列表移除，文件移至本机“已删除任务”目录。已下载的文件不受影响。</p><p id="delete-error" role="alert" class="error" hidden></p><div class="buttons"><button type="button" class="button secondary" id="delete-cancel">取消</button><button type="button" class="button danger" id="delete-confirm">删除任务</button></div>';
document.body.append(deleteDialog);
let deletingId=null;
let deletingBusy=false;
function openDeleteDialog(job){
  deletingId=job.id;
  document.querySelector('#delete-description').textContent='确定删除“'+(job.title||'未命名电子书')+'”？';
  document.querySelector('#delete-error').hidden=true;
  deleteDialog.showModal();document.querySelector('#delete-cancel').focus();
}
document.querySelector('#delete-cancel').onclick=()=>deleteDialog.close();
deleteDialog.addEventListener('cancel',event=>{if(deletingBusy)event.preventDefault();});
document.querySelector('#delete-confirm').onclick=async()=>{
  deletingBusy=true;
  document.querySelector('#delete-confirm').disabled=true;
  document.querySelector('#delete-cancel').disabled=true;
  try{
    const result=await api('delete',{id:deletingId});
    jobs=jobs.filter(job=>job.id!==deletingId);
    if(selectedId===deletingId){selectedId=null;lastDetail='';}
    deleteDialog.close();notice(result.message);await refresh();
  }catch(error){const message=document.querySelector('#delete-error');message.textContent=error.message;message.hidden=false;}
  finally{deletingBusy=false;document.querySelector('#delete-confirm').disabled=false;document.querySelector('#delete-cancel').disabled=false;}
};
const deleteCurrent=document.createElement('button');
deleteCurrent.id='delete-current';deleteCurrent.type='button';deleteCurrent.className='button danger';deleteCurrent.textContent='删除当前任务';
document.querySelector('#job-detail .buttons').append(deleteCurrent);
deleteCurrent.onclick=()=>{const job=jobs.find(job=>job.id===selectedId);if(job)openDeleteDialog(job);};
const upstreamRender=render;
render=function(){
  upstreamRender();
  const jobError=document.querySelector('#job-error');
  if(/Target (?:page|browser|context).*closed|has been closed/.test(jobError.textContent)){
    jobError.textContent='上次抓取时阅读浏览器或页面已关闭，任务已停止。这是该任务的历史错误；请重新打开阅读浏览器后继续任务。';
  }
  deleteCurrent.disabled=!!current;
  deleteCurrent.title=current?'请先暂停，等待保存完成后删除':'';
  for(const [index,row] of [...document.querySelectorAll('#history-list .history-row')].entries()){
    const job=jobs[index];if(!job)continue;
    const button=document.createElement('button');button.type='button';button.className='button danger';button.textContent='删除';
    button.setAttribute('aria-label','删除任务：'+(job.title||'未命名电子书'));button.disabled=!!current;
    button.onclick=()=>openDeleteDialog(job);row.querySelector('.history-actions').append(button);
  }
};
render();
function normalizeReaderInput(){
  const input=document.querySelector('#url');let url;
  try{url=new URL(input.value.trim());}catch{return;}
  const match=url.hostname==='book.qq.com'&&url.pathname.match(/^\/book-(?:detail|chapter)\/(\d+)\/(\d+)\/?$/);
  if(match){url.pathname='/book-read/'+match[1]+'/'+match[2];input.value=url.href;input.dispatchEvent(new Event('change'));}
}
for(const id of ['open-reader','catalog'])document.querySelector('#'+id).addEventListener('click',normalizeReaderInput,true);
document.querySelector('#capture-form').addEventListener('submit',normalizeReaderInput,true);
// The first source tab is dedicated to QQ Reading; other sources use their own tabs.
document.querySelector('#online-tab').textContent='QQ阅读';
const qqUrlInput=document.querySelector('#url');
qqUrlInput.value='https://book.qq.com/';
qqUrlInput.defaultValue='https://book.qq.com/';
qqUrlInput.placeholder='QQ阅读首页、书籍详情页、目录页或阅读页网址';
document.querySelector('label[for="url"]').textContent='QQ阅读网址';
qqUrlInput.nextElementSibling.textContent='可先打开QQ阅读首页选书，再粘贴具体书籍的详情页、目录页或阅读页网址，读取目录后加入队列。';
document.querySelector('#selector').placeholder='默认自动识别QQ阅读正文，通常无需填写';
document.querySelector('#selector').nextElementSibling.textContent='仅在QQ阅读正文识别异常时指定正文区域。';
qqUrlInput.addEventListener('input',()=>qqUrlInput.setCustomValidity(''));
function validateQqInput(event,requireBook){
  qqUrlInput.setCustomValidity('');
  let url;try{url=new URL(qqUrlInput.value.trim());}catch{qqUrlInput.setCustomValidity('请输入完整的QQ阅读网址。');}
  if(url){
    if(!['http:','https:'].includes(url.protocol)||url.hostname!=='book.qq.com'||url.username||url.password)qqUrlInput.setCustomValidity('此页面仅支持QQ阅读，请输入 book.qq.com 的网址。');
    else if(requireBook&&!/^\/book-(?:read\/\d+\/\d+|(?:detail|chapter)\/\d+)\/?$/.test(url.pathname))qqUrlInput.setCustomValidity('请填写具体书籍的详情页、目录页或阅读页网址，首页不能直接加入队列或读取目录。');
  }
  if(!qqUrlInput.reportValidity()){event.preventDefault();event.stopImmediatePropagation();}
}
document.querySelector('#open-reader').addEventListener('click',event=>validateQqInput(event,false),true);
document.querySelector('#catalog').addEventListener('click',event=>validateQqInput(event,true),true);
document.querySelector('#capture-form').addEventListener('submit',event=>validateQqInput(event,true),true);

// Keep login feedback alongside both reader controls, independent of task notices.
const authStatus=document.createElement('span');
authStatus.id='reader-auth-status';authStatus.className='reader-auth-status';
authStatus.setAttribute('role','status');authStatus.setAttribute('aria-live','polite');
authStatus.textContent='授权状态：正在检测…';
authStatus.title='仅检测 QQ 阅读登录态；具体章节的订阅与阅读权限以网站实际提示为准。';
const readerControls=document.querySelector('#open-reader').parentElement;
readerControls.classList.add('reader-controls');
readerControls.append(authStatus);
document.querySelector('label[for="url"]').before(readerControls);
const bookFields=document.querySelector('#capture-form .fields');
bookFields.classList.add('book-fields');
bookFields.append(catalog);
document.querySelector('#browser-status').hidden=true;
let authPending=false;
async function refreshReaderAuth(){
  if(authPending||document.hidden)return;
  authPending=true;
  try{
    const response=await fetch('/studio-app/api/reader-auth',{headers:{'x-studio-token':token},signal:AbortSignal.timeout(4000)});
    if(!response.ok)throw new Error('检测失败');
    const state=await response.json();
    authStatus.textContent=state.message;authStatus.dataset.state=state.status;
  }catch{authStatus.textContent='授权状态：检测暂不可用';authStatus.dataset.state='unknown';}
  finally{authPending=false;}
}
refreshReaderAuth();
setInterval(refreshReaderAuth,5000);
window.addEventListener('focus',refreshReaderAuth);
document.addEventListener('visibilitychange',refreshReaderAuth);
for(const button of [document.querySelector('#open-reader'),catalog]){
  const click=button.onclick;
  button.onclick=async function(event){try{return await click.call(this,event);}finally{await refreshReaderAuth();}};
}

