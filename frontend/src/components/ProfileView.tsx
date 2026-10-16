/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 现代企业级用户个人中心 (User Profile View)
 * 纯净浅色玻璃拟态设计，管理个人账号、头像、权限等级与快捷偏好
 */

import React, { useRef } from 'react';
import {
  User,
  Mail,
  ShieldCheck,
  Sparkles,
  Calendar,
  LogOut,
  Camera,
  Layers,
  Crown,
  Laptop,
  CheckCircle2,
} from 'lucide-react';
import type { UserProfile } from '../hooks/useAuth';

interface ProfileViewProps {
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  onAvatarUpload?: (file: File) => void;
  onNavigateToAuth?: () => void;
}

export default function ProfileView({
  currentUser,
  onLogout,
  onAvatarUpload,
  onNavigateToAuth,
}: ProfileViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = currentUser?.username || currentUser?.email?.split('@')[0] || 'Zenilma Zr';
  const email = currentUser?.email || 'admin@startracer.ai';
  const role = currentUser?.role || '系统超级管理员';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAvatarUpload) {
      onAvatarUpload(file);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* 1. 顶部 Header 题头 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
            <User size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>个人中心 · 账号管理</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                PRO 商业版
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              管理个人基础资料、工作区成员身份及系统授权偏好
            </p>
          </div>
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200/80 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <LogOut size={14} />
            <span>退出当前账号</span>
          </button>
        )}
      </div>

      {/* 2. 用户核心名片卡片 */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
        {/* 背景光斑 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* 头像区域 */}
          <div className="relative group shrink-0">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt="Avatar"
                className="w-24 h-24 rounded-3xl object-cover border-2 border-white shadow-md ring-4 ring-indigo-50"
              />
            ) : (
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-3xl shadow-md ring-4 ring-indigo-50 select-none">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-slate-900 text-white shadow-md hover:bg-indigo-600 transition-colors cursor-pointer"
              title="更换个人头像"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* 用户基础信息 */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-2">
                  <span>{displayName}</span>
                  <Crown size={16} className="text-amber-500 fill-amber-500" />
                </h2>
                <p className="text-xs text-slate-500 mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                  <Mail size={13} className="text-slate-400" />
                  <span>{email}</span>
                </p>
              </div>

              <span className="self-center sm:self-start px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                正常在线 (Active)
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400 block font-medium">系统角色</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">{role}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400 block font-medium">订阅方案</span>
                <span className="text-xs font-bold text-indigo-600 mt-0.5 block">企业尊享 Plus</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400 block font-medium">认证方式</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block flex items-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  安全令牌直连
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 系统特性与授权特权 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Sparkles size={16} className="text-indigo-600" />
            <span>智能体与大模型算力特权</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span>全域任务意图智能路由引擎（零延迟毫秒级分发）</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span>BlockSuite / EdgelessEditor 无界自由画布无限图元存储</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span>华夏星图全国 370+ 地级市文脉与足迹全景数据同步</span>
            </li>
          </ul>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Laptop size={16} className="text-indigo-600" />
            <span>数据安全与运行环境</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span>本地离线首选 (Local-First) 与云端实时端到端加密备份</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span>支持全量知识库 JSON 导出与跨工作区一键迁移</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span>客户端当前版本：v2.4.0 (Enterprise Production Build)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
