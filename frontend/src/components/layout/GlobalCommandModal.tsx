import React, { useState, useEffect } from 'react';
import { Search, LayoutGrid, BookOpen, Compass, Activity, PlusCircle, Bot, Award, User, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { NAV_ITEMS } from './AppSidebar';
import type { Project } from '../../types';

interface GlobalCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onNavigate: (tab: string, filter?: string) => void;
  onSelectProject: (id: string) => void;
}

export const GlobalCommandModal: React.FC<GlobalCommandModalProps> = ({
  isOpen,
  onClose,
  projects,
  onNavigate,
  onSelectProject,
}) => {
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (isOpen) setKeyword('');
  }, [isOpen]);

  const filteredProjects = projects.filter(
    (p) =>
      !keyword ||
      p.name.toLowerCase().includes(keyword.toLowerCase()) ||
      p.description?.toLowerCase().includes(keyword.toLowerCase())
  );

  // 扁平化所有可跳转的导航项
  const flatNavList = React.useMemo(() => {
    const list: { key: string; label: string; icon: any }[] = [];
    NAV_ITEMS.forEach((item) => {
      if (item.children) {
        item.children.forEach((c) => {
          list.push({ key: c.key, label: `${item.label} · ${c.label}`, icon: c.icon });
        });
      } else {
        list.push({ key: item.key, label: item.label, icon: item.icon });
      }
    });
    list.push({ key: 'journal', label: '个人知识库 · 工作日记', icon: BookOpen });
    list.push({ key: 'knowledge-collector', label: '个人知识库 · 知识收集', icon: BookOpen });
    list.push({ key: 'business-analysis', label: '个人知识库 · 商业分析', icon: BookOpen });
    list.push({ key: 'biography', label: '个人知识库 · 个人传记', icon: BookOpen });
    list.push({ key: 'profile', label: '个人中心 · 资产与设置', icon: User });
    return list;
  }, []);


  const filteredNavs = flatNavList.filter(
    (n) => !keyword || n.label.toLowerCase().includes(keyword.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      <div className="flex flex-col gap-4 -m-2">
        {/* 搜索输入 */}
        <div className="relative flex items-center border-b border-[#e2e8f0] pb-3 px-1">
          <Search size={18} className="text-[#94a3b8] absolute left-3" />
          <input
            autoFocus
            type="text"
            placeholder="输入关键词跳转页面或搜索项目/知识..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border-none outline-none text-[#0f172a] placeholder-[#94a3b8]"
          />
        </div>

        {/* 快速导航分组 */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold tracking-wider text-[#94a3b8] uppercase px-2">
            页面导航
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {filteredNavs.map((nav) => {
              const Icon = nav.icon;
              return (
                <button
                  key={nav.key}
                  type="button"
                  onClick={() => {
                    onNavigate(nav.key);
                    onClose();
                  }}
                  className="flex items-center gap-2.5 p-2 px-3 rounded-lg text-xs font-medium text-[#334155] hover:bg-[#f1f5f9] hover:text-[#2b5aed] transition-colors text-left cursor-pointer border border-transparent hover:border-[#e2e8f0]"
                >
                  <Icon size={15} />
                  <span>{nav.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
