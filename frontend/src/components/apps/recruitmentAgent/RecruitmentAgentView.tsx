import React from 'react';
import { Bot, Briefcase, Globe, Workflow } from 'lucide-react';

const modules = [
  { title: '浏览器连接', icon: Globe, description: '通过 Laya 接入浏览器会话，观察招聘网站页面。', status: 'Laya 待接入' },
  { title: 'LLM 任务理解', icon: Bot, description: '理解求职需求，规划可查看的浏览器操作步骤。', status: 'LLM 待配置' },
  { title: '招聘网站操作', icon: Briefcase, description: '从 BOSS直聘开始，逐步支持职位搜索、筛选与详情整理。', status: '网站待适配' },
  { title: '求职任务跟进', icon: Workflow, description: '逐步记录代理执行过程、任务结果和求职进度。', status: '功能待开发' },
];

export function RecruitmentAgentView() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <header className="space-y-3">
        <a href="#marketplace" className="inline-block rounded text-sm text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">← 返回应用广场</a>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">招聘浏览器代理</h1>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">基础搭建中</span>
        </div>
        <p className="leading-relaxed text-slate-600">连接 Laya 与 LLM，让浏览器逐步完成招聘网站上的求职任务。</p>
      </header>

      <section aria-labelledby="recruitment-connections" className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 id="recruitment-connections" className="text-lg font-semibold text-slate-900">从一个网站、一个任务开始</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">首批规划 BOSS直聘，其他招聘网站按需扩展。先打通浏览器与模型连接，再逐步增加具体操作。</p>
        <p className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-sm leading-6 text-teal-800">工作流程：提出求职需求 → LLM 规划步骤 → Laya 操作浏览器 → 查看执行结果</p>
      </section>

      <section aria-labelledby="recruitment-modules">
        <h2 id="recruitment-modules" className="text-lg font-semibold text-slate-900">应用基础模块</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {modules.map(({ title, icon: Icon, description, status }) => (
            <li key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <Icon size={22} className="text-teal-700" aria-hidden="true" />
                <span className="text-xs text-slate-500">{status}</span>
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </li>
          ))}
        </ul>
      </section>

      <aside className="rounded-xl bg-slate-100 p-5">
        <h2 className="font-medium text-slate-900">下一步：明确 Laya 接入方式</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">当前为应用骨架，尚未连接浏览器、模型或招聘账号。后续先确定 Laya 的具体项目及调用接口，再实现第一个浏览器任务。</p>
      </aside>
    </div>
  );
}
