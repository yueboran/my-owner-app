'use strict';
const $=id=>document.getElementById(id),token=document.querySelector('meta[name="studio-token"]').content;
let selectedId=null,jobs=[],current=null,noticeTimer,lastDetail='',pollError=false;
const labels={ready:'准备中',running:'正在抓取',paused:'已暂停',failed:'需要处理',complete:'已完成',exporting:'正在导出'};
function notice(text){$('notice').textContent=text;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,10000);}
async function api(route,data,options={}){const res=await fetch('/api/'+route,{method:data!==undefined?'POST':'GET',headers:{'x-studio-token':token,...(data!==undefined?{'Content-Type':'application/json'}:{}),...options.headers},body:data!==undefined?JSON.stringify(data):undefined,...options});const result=await res.json();if(!res.ok)throw new Error(result.error||'操作失败');return result;}
async function action(button,work){button.disabled=true;try{return await work();}catch(e){notice(e.message);}finally{button.disabled=false;await refresh();}}
function config(){return{url:$('url').value.trim(),title:$('title').value.trim(),start:Number($('start').value),end:Number($('end').value),selector:$('selector').value.trim()};}
function tab(name){for(const key of ['online','import']){const on=key===name;$(key+'-tab').classList.toggle('selected',on);$(key+'-tab').setAttribute('aria-selected',String(on));$(key+'-panel').hidden=!on;}}
for(const name of ['online','import']){$(name+'-tab').onclick=()=>tab(name);$(name+'-tab').onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const other=name==='online'?'import':'online';tab(other);$(other+'-tab').focus();}};}
$('url').addEventListener('change',()=>{const m=$('url').value.match(/book-read\/\d+\/(\d+)/);if(m){$('start').value=m[1];if(Number($('end').value)<Number(m[1]))$('end').value=m[1];}else{$('start').value=1;$('end').value=1;}});
$('open-reader').onclick=()=>action($('open-reader'),async()=>{const r=await api('open',{url:$('url').value});notice(r.message);});
$('catalog').onclick=()=>action($('catalog'),async()=>{const r=await api('catalog',{url:$('url').value});if(r.total){$('end').value=r.total;notice(`已识别 ${r.total} 章，请核对起止范围。`);}else notice('页面未提供可读取的完整目录，请手动填写结束章。');});
$('capture-form').onsubmit=e=>{e.preventDefault();action($('start-capture'),async()=>{const job=await api('start',config());selectedId=job.id;lastDetail='';notice('任务已开始。请保持阅读浏览器打开。');});};
$('import-button').onclick=()=>action($('import-button'),async()=>{const file=$('html-file').files[0];if(!file)throw new Error('请先选择 HTML 文件。');if(file.size>100*1024*1024)throw new Error('文件超过 100 MB。请使用较小的已修复 HTML 版本。');if(!/\.html?$/i.test(file.name))throw new Error('请选择 .html 或 .htm 文件。');const title=$('import-title').value.trim()||file.name.replace(/\.html?$/i,'');const r=await api('import?title='+encodeURIComponent(title),undefined,{method:'POST',headers:{'x-studio-token':token,'Content-Type':'text/html'},body:await file.arrayBuffer()});selectedId=r.id;lastDetail='';notice('已接收文件，正在按章转换。');});
$('pause').onclick=()=>action($('pause'),async()=>{await api('pause',{});notice('正在完成当前段落后暂停。');});
$('resume').onclick=()=>action($('resume'),async()=>{await api('resume',{id:selectedId});notice('继续任务：已完整保存的章节会跳过。');});
$('export').onclick=()=>action($('export'),async()=>{await api('export',{id:selectedId});notice('已重新生成电子书。');});
$('recapture').onclick=()=>action($('recapture'),async()=>{const job=jobs.find(j=>j.id===selectedId);const result=await api('start',{url:job.url,start:job.start,end:job.end,title:job.title});selectedId=result.id;lastDetail='';notice('已创建文字＋图片任务，旧任务保留。');});
function render(){
 const job=jobs.find(j=>j.id===selectedId);$('empty-state').hidden=!!job;$('job-detail').hidden=!job;
 const stage=!job?0:job.status==='complete'?2:1;document.querySelectorAll('.workflow > span').forEach((el,i)=>{el.classList.toggle('active',i===stage);});
 $('browser-status').textContent=window.browserOpen?'阅读浏览器已打开。完成登录、订阅或验证后即可开始。':'先在独立阅读浏览器中登录，再开始抓取。无需粘贴脚本。';
 $('start-capture').disabled=!!current;$('open-reader').disabled=!!current;$('catalog').disabled=!!current;$('import-button').disabled=!!current;
 if(job){
  const live=current?.id===job.id?current:job,total=live.end-live.start+1,done=live.chapters.length;
  const partial=current?.id===job.id&&live.progress?.total?Math.max(0,(live.progress.paragraph-1)/live.progress.total):0;
  const percent=Math.min(100,Math.round((done+(done<total?partial:0))/total*100));
  $('status-tag').textContent=labels[live.status]||live.status;$('job-title').textContent=live.title||'正在读取书名';$('job-range').textContent=live.kind==='import'?`本地 HTML · ${total} 章`:`第 ${live.start}—${live.end} 章`;
  $('completed-count').textContent=`${done} / ${total} 章完成`;$('percent').textContent=percent+'%';$('progress').value=percent;$('message').textContent=live.message;
  $('job-error').hidden=!live.error;$('job-error').textContent=live.error||'';$('pause').hidden=current?.id!==live.id;$('resume').hidden=!!current||live.status==='complete'||live.kind==='import';$('export').hidden=!!current||!done;$('recapture').hidden=!!current||live.kind==='import'||live.format==='mixed';
  const detailKey=live.id+':'+done+':'+live.artifacts.join('|');
  if(lastDetail!==detailKey){lastDetail=detailKey;$('chapter-number').textContent=String(done);$('chapter-list').replaceChildren();for(const c of live.chapters){const li=document.createElement('li'),title=document.createElement('div'),status=document.createElement('span');title.textContent=c.title;status.textContent='已保存';li.append(title,status);$('chapter-list').append(li);}
   $('downloads').replaceChildren();for(const filename of live.artifacts){const a=document.createElement('a');a.href='/download/'+live.id+'/'+encodeURIComponent(filename);a.download=filename;a.textContent=filename.endsWith('.epub')?'下载 EPUB':filename.endsWith('.html')?'下载离线 HTML':filename.endsWith('.txt')?'下载 TXT':'下载校验报告';$('downloads').append(a);}
  }
 }else $('status-tag').textContent='等待开始';
 const list=$('history-list');list.replaceChildren();if(!jobs.length){const p=document.createElement('p');p.className='hint';p.textContent='还没有任务记录。登录浏览器后开始，或导入已有 HTML。';list.append(p);}
 for(const j of jobs){const row=document.createElement('div'),info=document.createElement('div'),name=document.createElement('h3'),detail=document.createElement('p'),button=document.createElement('button');row.className='history-row';name.textContent=j.title||'未命名电子书';detail.textContent=`${labels[j.status]||j.status} · ${j.chapters.length} 章已保存 · ${new Date(j.createdAt).toLocaleString('zh-CN')}`;info.append(name,detail);button.className='button secondary';button.textContent=j.id===selectedId?'当前任务':'查看任务';button.onclick=()=>{selectedId=j.id;lastDetail='';if(j.kind!=='import'){$('url').value=j.url;$('start').value=j.start;$('end').value=j.end;$('title').value=j.title;}render();$('job-title').scrollIntoView({behavior:'smooth',block:'nearest'});};const edit=document.createElement('button');edit.type='button';edit.className='button secondary';edit.textContent='编辑';edit.disabled=!!current;edit.setAttribute('aria-label','编辑任务：'+(j.title||'未命名电子书'));edit.onclick=()=>openEditor(j);const actions=document.createElement('div');actions.className='history-actions';actions.append(button,edit);row.append(info,actions);list.append(row);}
}
async function refresh(){try{const state=await api('state');jobs=state.jobs;current=state.current;window.browserOpen=state.browserOpen;if(!selectedId)selectedId=current?.id||jobs[0]?.id||null;if(current&&!jobs.some(j=>j.id===current.id))jobs.unshift(current);render();pollError=false;}catch(e){if(!pollError){notice('无法连接本地服务。请确认启动窗口仍打开，再刷新页面。');pollError=true;}}}
async function poll(){await refresh();setTimeout(poll,1800);}poll();


let editingId=null;
function openEditor(job){editingId=job.id;$('edit-title').value=job.title||'';$('edit-url').value=job.url||'';$('edit-start').value=job.start;$('edit-end').value=job.end;$('edit-source').hidden=job.kind==='import';for(const id of ['edit-url','edit-start','edit-end']){$(id).disabled=job.kind==='import';$(id).required=job.kind!=='import';}$('edit-error').hidden=true;$('edit-dialog').showModal();$('edit-title').focus();}
$('edit-cancel').onclick=()=>$('edit-dialog').close();
$('edit-form').onsubmit=async event=>{event.preventDefault();$('edit-save').disabled=true;$('edit-cancel').disabled=true;$('edit-error').hidden=true;try{await api('update',{id:editingId,title:$('edit-title').value,url:$('edit-url').value,start:Number($('edit-start').value),end:Number($('edit-end').value)});$('edit-dialog').close();lastDetail='';notice('任务已更新，已保存章节保留。');await refresh();}catch(e){$('edit-error').textContent=e.message;$('edit-error').hidden=false;}finally{$('edit-save').disabled=false;$('edit-cancel').disabled=false;}};
$('edit-dialog').addEventListener('cancel',e=>{if($('edit-save').disabled)e.preventDefault();});
