/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 对话智能体 · 多级目录树形侧边栏与文档路径拖拽归档系统
 * 完全复刻图 2 现代化极简高对比度规范：
 * 1. 顶部经典饱满大胶囊新建按钮 + 新建目录 + 折叠面板
 * 2. 搜索框实时筛选与自动高亮匹配
 * 3. 无限级嵌套目录树（展开/折叠、新建子目录、内联重命名、删除）
 * 4. 原生 HTML5 拖拽快速调整文档存放路径（Drop 文件夹高亮吸附、根目录移出归档）
 * 5. 底部文档总数统计与“实时持久化”状态指示
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Pin,
  Trash2,
  Edit2,
  Copy,
  Split,
  Mail,
  Check,
  Clock,
  FileText,
  GripVertical,
  FolderInput,
} from 'lucide-react';
import type { ChatSession, ChatFolder } from '../../types/agentChat';

interface ChatSidebarTreeProps {
  sessions: ChatSession[];
  folders: ChatFolder[];
  activeSessionId: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  onSelectSession: (id: string) => void;
  onCreateNewSession: (folderId?: string | null) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onTogglePinSession: (id: string) => void;
  onToggleUnreadSession: (id: string) => void;
  onDuplicateSession: (id: string) => void;
  onCopySessionContent: (session: ChatSession) => void;
  // 多级目录操作
  onCreateFolder: (name: string, parentId?: string | null) => void;
  onRenameFolder: (id: string, newName: string) => void;
  onDeleteFolder: (id: string) => void;
  onToggleFolderExpand: (id: string) => void;
  onMoveSessionToFolder: (sessionId: string, targetFolderId: string | null) => void;
  showToast: (msg: string) => void;
}

