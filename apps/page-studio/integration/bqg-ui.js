'use strict';
const bqgTab=document.createElement('button');
bqgTab.type='button';bqgTab.id='bqg-tab';bqgTab.setAttribute('role','tab');bqgTab.setAttribute('aria-controls','bqg-panel');bqgTab.textContent='笔趣阁';
document.querySelector('#online-tab').after(bqgTab);
const bqgPanel=document.createElement('div');
bqgPanel.id='bqg-panel';bqgPanel.setAttribute('role','tabpanel');bqgPanel.setAttribute('aria-labelledby','bqg-tab');bqgPanel.hidden=true;
bqgPanel.innerHTML=`<form id="bqg-form">
<label for="bqg-url">笔趣阁作品或章节网址</label>
<input id="bqg-url" type="url" required placeholder="https://www.bqg308.xyz/#/book/30132/5.html" autocomplete="off" aria-describedby="bqg-url-hint">
<p class="hint" id="bqg-url-hint">支持 bqg308.xyz、bqg726.xyz 及已配置的同协议镜像。章节链接会自动填写起始章，作品链接从第 1 章开始。</p>
<div class="buttons"><button type="button" id="bqg-catalog" class="button secondary">读取目录</button></div>
<p class="login-tip">直接读取章节接口返回的标题与正文，无需打开阅读浏览器或设置正文选择器。</p>
<p id="bqg-feedback" class="login-tip" role="status" aria-live="polite" hidden></p>
<div class="fields"><div><label for="bqg-title">电子书名</label><input id="bqg-title" placeholder="留空则从作品信息读取" maxlength="120"></div><div class="range"><label for="bqg-start">起始章 a</label><input id="bqg-start" type="number" min="1" max="10000" value="1" required></div><div class="range"><label for="bqg-end">结束章 b</label><input id="bqg-end" type="number" min="1" max="10000" value="1" required></div></div>
<div class="format-note"><span class="format-icon">EPUB</span><div><strong>章节正文电子书</strong><p>保留章节标题与段落，正文可复制、搜索和调整字号。自动识别异常正文并尝试纠错，可暂停后继续。</p></div></div>
<button class="button primary wide" id="bqg-submit" type="submit">加入执行队列 <span aria-hidden="true">→</span></button>
</form>`;
document.querySelector('#online-panel').after(bqgPanel);
let bqgReading=false,bqgSubmitting=false,bqgInputRevision=0;
function bqgFeedback(text){const element=$('bqg-feedback');element.textContent=text;element.hidden=false;}
tab=function(name){for(const key of ['online','bqg']){const on=key===name;$(key+'-tab').classList.toggle('selected',on);$(key+'-tab').setAttribute('aria-selected',String(on));$(key+'-tab').tabIndex=on?0:-1;$(key+'-panel').hidden=!on;}};
for(const name of ['online','bqg']){
 $(name+'-tab').onclick=()=>tab(name);
 $(name+'-tab').onkeydown=event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'online':event.key==='End'?'bqg':name==='online'?'bqg':'online';tab(next);$(next+'-tab').focus();}};
}
tab('online');
function bqgChapterFromUrl(value){try{const url=new URL(value);return Number((url.hash.slice(1)||url.pathname).match(/^\/?book\/\d+\/(\d+)(?:\.html)?\/?$/)?.[1]||1);}catch{return 1;}}
$('bqg-url').addEventListener('input',()=>{bqgInputRevision++;$('bqg-feedback').hidden=true;});
$('bqg-url').addEventListener('change',()=>{const chapter=bqgChapterFromUrl($('bqg-url').value);$('bqg-start').value=chapter;$('bqg-end').value=chapter;});
$('bqg-catalog').onclick=async()=>{
 if(bqgReading||!$('bqg-url').reportValidity())return;
 const revision=bqgInputRevision,url=$('bqg-url').value.trim();bqgReading=true;$('bqg-catalog').disabled=true;$('bqg-catalog').textContent='正在读取目录…';bqgFeedback('正在读取作品信息与章节目录…');
 try{
  const result=await api('bqg/catalog',{url});
  if(revision!==bqgInputRevision)return;
  if(!Number.isInteger(result.total)||result.total<1)throw new Error('站点未返回有效章节目录。');
  if(!$('bqg-title').value.trim())$('bqg-title').value=result.title;
  $('bqg-end').value=Math.min(result.total,Number($('bqg-start').value)+1999,10000);
  bqgFeedback(`已读取《${result.title}》目录，共 ${result.total} 章。请核对起止范围；每次最多抓取 2000 章。`);
 }catch(error){if(revision===bqgInputRevision)bqgFeedback(error.message);}
 finally{bqgReading=false;$('bqg-catalog').disabled=false;$('bqg-catalog').textContent='读取目录';}
};
$('bqg-form').onsubmit=async event=>{
 event.preventDefault();if(bqgSubmitting)return;
 const start=Number($('bqg-start').value),end=Number($('bqg-end').value);
 if(end<start||end-start>1999){bqgFeedback('请核对章节范围，结束章不能小于起始章，每次最多 2000 章。');return;}
 bqgSubmitting=true;$('bqg-submit').disabled=true;$('bqg-submit').textContent='正在加入队列…';
 try{const job=await api('start',{kind:'bqg',url:$('bqg-url').value.trim(),title:$('bqg-title').value.trim(),start,end});selectedId=job.id;lastDetail='';bqgFeedback('笔趣阁任务已加入执行队列。');await refresh();}
 catch(error){bqgFeedback(error.message);}
 finally{bqgSubmitting=false;$('bqg-submit').disabled=false;$('bqg-submit').textContent='加入执行队列';}
};
const renderBeforeBqg=render;
const bqgValidation=document.querySelector('.validation-note p');
const originalValidation=bqgValidation.innerHTML;
render=function(){
 renderBeforeBqg();
 for(const [index,row] of [...$('history-list').querySelectorAll('.history-row')].entries()){
  const job=jobs[index];if(!job)continue;
  const button=row.querySelector('.history-actions button');
  const original=button.onclick;
  button.onclick=()=>{original();if(job.kind==='bqg'){tab('bqg');$('bqg-url').value=job.url;$('bqg-title').value=job.title;$('bqg-start').value=job.start;$('bqg-end').value=job.end;bqgInputRevision++;}else tab('online');};
 }
 const job=jobs.find(job=>job.id===selectedId);
 if(job?.kind==='bqg')$('job-range').textContent=`笔趣阁 · 第 ${job.start}—${job.end} 章`;
 bqgValidation.innerHTML=job?.kind==='bqg'?'<strong>正文校验</strong><br>仅保存非空且未命中已知异常特征的章节正文；异常时尝试纠错，失败则停止并保留完整章节。':originalValidation;
};
render();
