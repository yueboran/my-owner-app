'use strict';
// 队列模块状态与执行队列 UI 控制
labels.queued = '等待执行';
let studioQueue = { pending: [], activeId: null, paused: false, error: null };
let queueSubmitting = false;
let queueManaging = false;

// 将右侧“抓取与校验”面板与“执行队列”整合到同一个卡片内，使用 Tab 切换
const activitySection = document.querySelector('.activity.panel');
let queuePanel = null;
let activityPanel = null;
let queueTab = null;
let activityTab = null;

if (activitySection) {
  // 修改卡片标题为“执行与校验”
  const heading = activitySection.querySelector('.panel-heading h2');
  if (heading) heading.textContent = '执行与校验';

  // 创建与来源选择一致的 Tab 切换栏
  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'tabs';
  tabsContainer.setAttribute('role', 'tablist');
  tabsContainer.id = 'activity-tabs';
  tabsContainer.innerHTML = `
    <button type="button" role="tab" id="queue-tab" class="selected" aria-selected="true" aria-controls="queue-panel">执行队列 <span id="queue-count">0</span></button>
    <button type="button" role="tab" id="activity-tab" aria-selected="false" aria-controls="activity-panel">抓取校验</button>
  `;

  // 创建执行队列面板
  queuePanel = document.createElement('div');
  queuePanel.id = 'queue-panel';
  queuePanel.setAttribute('role', 'tabpanel');
  queuePanel.setAttribute('aria-labelledby', 'queue-tab');
  queuePanel.innerHTML = `
    <div class="queue-toolbar">
      <p id="queue-status" role="status" class="hint"></p>
      <div class="buttons">
        <button type="button" id="queue-run" class="button secondary">运行队列</button>
        <button type="button" id="queue-pause" class="button secondary">暂停队列</button>
      </div>
    </div>
    <div id="queue-active"></div>
    <ol id="queue-list" class="queue-list"></ol>
    <p class="hint">任务按顺序逐个执行；暂停队列只停止后续调度，当前任务继续。暂停当前任务会暂停整个队列。失败后队列暂停，等待处理。重启后需手动运行队列。</p>
  `;

  // 创建抓取校验面板，并将原有的空状态、任务详情、校验提示收纳进该面板
  activityPanel = document.createElement('div');
  activityPanel.id = 'activity-panel';
  activityPanel.setAttribute('role', 'tabpanel');
  activityPanel.setAttribute('aria-labelledby', 'activity-tab');
  activityPanel.hidden = true;

  const emptyState = document.querySelector('#empty-state');
  const jobDetail = document.querySelector('#job-detail');
  const validationNote = document.querySelector('.validation-note');
  if (emptyState) activityPanel.append(emptyState);
  if (jobDetail) activityPanel.append(jobDetail);
  if (validationNote) activityPanel.append(validationNote);

  // 挂载到右侧卡片内部
  activitySection.querySelector('.panel-heading').after(tabsContainer);
  tabsContainer.after(queuePanel);
  queuePanel.after(activityPanel);

  queueTab = document.querySelector('#queue-tab');
  activityTab = document.querySelector('#activity-tab');
}

// Tab 切换逻辑
let activeActivityTab = 'queue';
let userTabLocked = false;

function setActivityTab(tabName, isUserAction = false) {
  if (isUserAction) userTabLocked = true;
  activeActivityTab = tabName;
  const isQueue = tabName === 'queue';

  if (queueTab && activityTab) {
    queueTab.classList.toggle('selected', isQueue);
    queueTab.setAttribute('aria-selected', String(isQueue));
    queueTab.tabIndex = isQueue ? 0 : -1;

    activityTab.classList.toggle('selected', !isQueue);
    activityTab.setAttribute('aria-selected', String(!isQueue));
    activityTab.tabIndex = !isQueue ? 0 : -1;
  }
  if (queuePanel) queuePanel.hidden = !isQueue;
  if (activityPanel) activityPanel.hidden = isQueue;
}

if (queueTab && activityTab) {
  queueTab.onclick = () => setActivityTab('queue', true);
  activityTab.onclick = () => setActivityTab('activity', true);

  queueTab.onkeydown = event => {
    if (['ArrowRight', 'End'].includes(event.key)) {
      event.preventDefault();
      setActivityTab('activity', true);
      activityTab.focus();
    }
  };
  activityTab.onkeydown = event => {
    if (['ArrowLeft', 'Home'].includes(event.key)) {
      event.preventDefault();
      setActivityTab('queue', true);
      queueTab.focus();
    }
  };
}

