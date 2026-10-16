/// <reference types="vite/client" />
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../ui/Button';

const base = import.meta.env.DEV ? '/studio-app' : 'http://127.0.0.1:43824/studio-app';

/** Hosts the root application's original UI, scripts and authenticated local API. */
export function PageStudioView() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1100);
  const [connected, setConnected] = useState(false);
  const [checked, setChecked] = useState(false);
  const [revision, setRevision] = useState(0);
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width:767px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width:767px)');
    const update = () => setNarrow(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(4000) });
        const state = await response.json();
        if (!disposed) setConnected(response.ok && state.version === 'root-migration-v1');
      } catch { if (!disposed) setConnected(false); }
      if (!disposed) { setChecked(true); timer = setTimeout(check, 5000); }
    };
    void check();
    return () => { disposed = true; clearTimeout(timer); };
  }, [revision]);
  useEffect(() => {
    const resize = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== new URL(base, location.href).origin) return;
      if (event.data?.type === 'page-studio:height' && Number.isFinite(event.data.height)) {
        setHeight(Math.max(600, Math.min(30000, event.data.height)));
      }
    };
    window.addEventListener('message', resize);
    return () => window.removeEventListener('message', resize);
  }, []);
  if (!connected) return (
    <div className="p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3" role="status">
        <h1 className="text-xl font-bold text-slate-900">书页工坊</h1>
        <p className="text-sm text-slate-600">{checked ? '本机服务未连接。请运行 apps/page-studio/启动项目版.cmd，然后重新连接。' : '正在连接书页工坊原版应用…'}</p>
        <Button onClick={() => setRevision(value => value + 1)}>重新连接</Button>
      </div>
    </div>
  );
  const workbench = (
    <div className="page-studio-host min-w-0">
      <style>{`@media(max-width:767px){.page-studio-host{position:fixed;inset:0;z-index:40;background:#f4f6f9;overflow:auto}.page-studio-host .page-studio-mobile-back{display:block}}`}</style>
      <a href="#marketplace" className="page-studio-mobile-back hidden px-4 py-3 text-sm text-blue-700 bg-white border-b border-slate-200">← 返回应用合集</a>
      <iframe key={revision} ref={frame} title="书页工坊 · 原版完整工作台" src={`${base}/`} className="w-full border-0 block" style={{ height }} />
    </div>
  );
  return narrow ? createPortal(workbench, document.body) : workbench;
}
