import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Download, Loader2, RefreshCw, FileCode2, Save } from 'lucide-react';
import { generationApi, sourceSnapshot, busyJob, type Catalog, type GenerationJob, type SourceType } from '../../services/htmlGeneration';

interface Props { label: string; sourceType: SourceType; sourceId: string; title: string; source: unknown }
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50';
const stages: Record<string, string> = { starting: '正在创建 OpenCode 会话', model: '模型正在组织内容和图解', rendering: '正在排版 HTML', complete: '生成完成', failed: '生成失败', cancelled: '任务已取消', interrupted: '任务已中断' };

export function AiHtmlGeneratorButton(props: Props) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState('');
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [theme, setTheme] = useState('cobalt-editorial');
  const [mode, setMode] = useState('slides');
  const [pages, setPages] = useState(6);
  const [instructions, setInstructions] = useState('');
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [history, setHistory] = useState<GenerationJob[]>([]);
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const preview = useRef<HTMLIFrameElement>(null);
  const pendingExport = useRef<{ id: string; resolve: (html: string) => void; reject: (error: Error) => void } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const heading = useId();
  const busy = busyJob(job);
  const selectedProvider = catalog?.providers.find(p => p.id === provider);
  const selectedModel = selectedProvider?.models.find(m => m.id === model);
  const editable = html.includes('data-editor-runtime="frontend-slides-editable"');
  useEffect(() => { setSaved(false); }, [job?.id]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== preview.current?.contentWindow || event.data?.type !== 'open-slide-export-result') return;
      const pending = pendingExport.current;
      if (!pending || event.data.requestId !== pending.id) return;
      pendingExport.current = null;
      if (typeof event.data.html === 'string') pending.resolve(event.data.html);
      else pending.reject(new Error('编辑器导出失败，请重试。'));
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  function exportCurrent(): Promise<string> {
    if (!editable) return Promise.resolve(html);
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID(); pendingExport.current = { id, resolve, reject };
      preview.current?.contentWindow?.postMessage({ type: 'open-slide-export-request', requestId: id }, '*');
      window.setTimeout(() => { if (pendingExport.current?.id === id) { pendingExport.current = null; reject(new Error('编辑器尚未就绪，请稍后重试。')); } }, 15000);
    });
  }

  function chooseProvider(id: string, data = catalog) {
    const p = data?.providers.find(p => p.id === id);
    setProvider(id); setModel(p?.models.some(m => m.id === p.default) ? p.default! : p?.models[0]?.id ?? ''); setVariant('');
  }
  async function loadCatalog() {
    setLoading(true); setError('');
    try {
      const data = await generationApi<Catalog>('/catalog'); setCatalog(data);
      const preferred = data.providers.find(p => p.id === 'siliconflow-cn') ?? data.providers[0];
      chooseProvider(preferred?.id ?? '', data);
      if (!data.providers.length) setError('OpenCode 尚未连接模型服务，请先在 OpenCode 中配置模型。');
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    if (!open) return;
    const d = dialog.current; d?.showModal();
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    void loadCatalog();
    setHydrating(true);
    let disposed = false;
    generationApi<GenerationJob[]>(`/jobs?source_type=${encodeURIComponent(props.sourceType)}&source_id=${encodeURIComponent(props.sourceId)}`)
      .then(rows => { if (!disposed) { setHistory(rows); setJob(rows[0] ?? null); } }).catch(e => { if (!disposed) setError(e.message); }).finally(() => { if (!disposed) setHydrating(false); });
    return () => { disposed = true; document.body.style.overflow = previous; d?.close(); opener.current?.focus(); };
  }, [open, props.sourceId, props.sourceType]);
  useEffect(() => {
    if (!open || !job) return;
    let disposed = false;
    if (job.status === 'succeeded') {
      generationApi<string>(`/jobs/${job.id}/result`, {}, true).then(result => { if (!disposed) setHtml(result); }).catch(e => { if (!disposed) setError(e.message); });
    }
    if (!busyJob(job)) return () => { disposed = true; };
    const timer = window.setInterval(() => {
      generationApi<GenerationJob>(`/jobs/${job.id}`).then(next => {
        if (!disposed) { setJob(next); setError(''); setHistory(rows => [next, ...rows.filter(r => r.id !== next.id)]); }
      }).catch(e => { if (!disposed) setError(e.message); });
    }, 2000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [open, job?.id, job?.status]);

  async function generate(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (!model || !provider) { setError('请选择可用模型。'); return; }
    if (snapshot.length > 80000) { setError('当前页面内容超过 80,000 字符，请缩减内容后生成。'); return; }
    setSubmitting(true);
    try {
      const next = await generationApi<GenerationJob>('/jobs', { method: 'POST', body: JSON.stringify({ source_type: props.sourceType, source_id: props.sourceId, title: props.title.slice(0, 160), content: snapshot, provider_id: provider, model_id: model, variant, theme, mode, page_count: pages, instructions }) });
      setJob(next); setHtml(''); setHistory(rows => [next, ...rows]);
    } catch (e) { setError((e as Error).message); }
    finally { setSubmitting(false); }
  }
  async function cancel() {
    if (!job) return;
    setSubmitting(true);
    try { setJob(await generationApi<GenerationJob>(`/jobs/${job.id}/cancel`, { method: 'POST' })); }
    catch (e) { setError((e as Error).message); }
    finally { setSubmitting(false); }
  }
  async function saveEdits() {
    if (!job) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      const current = await exportCurrent();
      await generationApi(`/jobs/${job.id}/result`, { method: 'PUT', body: JSON.stringify({ html: current }) });
      setSaved(true);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }
  async function download() {
    setSaving(true); setError('');
    try {
    const current = await exportCurrent();
    const url = URL.createObjectURL(new Blob([current], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${props.title.replace(/[\\/:*?"<>|]/g, '-').slice(0, 70)}.html`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }
  return <>
    <button ref={opener} type="button" onClick={() => { setSnapshot(sourceSnapshot(props.source)); setJob(null); setHtml(''); setError(''); setOpen(true); }} className="px-2.5 py-1 text-xs rounded-lg border border-purple-200 bg-purple-50/70 text-purple-800 hover:bg-purple-100 transition-colors flex items-center gap-1 shadow-2xs font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-violet-500" title={props.label}>
      <Sparkles size={12} className="text-purple-600" /><span>{props.label}</span>
    </button>
    {open && createPortal(<dialog ref={dialog} aria-labelledby={heading} onCancel={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }} className="m-auto w-[min(1240px,96vw)] max-h-[92dvh] rounded-3xl border-0 bg-slate-50 p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
        <div><div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-violet-600"><FileCode2 size={15} /> Open Slide · OpenCode</div><h2 id={heading} className="text-xl font-bold">AI 可视化生成</h2><p className="mt-1 max-w-[850px] truncate text-sm text-slate-500">{props.title}</p></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="关闭生成窗口" className="rounded-full p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-violet-500"><X size={20} /></button>
      </header>
      <div className="grid lg:grid-cols-[340px_minmax(0,1fr)]">
        <form onSubmit={generate} className="space-y-4 border-r border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between text-sm font-semibold"><span>模型与基本设置</span><button type="button" onClick={loadCatalog} disabled={loading || busy || submitting} aria-label="刷新模型列表" className="rounded-lg p-2 text-violet-600 disabled:opacity-40"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button></div>
          <label className="block text-sm text-slate-600">模型服务<select aria-label="模型服务" className={`${field} mt-1.5`} value={provider} onChange={e => chooseProvider(e.target.value)} disabled={loading || busy || submitting}><option value="">选择服务</option>{catalog?.providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="block text-sm text-slate-600">模型<select aria-label="模型" className={`${field} mt-1.5`} value={model} onChange={e => { setModel(e.target.value); setVariant(''); }} disabled={loading || busy || submitting}><option value="">选择模型</option>{selectedProvider?.models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
          {!!selectedModel?.variants.length && <label className="block text-sm text-slate-600">推理档位<select className={`${field} mt-1.5`} value={variant} onChange={e => setVariant(e.target.value)} disabled={busy || submitting}><option value="">模型默认</option>{selectedModel.variants.map(v => <option key={v}>{v}</option>)}</select></label>}
          <label className="block text-sm text-slate-600">输出形式<select className={`${field} mt-1.5`} value={mode} onChange={e => setMode(e.target.value)} disabled={busy || submitting}><option value="slides">演示幻灯片</option><option value="explainer">连续阅读图解</option></select></label>
          <label className="block text-sm text-slate-600">设计风格<select className={`${field} mt-1.5`} value={theme} onChange={e => setTheme(e.target.value)} disabled={busy || submitting}><option value="cobalt-editorial">钴蓝编辑 · 清晰专业</option><option value="noir-signal">黑金信号 · 强对比</option><option value="paper-narrative">纸上叙事 · 温暖人文</option></select></label>
          <label className="block text-sm text-slate-600">页数 <span className="float-right font-semibold text-violet-600">{pages} 页</span><input aria-label="页数" type="range" min="3" max="12" value={pages} onChange={e => setPages(Number(e.target.value))} disabled={busy || submitting} className="mt-3 w-full accent-violet-600" /></label>
          <label className="block text-sm text-slate-600">补充要求<textarea className={`${field} mt-1.5 resize-y`} rows={3} maxLength={2000} placeholder="例如：突出核心结论，用流程图解释实现路径" value={instructions} onChange={e => setInstructions(e.target.value)} disabled={busy || submitting} /></label>
          <p className="text-xs leading-5 text-slate-400">使用当前页面正文和结构化内容，不包含附件。生成内容由所选模型服务处理。输出为可离线打开的 HTML。</p>
          <button type="submit" disabled={!model || busy || loading || hydrating || submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:opacity-40">{busy || submitting ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}{busy ? '生成中' : '生成 HTML'}</button>
          {busy && <button type="button" onClick={cancel} disabled={submitting} className="w-full rounded-lg border border-slate-200 py-2 text-sm">取消任务</button>}
        </form>
        <div className="min-w-0 p-6">
          {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p role="status" className="text-sm text-slate-500">{saved ? '修改已保存' : job ? stages[job.stage] ?? job.status : '准备生成'}</p>{html && job?.status === 'succeeded' && <div className="flex gap-2">{editable && <button type="button" onClick={saveEdits} disabled={saving} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"><Save size={15} />保存修改</button>}<button type="button" onClick={download} disabled={saving} className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-700 disabled:opacity-40"><Download size={15} />下载 HTML</button></div>}</div>
          {editable && <p className="mb-3 text-xs leading-5 text-slate-500">点击预览左上角 Edit 编辑，Pages 管理页面，Unlock layout 解锁文字拖动。编辑后保存修改，或下载当前版本。</p>}
          {job?.error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{job.error}</p>}
          {html && job?.status === 'succeeded' ? <iframe ref={preview} title="生成 HTML 预览" srcDoc={html} sandbox="allow-scripts allow-downloads" className="h-[550px] w-full rounded-2xl border border-slate-200 bg-white" /> : <div className="flex min-h-[390px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-8 text-center"><div className="mb-5 rounded-2xl bg-violet-50 p-5 text-violet-600">{busy ? <Loader2 size={30} className="animate-spin" /> : <FileCode2 size={30} />}</div><h3 className="text-lg font-semibold">{busy ? '正在把知识变成视觉叙事' : '让当前页面成为一份精美 HTML'}</h3><p className="mt-3 max-w-md text-sm leading-6 text-slate-500">{busy ? '可关闭窗口继续使用知识库，再次打开即可查看任务。' : '自动组织重点、选择图解布局、应用统一主题；生成后可在这里预览与下载。'}</p></div>}
          {!!history.length && <label className="mt-5 block text-xs text-slate-500">本页生成记录<select aria-label="生成记录" className={`${field} mt-2`} value={job?.id ?? ''} disabled={busy || submitting} onChange={e => { setHtml(''); setError(''); setJob(history.find(j => j.id === e.target.value) ?? null); }}>{history.map(j => <option key={j.id} value={j.id}>{new Date(j.created_at * 1000).toLocaleString()} · {j.model_id} · {stages[j.stage] ?? j.status}</option>)}</select></label>}
        </div>
      </div>
    </dialog>, document.body)}
  </>;
}