export const ChatSidebarTree: React.FC<ChatSidebarTreeProps> = ({
  sessions,
  folders,
  activeSessionId,
  isOpen,
  onToggleOpen,
  onSelectSession,
  onCreateNewSession,
  onDeleteSession,
  onRenameSession,
  onTogglePinSession,
  onToggleUnreadSession,
  onDuplicateSession,
  onCopySessionContent,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onToggleFolderExpand,
  onMoveSessionToFolder,
  showToast,
}) => {
  // 搜索关键字
  const [searchKeyword, setSearchKeyword] = useState('');

  // 正在拖拽的会话 ID
  const [draggingSessionId, setDraggingSessionId] = useState<string | null>(null);
  // 当前鼠标拖拽悬停的目标放置区域（文件夹 ID 或 '__root__'）
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);

  // 内联创建目录状态：parentId (null 表示根级，string 表示子级，undefined 表示关闭)
  const [creatingParentId, setCreatingParentId] = useState<string | null | undefined>(undefined);
  const [creatingNameInput, setCreatingNameInput] = useState('');

  // 内联重命名目录状态
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderInput, setRenameFolderInput] = useState('');

  // 目录与会话的浮动三点菜单状态
  const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null);
  const [activeMenuFolderId, setActiveMenuFolderId] = useState<string | null>(null);

  // 内联重命名会话状态
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameSessionInput, setRenameSessionInput] = useState('');

  // 快捷移动会话的弹出子菜单
  const [movingSessionId, setMovingSessionId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  // 全局点击监听关闭三点菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuSessionId(null);
        setActiveMenuFolderId(null);
        setMovingSessionId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 拖拽释放处理
  const handleDropToFolder = (targetFolderId: string | null, targetName: string) => {
    if (!draggingSessionId) return;
    const dragged = sessions.find((s) => s.id === draggingSessionId);
    onMoveSessionToFolder(draggingSessionId, targetFolderId);
    showToast(`已将《${dragged?.title || '会话文档'}》移动至【${targetName}】`);
    setDraggingSessionId(null);
    setDragOverTargetId(null);
  };

  // 提交新建目录
  const handleSaveNewFolder = () => {
    if (creatingNameInput.trim()) {
      onCreateFolder(creatingNameInput.trim(), creatingParentId);
      showToast(`已创建目录「${creatingNameInput.trim()}」`);
    }
    setCreatingParentId(undefined);
    setCreatingNameInput('');
  };

  // 提交重命名目录
  const handleSaveRenameFolder = (folderId: string) => {
    if (renameFolderInput.trim()) {
      onRenameFolder(folderId, renameFolderInput.trim());
      showToast('已修改目录名称');
    }
    setRenamingFolderId(null);
  };

  // 提交重命名会话
  const handleSaveRenameSession = (sessionId: string) => {
    if (renameSessionInput.trim()) {
      onRenameSession(sessionId, renameSessionInput.trim());
      showToast('已修改文档名称');
    }
    setRenamingSessionId(null);
  };

  // 递归计算某个目录（包括其所有深层子目录）包含的全部会话数量
  const getFolderTotalCount = (folderId: string): number => {
    const directCount = sessions.filter((s) => s.folderId === folderId).length;
    const childFolders = folders.filter((f) => f.parentId === folderId);
    const childTotal = childFolders.reduce((sum, cf) => sum + getFolderTotalCount(cf.id), 0);
    return directCount + childTotal;
  };

  // 搜索过滤匹配的会话集合
  const isSessionMatching = (session: ChatSession): boolean => {
    if (!searchKeyword.trim()) return true;
    return session.title.toLowerCase().includes(searchKeyword.trim().toLowerCase());
  };

  // 顶级根目录与未归档文档
  const rootFolders = useMemo(() => folders.filter((f) => !f.parentId), [folders]);
  const unclassifiedSessions = useMemo(
    () =>
      sessions.filter((s) => {
        if (!s.folderId) return true;
        return !folders.some((f) => f.id === s.folderId);
      }),
    [sessions, folders]
  );

  // 侧边栏收起时的微型模式
  if (!isOpen) {
    return (
      <div className="h-full w-full lg:w-16 shrink-0 bg-white border-r border-[#E5E7EB] flex flex-col items-center py-3 gap-3 transition-all duration-300">
        <button
          type="button"
          onClick={() => onCreateNewSession(null)}
          title="新建文档"
          className="w-10 h-10 rounded-full bg-[#5146D8] hover:bg-[#4338CA] text-white flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-all"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={onToggleOpen}
          title="展开文档目录侧边栏"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <PanelLeftOpen size={18} />
        </button>
      </div>
    );
  }

  // 递归渲染文件夹节点组件
  const renderFolderNode = (folder: ChatFolder, depth: number = 0) => {
    const isExpanded = folder.isExpanded !== false;
    const childFolders = folders.filter((f) => f.parentId === folder.id);
    const folderSessions = sessions.filter((s) => s.folderId === folder.id);
    const filteredFolderSessions = folderSessions.filter(isSessionMatching);
    const totalCount = getFolderTotalCount(folder.id);
    const isDropOver = dragOverTargetId === folder.id;
    const isRenaming = renamingFolderId === folder.id;

    // 如果在搜索模式下，本目录和子目录均无匹配，则跳过渲染
    if (searchKeyword.trim() && filteredFolderSessions.length === 0 && childFolders.every(cf => getFolderTotalCount(cf.id) === 0)) {
      return null;
    }

    return (
      <div key={folder.id} className="select-none">
        {/* 文件夹整行：支持点击展开/折叠、作为拖拽释放目标 */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOverTargetId(folder.id);
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            if (dragOverTargetId === folder.id) setDragOverTargetId(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDropToFolder(folder.id, folder.name);
          }}
          className={`group flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-all ${
            isDropOver
              ? 'bg-indigo-50 border border-indigo-400 ring-2 ring-indigo-300/60 shadow-xs'
              : 'hover:bg-slate-100/80 text-[#374151]'
          }`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {isRenaming ? (
            <div className="flex items-center gap-1.5 flex-1 pr-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={renameFolderInput}
                autoFocus
                onChange={(e) => setRenameFolderInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRenameFolder(folder.id);
                  if (e.key === 'Escape') setRenamingFolderId(null);
                }}
                className="flex-1 text-xs px-2 py-1 rounded-md bg-white border border-indigo-400 outline-hidden font-medium text-slate-800"
              />
              <button
                type="button"
                onClick={() => handleSaveRenameFolder(folder.id)}
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
              >
                <Check size={13} />
              </button>
              <button
                type="button"
                onClick={() => setRenamingFolderId(null)}
                className="p-1 text-slate-400 hover:bg-slate-200/60 rounded"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <>
              {/* 左侧：折叠指示箭头 + 文件夹图标 + 目录名 */}
              <div
                className="flex items-center gap-1.5 min-w-0 flex-1"
                onClick={() => onToggleFolderExpand(folder.id)}
              >
                <button
                  type="button"
                  className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-transform"
                >
                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
                {isExpanded ? (
                  <FolderOpen size={15} className="text-[#5146D8] shrink-0" />
                ) : (
                  <Folder size={15} className="text-[#6B7280] shrink-0" />
                )}
                <span className="text-xs font-medium text-[#1F2937] truncate">{folder.name}</span>
                <span className="text-[11px] text-[#9CA3AF] shrink-0 font-mono">({totalCount})</span>
              </div>

              {/* 右侧悬浮快捷动作：新建文档、新建子目录、操作菜单 */}
              <div
                className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onCreateNewSession(folder.id)}
                  title="在该目录下新建文档"
                  className="p-1 rounded text-slate-400 hover:text-[#5146D8] hover:bg-indigo-50"
                >
                  <Plus size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingParentId(folder.id);
                    setCreatingNameInput('');
                    if (!isExpanded) onToggleFolderExpand(folder.id);
                  }}
                  title="新建子目录"
                  className="p-1 rounded text-slate-400 hover:text-[#5146D8] hover:bg-indigo-50"
                >
                  <FolderPlus size={13} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveMenuFolderId(activeMenuFolderId === folder.id ? null : folder.id)
                  }
                  title="目录设置"
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                >
                  <MoreVertical size={13} />
                </button>
              </div>
            </>
          )}

          {/* 目录操作浮动菜单 */}
          {activeMenuFolderId === folder.id && (
            <div
              ref={menuRef}
              className="absolute right-4 z-40 w-36 bg-white rounded-xl border border-slate-200 shadow-xl py-1 text-xs text-slate-700 animate-in fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setRenamingFolderId(folder.id);
                  setRenameFolderInput(folder.name);
                  setActiveMenuFolderId(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-left"
              >
                <Edit2 size={12} className="text-slate-500" />
                <span>重命名目录</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingParentId(folder.id);
                  setCreatingNameInput('');
                  setActiveMenuFolderId(null);
                  if (!isExpanded) onToggleFolderExpand(folder.id);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-left"
              >
                <FolderPlus size={12} className="text-slate-500" />
                <span>新建子目录</span>
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => {
                  onDeleteFolder(folder.id);
                  setActiveMenuFolderId(null);
                  showToast(`已删除目录「${folder.name}」`);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-red-50 text-red-600 text-left"
              >
                <Trash2 size={12} />
                <span>删除目录</span>
              </button>
            </div>
          )}
        </div>

        {/* 展开的子内容区域 */}
        {isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {/* 内联新建子目录输入框 */}
            {creatingParentId === folder.id && (
              <div
                className="flex items-center gap-1.5 py-1 px-2 my-1 rounded-lg bg-indigo-50/60 border border-indigo-200"
                style={{ marginLeft: `${(depth + 1) * 14}px` }}
              >
                <Folder size={14} className="text-[#5146D8] shrink-0" />
                <input
                  type="text"
                  value={creatingNameInput}
                  autoFocus
                  placeholder="子目录名称..."
                  onChange={(e) => setCreatingNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNewFolder();
                    if (e.key === 'Escape') setCreatingParentId(undefined);
                  }}
                  className="flex-1 text-xs px-2 py-1 rounded bg-white border border-indigo-300 outline-hidden font-medium"
                />
                <button
                  type="button"
                  onClick={handleSaveNewFolder}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setCreatingParentId(undefined)}
                  className="p-1 text-slate-400 hover:bg-slate-200/60 rounded"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* 嵌套递归子文件夹 */}
            {childFolders.map((cf) => renderFolderNode(cf, depth + 1))}

            {/* 属于当前目录的会话文档列表 */}
            {filteredFolderSessions.map((session) => renderSessionItem(session, depth + 1))}

            {filteredFolderSessions.length === 0 && childFolders.length === 0 && (
              <div
                className="text-[11px] text-slate-400 py-1 italic"
                style={{ paddingLeft: `${(depth + 1) * 14 + 18}px` }}
              >
                目录为空，可拖拽文档至此处
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // 渲染单个会话文档条目（对齐图 2 视觉效果与拖拽能力）
  const renderSessionItem = (session: ChatSession, depth: number = 0) => {
    const isActive = session.id === activeSessionId;
    const isDragging = draggingSessionId === session.id;
    const isRenaming = renamingSessionId === session.id;

    return (
      <div
        key={session.id}
        draggable={!isRenaming}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', session.id);
          setDraggingSessionId(session.id);
        }}
        onDragEnd={() => {
          setDraggingSessionId(null);
          setDragOverTargetId(null);
        }}
        className={`group relative rounded-lg transition-all ${
          isDragging ? 'opacity-40 ring-2 ring-dashed ring-indigo-400' : ''
        } ${
          isActive
            ? 'bg-[#EEF0FD] text-[#171A21] font-semibold'
            : 'text-[#374151] hover:bg-slate-100/90'
        }`}
        style={{ marginLeft: `${depth * 14 + 4}px` }}
      >
        {isRenaming ? (
          <div className="flex items-center gap-1.5 p-1.5" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={renameSessionInput}
              autoFocus
              onChange={(e) => setRenameSessionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRenameSession(session.id);
                if (e.key === 'Escape') setRenamingSessionId(null);
              }}
              className="flex-1 text-xs px-2 py-1 rounded bg-white border border-indigo-400 outline-hidden font-medium text-slate-800"
            />
            <button
              type="button"
              onClick={() => handleSaveRenameSession(session.id)}
              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              onClick={() => setRenamingSessionId(null)}
              className="p-1 text-slate-400 hover:bg-slate-200/60 rounded"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <div
            onClick={() => onSelectSession(session.id)}
            className="flex items-center justify-between px-2.5 py-2 cursor-pointer select-none"
          >
            {/* 拖拽把手图标 + 标题 */}
            <div className="flex items-center gap-2 min-w-0 pr-1 flex-1">
              <GripVertical
                size={13}
                className="text-slate-300 group-hover:text-slate-500 shrink-0 cursor-grab active:cursor-grabbing"
              />
              {session.isUnread && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#5146D8] shrink-0" title="未读文档" />
              )}
              <span
                className={`text-xs truncate ${
                  isActive ? 'text-[#171A21] font-medium' : 'text-[#4B5563]'
                }`}
              >
                {session.title || '无标题文档'}
              </span>
            </div>

            {/* 右侧动作图标组（置顶 + 三点菜单） */}
            <div
              className={`flex items-center gap-0.5 shrink-0 ${
                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onTogglePinSession(session.id)}
                title={session.isPinned ? '取消置顶' : '置顶文档'}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  session.isPinned
                    ? 'text-amber-500 hover:bg-amber-50'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Pin size={12} className={session.isPinned ? 'fill-amber-500' : ''} />
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveMenuSessionId(activeMenuSessionId === session.id ? null : session.id)
                }
                title="更多操作"
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                <MoreVertical size={13} />
              </button>
            </div>
          </div>
        )}

        {/* 浮动操作菜单 */}
        {activeMenuSessionId === session.id && (
          <div
            ref={menuRef}
            className="absolute right-2 top-8 z-50 w-44 bg-white rounded-xl border border-slate-200 shadow-xl py-1 text-xs text-slate-700 animate-in fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setRenamingSessionId(session.id);
                setRenameSessionInput(session.title);
                setActiveMenuSessionId(null);
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-left"
            >
              <Edit2 size={12} className="text-slate-500" />
              <span>重命名文档</span>
            </button>

            {/* 快速移动至指定目录 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMovingSessionId(movingSessionId === session.id ? null : session.id)}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 text-left"
              >
                <div className="flex items-center gap-2">
                  <FolderInput size={12} className="text-slate-500" />
                  <span>移动至目录...</span>
                </div>
                <ChevronRight size={12} className="text-slate-400" />
              </button>

              {movingSessionId === session.id && (
                <div className="absolute left-full top-0 ml-1 w-40 bg-white rounded-xl border border-slate-200 shadow-xl py-1 text-xs text-slate-700 z-50 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      onMoveSessionToFolder(session.id, null);
                      setMovingSessionId(null);
                      setActiveMenuSessionId(null);
                      showToast('已移动至根目录');
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2"
                  >
                    <Folder size={12} className="text-slate-400" />
                    <span>根目录 (未分类)</span>
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        onMoveSessionToFolder(session.id, f.id);
                        setMovingSessionId(null);
                        setActiveMenuSessionId(null);
                        showToast(`已移动至【${f.name}】`);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2 truncate"
                    >
                      <Folder size={12} className="text-indigo-500 shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onToggleUnreadSession(session.id);
                setActiveMenuSessionId(null);
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-left"
            >
              <Mail size={12} className="text-slate-500" />
              <span>{session.isUnread ? '标记为已读' : '标记为未读'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onCopySessionContent(session);
                setActiveMenuSessionId(null);
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-left"
            >
              <Copy size={12} className="text-slate-500" />
              <span>复制文档内容</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onDuplicateSession(session.id);
                setActiveMenuSessionId(null);
                showToast('已创建文档副本');
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-left"
            >
              <Split size={12} className="text-slate-500" />
              <span>复制副本</span>
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button
              type="button"
              onClick={() => {
                onDeleteSession(session.id);
                setActiveMenuSessionId(null);
                showToast('已删除文档');
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-red-50 text-red-600 text-left"
            >
              <Trash2 size={12} />
              <span>删除文档</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full w-full lg:w-80 shrink-0 bg-white border-r border-[#E5E7EB] flex flex-col overflow-hidden transition-all duration-300">
      {/* 1. 顶部经典饱满大胶囊主按钮与快捷动作（完全对应图 2 视觉结构） */}
      <div className="p-3 border-b border-[#E5E7EB] bg-white flex items-center gap-2">
        <button
          type="button"
          onClick={() => onCreateNewSession(null)}
          className="flex-1 py-2.5 px-4 rounded-full bg-[#5146D8] hover:bg-[#4338CA] active:scale-98 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs hover:shadow-md"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>新建文档</span>
        </button>

        {/* 快捷新建根级目录图标按钮 */}
        <button
          type="button"
          onClick={() => {
            setCreatingParentId(null);
            setCreatingNameInput('');
          }}
          title="新建根目录"
          className="p-2 rounded-lg text-slate-500 hover:text-[#5146D8] hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <FolderPlus size={18} />
        </button>

        {/* 折叠侧边栏开关 */}
        <button
          type="button"
          onClick={onToggleOpen}
          title="收起左侧面板"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* 2. 搜索框（图 2 浅灰底色圆角设计） */}
      <div className="px-3 pt-2.5 pb-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索文档..."
            className="w-full pl-8 pr-7 py-2 rounded-xl bg-[#F3F4F6] border-0 focus:ring-1 focus:ring-[#5146D8] text-xs text-[#171A21] placeholder:text-[#9CA3AF] outline-hidden transition-colors"
          />
          {searchKeyword && (
            <button
              onClick={() => setSearchKeyword('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 3. 根目录新建输入框（当点击顶部 FolderPlus 时弹出） */}
      {creatingParentId === null && (
        <div className="px-3 pb-2 animate-in fade-in">
          <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-indigo-50/70 border border-indigo-200">
            <Folder size={15} className="text-[#5146D8] shrink-0 ml-1" />
            <input
              type="text"
              value={creatingNameInput}
              autoFocus
              placeholder="新目录名称..."
              onChange={(e) => setCreatingNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveNewFolder();
                if (e.key === 'Escape') setCreatingParentId(undefined);
              }}
              className="flex-1 text-xs px-2 py-1 rounded bg-white border border-indigo-300 outline-hidden font-medium"
            />
            <button
              type="button"
              onClick={handleSaveNewFolder}
              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCreatingParentId(undefined)}
              className="p-1 text-slate-400 hover:bg-slate-200/60 rounded"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 4. 多级目录树与文档列表核心渲染区 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
        {/* 多级目录树节点 */}
        {rootFolders.map((folder) => renderFolderNode(folder, 0))}

        {/* 根目录未分类区域（支持作为 Drop Target 拖入归为根目录） */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverTargetId('__root__');
          }}
          onDragLeave={() => {
            if (dragOverTargetId === '__root__') setDragOverTargetId(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDropToFolder(null, '未分类 / 根目录');
          }}
          className={`mt-2 pt-2 border-t border-slate-100 rounded-lg p-1.5 transition-all ${
            dragOverTargetId === '__root__'
              ? 'bg-indigo-50 border-2 border-dashed border-indigo-400'
              : ''
          }`}
        >
          <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>未分类文档</span>
            <span className="font-mono">({unclassifiedSessions.length})</span>
          </div>

          <div className="space-y-0.5 mt-1">
            {unclassifiedSessions.filter(isSessionMatching).map((session) => renderSessionItem(session, 0))}

            {unclassifiedSessions.length === 0 && (
              <div className="text-[11px] text-slate-400 py-1.5 px-2 italic">
                所有文档均已归档至目录
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. 底部状态指示栏（完全对齐图 2 底部：共 X 个文档 / 实时持久化） */}
      <div className="px-3.5 py-2.5 border-t border-[#E5E7EB] bg-slate-50/70 text-[11px] text-[#6B7280] flex items-center justify-between">
        <span>共 {sessions.length} 个会话文档</span>
        <span className="flex items-center gap-1 text-[#9CA3AF]">
          <Clock size={12} />
          <span>实时持久化</span>
        </span>
      </div>
    </div>
  );
};