// 点击队列中的任务查看详情时，自动切换到“抓取校验”Tab
function viewQueuedJob(id) {
  selectedId = id;
  lastDetail = '';
  render();
  setActivityTab('activity', true);
  document.querySelector('#job-detail')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function queueButton(text, work, disabled = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button secondary';
  button.textContent = text;
  button.disabled = disabled || queueManaging;
  button.onclick = work;
  return button;
}

async function manageQueue(action, id) {
  if (queueManaging) return;
  queueManaging = true;
  renderQueue();
  try {
    studioQueue = await api('queue', { action, id });
    await refresh();
  } catch (error) {
    notice(error.message);
  } finally {
    queueManaging = false;
    renderQueue();
  }
}

let initialTabDecided = false;
let hadRunningJob = false;

function renderQueue() {
  const queueCountEl = document.querySelector('#queue-count');
  if (queueCountEl) queueCountEl.textContent = String(studioQueue.pending.length);

  const queueStatusEl = document.querySelector('#queue-status');
  if (queueStatusEl) {
    queueStatusEl.textContent = studioQueue.error || (studioQueue.paused ? '队列已暂停' : studioQueue.activeId || current ? '正在按顺序执行任务' : '队列运行中，等待新任务');
  }

  const queueRunBtn = document.querySelector('#queue-run');
  if (queueRunBtn) {
    queueRunBtn.disabled = queueManaging || (!studioQueue.paused && !studioQueue.pending.length);
  }

  const queuePauseBtn = document.querySelector('#queue-pause');
  if (queuePauseBtn) {
    queuePauseBtn.disabled = queueManaging || studioQueue.paused;
  }

  const active = document.querySelector('#queue-active');
  if (active) {
    active.replaceChildren();
    const currentEntry = jobs.find(job => job.id === (studioQueue.activeId || current?.id));
    if (currentEntry) {
      const title = document.createElement('span');
      title.textContent = '正在执行：' + (currentEntry.title || '正在读取书名');
      active.append(title, queueButton('查看当前任务', () => viewQueuedJob(currentEntry.id)));
    }
  }

  const list = document.querySelector('#queue-list');
  if (list) {
    list.replaceChildren();
    studioQueue.pending.forEach((id, index) => {
      const job = jobs.find(job => job.id === id);
      const row = document.createElement('li');
      const info = document.createElement('div');
      const name = document.createElement('strong');
      const detail = document.createElement('span');
      const actions = document.createElement('div');

      name.textContent = (index + 1) + '. ' + (job?.title || '未命名电子书');
      detail.textContent = job?.kind === 'import' ? '本地 HTML 导入' : job ? '第 ' + job.start + '—' + job.end + ' 章 · ' + job.url : '等待加载任务';
      info.className = 'queue-info';
      info.append(name, detail);
      actions.className = 'buttons';
      actions.append(
        queueButton('查看', () => viewQueuedJob(id)),
        queueButton('移至队首', () => manageQueue('top', id), index === 0),
        queueButton('上移', () => manageQueue('up', id), index === 0),
        queueButton('下移', () => manageQueue('down', id), index === studioQueue.pending.length - 1),
        queueButton('移出队列', () => manageQueue('remove', id))
      );
      row.append(info, actions);
      list.append(row);
    });

    if (!studioQueue.pending.length) {
      const empty = document.createElement('li');
      empty.className = 'hint';
      empty.textContent = '暂无等待任务；可继续填写来源并加入队列。';
      list.append(empty);
    }
  }
}

const queueRunBtn = document.querySelector('#queue-run');
if (queueRunBtn) queueRunBtn.onclick = () => manageQueue('resume');

const queuePauseBtn = document.querySelector('#queue-pause');
if (queuePauseBtn) queuePauseBtn.onclick = () => manageQueue('pause');

const apiBeforeQueue = api;
api = async function (route, ...args) {
  const result = await apiBeforeQueue(route, ...args);
  if (route === 'state' && result.queue) {
    studioQueue = result.queue;

    // 初次获取服务器状态时决策默认 Tab
    if (!initialTabDecided && !userTabLocked) {
      initialTabDecided = true;
      if (studioQueue.pending.length === 0 && !studioQueue.activeId && !result.current && result.jobs && result.jobs.length > 0) {
        setActivityTab('activity', false);
      } else {
        setActivityTab('queue', false);
      }
    }

    // 追踪运行状态：当运行中的队列全部完成时自动展示校验成果
    if (studioQueue.activeId || result.current) {
      hadRunningJob = true;
    } else if (hadRunningJob && studioQueue.pending.length === 0 && !studioQueue.activeId && !result.current) {
      hadRunningJob = false;
      if (!userTabLocked) {
        setActivityTab('activity', false);
      }
    }
  }
  return result;
};

const renderBeforeQueue = render;
render = function () {
  renderBeforeQueue();
  const startBtn = document.querySelector('#start-capture');
  if (startBtn) {
    startBtn.disabled = queueSubmitting;
    startBtn.textContent = queueSubmitting ? '正在加入队列…' : '加入执行队列';
  }
  renderQueue();
};

const captureForm = document.querySelector('#capture-form');
if (captureForm) {
  captureForm.onsubmit = event => {
    event.preventDefault();
    if (queueSubmitting) return;
    void (async () => {
      queueSubmitting = true;
      render();
      try {
        const job = await api('start', config());
        selectedId = job.id;
        lastDetail = '';
        notice('任务已加入执行队列。');
        await refresh();
      } catch (error) {
        notice(error.message);
      } finally {
        queueSubmitting = false;
        render();
      }
    })();
  };
}

render();
