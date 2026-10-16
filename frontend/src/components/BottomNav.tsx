/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Home, PlusCircle, Activity, User, Archive } from "lucide-react";

interface BottomNavProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
  onSubmitIdea?: () => void;
}

export default function BottomNav({ currentTab, onChangeTab }: BottomNavProps) {
  const navItems = [
    { id: "home", label: "首页", icon: Home },
    { id: "archive", label: "档案馆", icon: Archive },
    { id: "submit", label: "草稿箱", icon: PlusCircle },
    { id: "profile", label: "我的", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 pb-safe bg-[#141416]/90 backdrop-blur-2xl border-t border-[#242428] shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
      {navItems.map((item) => {
        const isActive = currentTab === item.id;
        const IconComponent = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => onChangeTab(item.id)}
            className={`flex flex-col items-center justify-center relative cursor-pointer py-2 w-16 select-none transition-all duration-300 active:scale-95 ${
              isActive
                ? "text-[#E0E0E0]"
                : "text-[#606060] hover:text-[#A0A0A0]"
            }`}
          >
            <IconComponent className={`w-5 h-5 mb-1 transition-all duration-300 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="font-mono text-[10px] font-medium tracking-wider">
              {item.label}
            </span>
            {/* Active Indicator */}
            {isActive && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#E0E0E0] rounded-b-full shadow-[0_0_8px_rgba(224,224,224,0.5)]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
