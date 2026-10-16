/* 授权阅读备份：运行时输入书籍网址与 a—b 章。QQ 阅读自动识别书号；其他站点可使用 {n} 网址模板。 */
(async () => {
  const supplied=globalThis.QQ_EXPORT_OPTIONS;
  function ask(key,label,fallback) {
    if(supplied && supplied[key]!==undefined)return String(supplied[key]);
    return prompt(label,String(fallback));
  }
  const input=ask('url','输入书籍阅读网址。其他网站可填写含 {n} 的章节网址模板：',location.href);
  if(input===null)return;
  const clean=input.trim().replace(/[，,。；;]+$/,'');
  const source=new URL(clean,location.href);
  if(!['http:','https:'].includes(source.protocol)||source.username||source.password)throw new Error('只接受不含账号密码的 http/https 阅读网址');
  if(source.origin!==location.origin)throw new Error('请先在目标网站的已登录阅读页运行脚本；网页脚本不能跨站读取其他网站');
  const sourceHref=source.href.replace(/%7Bn%7D/gi,'{n}');
  const sourcePath=source.pathname.replace(/%7Bn%7D/gi,'{n}');
  const qqRead=source.hostname==='book.qq.com'&&sourcePath.match(/^\/book-read\/(\d+)\/(\d+|\{n\})\/?$/);
  const qqInfo=source.hostname==='book.qq.com'&&sourcePath.match(/^\/book-(?:detail|chapter)\/(\d+)\/?$/);
  const qq=qqRead||(qqInfo&&[qqInfo[0],qqInfo[1],'1']);
  if(!qq && !sourceHref.includes('{n}'))throw new Error('其他网站请填写含 {n} 的章节网址模板，例如 https://example.com/book/123/{n}.html；站点章节ID不等于章序号时不能直接套用');
  const defaultStart=qq&&/^\d+$/.test(qq[2])?Number(qq[2]):1;
  const a=ask('start','从第 a 章开始（正整数）：',defaultStart);if(a===null)return;
  const b=ask('end','到第 b 章结束（包含 b 章）：',a);if(b===null)return;
  if(!/^\d+$/.test(a.trim())||!/^\d+$/.test(b.trim()))throw new Error('起始章和结束章必须为正整数');
  const START=Number(a),END=Number(b);
  if(START<1||END<START||END>10000||END-START>=2000)throw new Error('章节范围无效：需要 1 ≤ a ≤ b ≤ 10000，单次最多 2000 章');
  const initialName=document.querySelector('.book-name')?.textContent.trim()||document.title.replace(/第\s*\d+\s*章.*$/,'').replace(/[-_—]?QQ阅读.*$/,'').trim()||'授权阅读备份';
  const name=ask('title','电子书名（用于目录标题和下载文件名）：',initialName);if(name===null)return;
  const BOOK_TITLE=name.trim()||'授权阅读备份';
  const selector=qq?'#article':ask('selector','正文区域 CSS 选择器：','article, main');if(selector===null)return;
  document.querySelector(selector); // Validate selector before creating any UI.
  const chapterUrl=n=>qq?`${source.origin}/book-read/${qq[1]}/${n}`:sourceHref.split('{n}').join(String(n));
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;left:0;top:0;width:1100px;height:800px;z-index:2147483647;background:white';
  document.body.appendChild(frame);
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const sections = [], entries = [], fontCache = new Map();
  const escape = t => t.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dataUrl = blob => new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
  const status = document.createElement('div');
  status.style.cssText='position:fixed;right:12px;top:12px;z-index:2147483647;background:#222;color:white;padding:16px;font:16px sans-serif';
  document.body.appendChild(status);
  function hasContent(el){
    if(!el)return false;
    const copy=el.cloneNode(true);copy.querySelectorAll('style,script,iframe').forEach(e=>e.remove());
    const text=copy.textContent.trim();
    return (!!text&&!/^(?:正在加载|加载中|请稍候|loading)[.。…\s!！]*$/i.test(text))||[...el.querySelectorAll('img')].some(i=>i.complete&&i.naturalWidth>0)||!!el.querySelector('svg,canvas');
  }
  function accessGate(doc,win){return [...doc.querySelectorAll('a,button,[role="button"]')].some(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&win.getComputedStyle(e).visibility!=='hidden'&&/^(?:登录订阅本章|购买本章|订阅本章|解锁本章)$/.test(e.innerText.trim());});}
  async function capture(n) {
    status.textContent=`正在加载第 ${n} / ${END} 章；请勿关闭本页`;
    const requested=new URL(chapterUrl(n)).href;
    frame.src=requested;
    let d,w,article,title;
    for(let i=0;i<180;i++) {
      try {w=frame.contentWindow;d=w.document;article=d.querySelector(selector);title=(qq&&d.title.match(/_(.+?)在线阅读/)?.[1])||article?.querySelector('h1,h2')?.textContent.trim()||d.querySelector('h1')?.textContent.trim()||d.title;}catch(e){throw new Error('浏览器禁止读取阅读框架，网站可能禁止嵌入或跳转到了其他域名：'+e.message);}
      if(d.URL===requested && accessGate(d,w))throw new Error(`第${n}页显示订阅或解锁入口，请确认本页阅读权限`);
      if(d.URL===requested && hasContent(article)) break;
      await delay(500);
    }
    if(d?.URL!==requested || !hasContent(article)) throw new Error(`第${n}页未识别到文字或封面图片；这不代表未登录。内嵌阅读文档请使用新版应用抓取`);
    await Promise.race([d.fonts.ready,delay(15000)]);
    await delay(1500);
    // The reader substitutes off-screen paragraph HTML. Capture each paragraph
    // only after it has entered the viewport and its original text is restored.
    const keep=['display','order','flex-direction','flex-wrap','align-items','justify-content','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-indent','white-space','visibility','transform','position','width','box-sizing','color','margin-top','margin-bottom','padding-top','padding-bottom','padding-left','padding-right'];
    function styledClone(el) {
      const copy=el.cloneNode(true);
      const from=[el,...el.querySelectorAll('*')], to=[copy,...copy.querySelectorAll('*')];
      from.forEach((node,i)=>{
        const cs=w.getComputedStyle(node);to[i].removeAttribute('style');
        keep.forEach(property=>to[i].style.setProperty(property,cs.getPropertyValue(property)));
      });
      return copy;
    }
    const clone=styledClone(article);
    let paragraphs=[...article.querySelectorAll('p')];
    let destinations=[...clone.querySelectorAll('p')];
    if(!paragraphs.length){paragraphs=[...article.children].filter(e=>!['STYLE','SCRIPT','IFRAME'].includes(e.tagName));destinations=[...clone.children].filter(e=>!['STYLE','SCRIPT','IFRAME'].includes(e.tagName));}
    for(let i=0;i<paragraphs.length;i++) {
      const para=paragraphs[i];
      status.textContent=`第 ${n} / ${END} 章：逐段确认 ${i+1} / ${paragraphs.length}`;
      para.scrollIntoView({block:'center',behavior:'instant'});
      w.dispatchEvent(new w.Event('scroll'));
      let ready=false;
      for(let retry=0;retry<30;retry++) {
        await delay(100);
        const rect=para.getBoundingClientRect();
        const substituted=typeof para.initHTML==='string' && para.innerHTML===para.initHTML && /[\u4e00-\u4eff]/.test(para.innerHTML);
        if(rect.bottom>0 && rect.top<w.innerHeight && !substituted) {ready=true;break;}
      }
      if(!ready) throw new Error(`第${n}章第${i+1}段未恢复阅读状态，已停止导出`);
      destinations[i].replaceWith(styledClone(para));
    }
    const originals=[article,...article.querySelectorAll('*')];
    const copies=[clone,...clone.querySelectorAll('*')];
    clone.querySelectorAll('script,iframe').forEach(el=>el.remove());
    for(const img of clone.querySelectorAll('img')){
      const src=img.getAttribute('src');if(!src)throw new Error(`第${n}页有未加载的正文图片`);
      if(!src.startsWith('data:')){
        const response=await w.fetch(new URL(src,d.URL).href);
        if(!response.ok)throw new Error(`第${n}页图片无法嵌入：HTTP ${response.status}`);
        img.src=await dataUrl(await response.blob());
      }
      img.removeAttribute('srcset');img.removeAttribute('loading');
    }
    clone.querySelectorAll('picture source').forEach(el=>el.remove());
    // Preserve the reader watermark images as self-contained resources.
    // Export those images before navigating away; blob addresses alone cannot work offline.
    for (const style of clone.querySelectorAll('style')) {
      let text = style.textContent;
      const urls = [...new Set([...text.matchAll(/blob:https?:\/\/[^\s"')]+/g)].map(m => m[0]))];
      for (const url of urls) {
        const response = await w.fetch(url);
        if (!response.ok) throw new Error('无法保存正文图片：' + n);
        text = text.split(url).join(await dataUrl(await response.blob()));
      }
      style.textContent = text.replace(/#article\b/g, `#chapter${n} #article`);
    }
    let css='';let embedded=0;
    for(const sheet of [...d.styleSheets]) {
      if(!sheet.href?.startsWith('blob:')) continue;
      const rules=[...sheet.cssRules];
      for(const rule of rules) {
        if(rule.type===5) {
          let text=rule.cssText;
          const urls=[...text.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(x=>x[1]);
          let encoded;
          for(const url of urls) {
            try {
              if(!fontCache.has(url)) {
                const response=await w.fetch(url);
                if(!response.ok) throw new Error('HTTP '+response.status);
                const blob=await response.blob();
                if(blob.size<100) throw new Error('字体文件为空');
                fontCache.set(url,await dataUrl(blob));
              }
              encoded=fontCache.get(url);break;
            }catch(e){console.warn('字体加载失败',url,e);}
          }
          if(!encoded) throw new Error('无法导出第 '+n+' 章字体；停止，避免生成乱码文件');
          const family=rule.style.getPropertyValue('font-family').replace(/["']/g,'').trim();
          const offlineFamily = `c${n}_${family}`;
          const descriptors = [...rule.style]
            .filter(p => p !== 'font-family' && p !== 'src')
            .map(p => `${p}:${rule.style.getPropertyValue(p)};`).join('');
          css+=`@font-face{font-family:"${offlineFamily}";src:url("${encoded}");${descriptors}}\n`;
          embedded++;
          copies.forEach(el=>{
            el.style.fontFamily=el.style.fontFamily.split(',').map(part=>{
              const original=part.trim().replace(/^["']|["']$/g,'');
              return original===family ? `"${offlineFamily}"` : part.trim();
            }).join(', ');
          });
        } else if(rule.type===1) {
          css+=rule.selectorText.split(',').map(s=>`#chapter${n} ${s.trim()}`).join(',')+'{'+rule.style.cssText+'}\n';
        }
      }
    }
    const encrypted=article.classList.contains('font-encrypt')||[...d.fonts].some(f=>/YWHeiTi|Genuine/.test(f.family));
    if(embedded<2 && encrypted) throw new Error('动态字体没有完整导出：'+n);
    if (/blob:https?:\/\//.test(clone.outerHTML)) throw new Error('正文临时资源未完整保存：'+n);
    const advertised=Number(d.body.innerText.match(/本章字数[：:]\s*(\d+)/)?.[1]||0);
    if(advertised && !article.querySelector('img,svg,canvas') && article.textContent.replace(/\s/g,'').length<advertised*0.85) throw new Error('正文疑似截断：'+n);
    sections.push(`<section id="chapter${n}"><h2>${escape(title)}</h2><style>${css}</style>${clone.outerHTML}</section>`);
    entries.push({chapter:n,title,characters:article.textContent.length,fonts:embedded});
    console.log('已备份',entries.at(-1));
  }
  function save(partial=false) {
    if(!sections.length)return;
    const html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(BOOK_TITLE)+' 授权离线备份</title><style>body{max-width:880px;margin:40px auto;padding:0 24px;background:#faf7f0;color:#222}section{margin:60px 0}p{margin:1em 0}nav a{display:block;margin:8px}h1,h2,nav{font-family:system-ui,sans-serif}#article{overflow-wrap:anywhere}</style><h1>'+escape(BOOK_TITLE)+' 第'+START+'—'+entries.at(-1).chapter+'章</h1><p>'+(partial?'部分备份：导出中断，详见浏览器控制台。':`已导出第${START}—${entries.at(-1).chapter}章，范围包含首尾章节。`)+'</p><nav>'+entries.map(e=>`<a href="#chapter${e.chapter}">${escape(e.title)}</a>`).join('')+'</nav>'+sections.join('\n')+'</html>';
    const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=`${BOOK_TITLE.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')}_第${START}-${entries.at(-1).chapter}章${partial?'_部分':''}.html`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  try {for(let n=START;n<=END;n++){await capture(n);await delay(1200);}save();status.textContent=`导出完成：${BOOK_TITLE}，第${START}—${END}章。`;console.table(entries);}
  catch(e){save(true);status.textContent='导出中断：'+e.message;console.error(e);alert('导出中断：'+e.message+'。已完成的章节会单独保存。');}
  finally {frame.remove();setTimeout(()=>status.remove(),30000);}
})();


