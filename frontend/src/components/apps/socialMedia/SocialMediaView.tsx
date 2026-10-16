import React from 'react';
import { ArrowRight, Inbox, ListFilter, PenLine, Send } from 'lucide-react';

const stages = [
  { title: '信息收集', icon: Inbox, description: '汇集平台链接、内容与灵感，保留信息来源。', next: '从手动录入链接和内容开始' },
  { title: '信息筛选', icon: ListFilter, description: '整理标签，筛选值得关注和继续加工的信息。', next: '逐步加入标签、搜索与去重' },
  { title: '内容处理', icon: PenLine, description: '将收集的信息转化为笔记、选题和内容草稿。', next: '逐步加入摘要与草稿编辑' },
  { title: '发布管理', icon: Send, description: '跟踪不同平台的发布准备、进度与结果。', next: '先管理发布清单，再接入平台能力' },
];

export function SocialMediaView() {
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8 space-y-8">
      <header className="space-y-3">
        <a href="#marketplace" className="inline-block text-sm text-blue-700 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">← 返回应用广场</a>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">自媒体工作台</h1>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">基础搭建中</span>
        </div>
        <p className="text-slate-600 leading-relaxed">把分散在各个平台的信息，逐步整理成可以使用和发布的内容。</p>
      </header>

      <section aria-labelledby="social-platforms" className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 id="social-platforms" className="text-lg font-semibold text-slate-900">平台范围</h2>
        <p className="mt-2 text-sm text-slate-500">首批规划以下平台，后续按需扩展。</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {['小红书', 'X（推特）', '微信公众号'].map(platform => (
            <li key={platform} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-4">
              <span className="font-medium text-slate-800">{platform}</span>
              <span className="text-xs text-slate-500">待接入</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="social-workflow">
        <h2 id="social-workflow" className="text-lg font-semibold text-slate-900">从收集到发布</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stages.map(({ title, icon: Icon, description, next }, index) => (
            <li key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between text-blue-600">
                <Icon size={22} aria-hidden="true" />
                <span className="font-mono text-xs text-slate-400">0{index + 1}</span>
              </div>
              <h3 className="mt-5 font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">{next}</p>
            </li>
          ))}
        </ol>
      </section>

      <aside className="flex items-start gap-3 rounded-xl bg-blue-50 p-5 text-blue-900">
        <ArrowRight size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <h2 className="font-medium">下一步：建立信息收集箱</h2>
          <p className="mt-1 text-sm leading-6">当前已建立应用入口与基础结构。信息收集、筛选、处理和发布功能将逐步开发；平台账号尚未连接。</p>
        </div>
      </aside>
    </div>
  );
}
