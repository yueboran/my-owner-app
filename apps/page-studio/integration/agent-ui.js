'use strict';
// AI代理搜索与浏览器操作实况模块
(() => {
  // 构建与“QQ阅读网址”完全一致的标准表单项结构
  const search = document.createElement('div');
  search.className = 'agent-search';
  search.innerHTML = `
    <label for="agent-query" id="agent-heading">AI代理搜索</label>
    <div class="agent-query-row">
      <input type="text" id="agent-query" maxlength="120" placeholder="告诉我想找的书名（例如：圈子圈套，或部分书名“圈子”）" autocomplete="off">
      <button id="agent-search" type="button" class="button secondary">搜索书籍</button>
    </div>
    <p id="agent-feedback" class="hint" role="status" aria-live="polite">直接前往 QQ 阅读搜索，找到书籍后自动填入下方网址。</p>
  `;
  $('capture-form').querySelector('.reader-controls').after(search);

  // 在执行卡片右侧添加第三个 Tab：浏览器操作实况
  const traceTab = document.createElement('button');
  traceTab.id = 'agent-tab';
  traceTab.type = 'button';
  traceTab.setAttribute('role', 'tab');
  traceTab.setAttribute('aria-controls', 'agent-panel');
  traceTab.textContent = '浏览器操作实况';
  $('activity-tabs').append(traceTab);

  const panel = document.createElement('div');
  panel.id = 'agent-panel';
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', 'agent-tab');
  panel.hidden = true;
  panel.innerHTML = '<p id="trace-status" role="status" aria-live="polite">尚未搜索</p><p id="trace-summary" class="hint">开始 AI代理搜索后显示每步操作、模型置信度及耗时。规则操作的模型分数不适用。</p><ol id="trace-steps" class="agent-steps"></ol>';
  $('activity-panel').after(panel);

  // 扩展三标签切换逻辑（队列、抓取校验、操作实况）
  setActivityTab = function (name, user = false) {
    if (user) userTabLocked = true;
    activeActivityTab = name;
    for (const key of ['queue', 'activity', 'agent']) {
      const on = key === name;
      const t = $(key + '-tab');
      if (t) {
        t.classList.toggle('selected', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      }
      const p = $(key + '-panel');
      if (p) p.hidden = !on;
    }
  };

  const keys = ['queue', 'activity', 'agent'];
  for (const [index, key] of keys.entries()) {
    const tabEl = $(key + '-tab');
    if (tabEl) {
      tabEl.onclick = () => setActivityTab(key, true);
      tabEl.onkeydown = event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
        setActivityTab(keys[next], true);
        $(keys[next] + '-tab').focus();
      };
    }
  }

  setActivityTab(activeActivityTab);

  let submitting = false;
  const time = ms => ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} 秒`;
  const elapsed = item => time(item.durationMs ?? Math.max(0, Date.now() - item.startedAt));
  const percent = n => Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : '未提供';

  function draw(trace) {
    if (!trace) return;
    $('trace-status').textContent = { running: '执行中', complete: '已完成', failed: '已停止' }[trace.status] || trace.status;
    $('trace-summary').textContent = `${trace.title} · ${trace.steps.length} 步 · 总耗时 ${elapsed(trace)}`;
    const list = $('trace-steps');
    list.replaceChildren();
    for (const step of trace.steps) {
      const li = document.createElement('li');
      const head = document.createElement('div');
      const name = document.createElement('strong');
      const status = document.createElement('span');
      const meta = document.createElement('p');
      li.className = 'agent-step ' + step.status;

      name.textContent = `${step.number}. ${step.label}`;
      status.textContent = `${{ running: '执行中', complete: '完成', failed: '失败' }[step.status] || step.status} · ${elapsed(step)}`;
      head.append(name, status);
      li.append(head);

      const details = [`来源：${step.source}`];
      if (step.candidateCount !== undefined) details.push(`候选 ${step.candidateCount} 项`);
      if (step.source === 'Laya') {
        details.push(`置信度 ${percent(step.confidence)}`, `操作 ${percent(step.operationConfidence)}`, `目标 ${percent(step.targetConfidence)}`);
        if (step.operation) details.push(step.operation);
        if (Number.isFinite(step.modelLatencyMs)) details.push(`模型推理 ${time(step.modelLatencyMs)}`);
        if (step.model) details.push(step.model);
      } else {
        details.push('模型分数：不适用');
      }
      meta.textContent = details.join(' · ');
      li.append(meta);

      if (Number.isFinite(step.confidence)) {
        const meter = document.createElement('meter');
        meter.min = 0;
        meter.max = 1;
        meter.value = step.confidence;
        meter.setAttribute('aria-label', `第 ${step.number} 步模型置信度`);
        li.append(meter);
      }
      for (const [text, cls] of [[step.target, 'agent-target'], [step.error, 'error']]) {
        if (text) {
          const p = document.createElement('p');
          p.className = cls;
          p.textContent = text;
          li.append(p);
        }
      }
      list.append(li);
    }
  }

  const previousApi = api;
  api = async function (route, data, options) {
    const result = await previousApi(route, data, options);
    if (route === 'state') draw(result.searchTrace);
    return result;
  };

  async function pollTrace() {
    try {
      draw((await api('agent-state')).trace);
    } catch {}
  }

  $('agent-search').onclick = async () => {
    if (submitting) return;
    const query = $('agent-query').value.trim();
    if (!query) {
      $('agent-feedback').textContent = '请输入想找的书名。';
      $('agent-query').focus();
      return;
    }
    submitting = true;
    $('agent-search').disabled = true;
    $('agent-search').setAttribute('aria-busy', 'true');
    $('agent-feedback').textContent = '正在前往 QQ 阅读搜索…';
    setActivityTab('agent', true);

    let polling = false;
    const timer = setInterval(async () => {
      if (polling) return;
      polling = true;
      try {
        await pollTrace();
      } finally {
        polling = false;
      }
    }, 350);

    try {
      const result = await api('agent-search', { title: query });
      $('url').value = result.url;
      $('url').dispatchEvent(new Event('change', { bubbles: true }));
      $('title').value = result.title;
      $('agent-feedback').textContent = `找到《${result.title}》，已填入 QQ阅读网址。可继续读取目录。`;
      notice('AI代理搜索完成，已填入 QQ阅读网址。');
    } catch (error) {
      $('agent-feedback').textContent = error.message;
    } finally {
      clearInterval(timer);
      await pollTrace();
      submitting = false;
      $('agent-search').disabled = false;
      $('agent-search').removeAttribute('aria-busy');
      await refresh();
    }
  };

  // 支持回车直接搜索与 Ctrl+Enter 快捷键
  $('agent-query').onkeydown = event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      $('agent-search').click();
    }
  };

  void pollTrace();
})();
