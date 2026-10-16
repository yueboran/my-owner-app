/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 通用多级目录树形侧边栏与原生拖拽路径归档系统 (UniversalTreeSidebar)
 * 严格复刻图 2 标准设计规范：
 * 1. 顶部饱满紫色大胶囊新建按钮 + 新建根目录图标 + 折叠/展开控制
 * 2. 搜索框实时筛选与自动匹配
 * 3. 无限级嵌套目录树（展开/折叠、新建子目录、内联重命名、删除）
 * 4. 原生 HTML5 拖拽快速调整存放路径（文件夹高亮吸附、未归档根目录移出）
 * 5. 底部条目统计与“实时持久化”状态指示
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
  Trash2,
  Edit2,
  Edit3,
  GripVertical,
  FolderInput,
  Check,
} from 'lucide-react';

export interface BaseTreeFolder {
  id: string;
  name: string;
  parentId?: string | null;
  createdAt: number;
  isExpanded?: boolean;
}

export interface UniversalTreeSidebarProps<T extends { id: string; title: string; folderId?: string | null }> {
  items: T[];
  folders: BaseTreeFolder[];
  activeId?: string;
  activeItemId?: string;
  isOpen?: boolean;
  isCollapsed?: boolean;
  onToggleOpen?: () => void;
  onToggleCollapse?: () => void;
  onSelectItem?: ((id: string) => void) | ((item: T) => void);
  onCreateNewItem?: (folderId?: string | null) => void;
  onAddNewItem?: () => void;
  onDeleteItem?: (id: string) => void;
  onEditItem?: (item: T) => void;
  // 目录操作
  onCreateFolder: (name: string, parentId?: string | null) => void;
  onRenameFolder: (id: string, newName: string) => void;
  onDeleteFolder: (id: string) => void;
  onToggleFolderExpand: (id: string) => void;
  onMoveItemToFolder: (itemId: string, targetFolderId: string | null) => void;
  showToast?: (msg: string) => void;
  // 文案与定制渲染插槽
  createBtnText?: string;
  newButtonText?: string;
  itemNoun?: string; // 例如 "篇日记", "个知识卡片", "篇研报", "位传记人物"
  searchPlaceholder?: string;
  renderItemIcon?: (item: T) => React.ReactNode;
  renderItemBadge?: (item: T) => React.ReactNode;
  renderItemSubtext?: (item: T) => React.ReactNode;
  renderItemTitle?: (item: T) => React.ReactNode;
  renderItemMeta?: (item: T) => React.ReactNode;
  title?: string;
  subtitle?: string;
  folderPlaceholder?: string;
  emptyStateText?: string;
  storageKey?: string;
}

export function UniversalTreeSidebar<T extends { id: string; title: string; folderId?: string | null }>({
  items,
  folders,
  activeId,
  activeItemId,
  isOpen,
  isCollapsed,
  onToggleOpen,
  onToggleCollapse,
  onSelectItem,
  onCreateNewItem,
  onAddNewItem,
  onDeleteItem = () => {},
  onEditItem,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onToggleFolderExpand,
  onMoveItemToFolder,
  showToast = () => {},
  createBtnText,
  newButtonText,
  itemNoun = '条目',
  searchPlaceholder = '搜索名称、内容或标签...',
  renderItemIcon,
  renderItemBadge,
  renderItemSubtext,
  renderItemTitle,
  renderItemMeta,
}: UniversalTreeSidebarProps<T>) {
  // 安全解析展开状态：默认展开 true
  const resolvedIsOpen = isOpen !== undefined ? isOpen : (isCollapsed !== undefined ? !isCollapsed : true);
  const resolvedToggleOpen = onToggleOpen || onToggleCollapse || (() => {});
  const resolvedActiveId = activeId || activeItemId || '';
  const resolvedCreateBtnText = createBtnText || newButtonText || '新建条目';

  const handleTriggerCreate = (folderId?: string | null) => {
    if (onCreateNewItem) {
      onCreateNewItem(folderId);
    } else if (onAddNewItem) {
      onAddNewItem();
    }
  };

  const handleTriggerSelect = (item: T) => {
    if (!onSelectItem) return;
    try {
      (onSelectItem as (id: string) => void)(item.id);
    } catch {
      (onSelectItem as (i: T) => void)(item);
    }
  };

  // 搜索关键字
  const [searchKeyword, setSearchKeyword] = useState('');

  // 正在拖拽的条目 ID
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  // 当前鼠标拖拽悬停的目标放置区域（文件夹 ID 或 '__root__'）
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);

  // 内联创建目录状态：parentId (null 表示根级，string 表示子级，undefined 表示关闭)
  const [creatingParentId, setCreatingParentId] = useState<string | null | undefined>(undefined);
  const [creatingNameInput, setCreatingNameInput] = useState('');

  // 内联重命名目录状态
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderInput, setRenameFolderInput] = useState('');

  // 目录与条目的浮动三点菜单状态
  const [activeMenuItemId, setActiveMenuItemId] = useState<string | null>(null);
  const [activeMenuFolderId, setActiveMenuFolderId] = useState<string | null>(null);

  // 快捷移动路径的弹出子菜单
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  // 全局点击监听关闭三点菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuItemId(null);
        setActiveMenuFolderId(null);
        setMovingItemId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 拖拽释放处理
  const handleDropToFolder = (targetFolderId: string | null, targetName: string) => {
    if (!draggingItemId) return;
    const dragged = items.find((t) => t.id === draggingItemId);
    onMoveItemToFolder(draggingItemId, targetFolderId);
    showToast(`已将《${dragged?.title || '条目'}》移动至【${targetName}】`);
    setDraggingItemId(null);
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

  // 递归计算某个目录（包括其所有深层子目录）包含的全部条目数量
  const getFolderTotalCount = (folderId: string): number => {
    const directCount = items.filter((t) => t.folderId === folderId).length;
    const childFolders = folders.filter((f) => f.parentId === folderId);
    const childTotal = childFolders.reduce((sum, cf) => sum + getFolderTotalCount(cf.id), 0);
    return directCount + childTotal;
  };

  // 搜索过滤匹配的条目
  const isItemMatching = (item: T): boolean => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.trim().toLowerCase();
    return item.title.toLowerCase().includes(kw);
  };

  // 顶级根目录与未归档条目
  const rootFolders = useMemo(() => folders.filter((f) => !f.parentId), [folders]);
  const unclassifiedItems = useMemo(
    () =>
      items.filter((t) => {
        if (!t.folderId) return true;
        return !folders.some((f) => f.id === t.folderId);
      }),
    [items, folders]
  );

  // 侧边栏收起时的极简模式
  if (!resolvedIsOpen) {
    return (
      <div className="h-full w-16 shrink-0 bg-white border-r border-[#E5E7EB] flex flex-col items-center py-4 gap-3 transition-all duration-300 select-none">
        <button
          type="button"
          onClick={() => handleTriggerCreate(null)}
          title={resolvedCreateBtnText}
          className="w-10 h-10 rounded-full bg-[#5146D8] hover:bg-[#4338CA] text-white flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-all"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={resolvedToggleOpen}
          title="展开目录树"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <PanelLeftOpen size={18} />
        </button>
      </div>
    );
  }


  // 递归渲染文件夹节点组件
  const renderFolderNode = (folder: BaseTreeFolder, depth: number = 0) => {
    const isExpanded = folder.isExpanded !== false;
    const childFolders = folders.filter((f) => f.parentId === folder.id);
    const folderItems = items.filter((t) => t.folderId === folder.id);
    const filteredFolderItems = folderItems.filter(isItemMatching);
    const totalCount = getFolderTotalCount(folder.id);
    const isDropOver = dragOverTargetId === folder.id;

    // 如果搜索有关键字，且当前目录及子孙目录均无匹配项，则收起隐藏
    const hasMatchingDescendants =
      filteredFolderItems.length > 0 ||
      childFolders.some((cf) => getFolderTotalCount(cf.id) > 0);
    if (searchKeyword.trim() && !hasMatchingDescendants) {
      return null;
    }

    return (
      <div key={folder.id} className="relative select-none">
        {/* 文件夹主控条目 */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (draggingItemId) {
              setDragOverTargetId(folder.id);
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dragOverTargetId === folder.id) {
              setDragOverTargetId(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDropToFolder(folder.id, folder.name);
          }}
          className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
            isDropOver
              ? 'bg-indigo-50 border-2 border-dashed border-[#5146D8] text-[#5146D8]'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 14 + 8)}px` }}
        >
          {/* 左侧：折叠箭头 + 图标 + 名称 */}
          <div
            className="flex items-center gap-1.5 flex-1 min-w-0"
            onClick={() => onToggleFolderExpand(folder.id)}
          >
            <button
              type="button"
              className="p-0.5 rounded text-slate-400 hover:text-slate-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFolderExpand(folder.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown size={14} className="text-slate-500" />
              ) : (
                <ChevronRight size={14} className="text-slate-400" />
              )}
            </button>

            {isExpanded ? (
              <FolderOpen size={15} className="text-amber-500 shrink-0" />
            ) : (
              <Folder size={15} className="text-amber-500 shrink-0" />
            )}

            {/* 内联重命名或正常展示名称 */}
            {renamingFolderId === folder.id ? (
              <input
                type="text"
                autoFocus
                value={renameFolderInput}
                onChange={(e) => setRenameFolderInput(e.target.value)}
                onBlur={() => handleSaveRenameFolder(folder.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRenameFolder(folder.id);
                  if (e.key === 'Escape') setRenamingFolderId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 px-1.5 py-0.5 text-xs bg-white border border-[#5146D8] rounded outline-none text-slate-800"
              />
            ) : (
              <span className="truncate text-slate-800 text-[13px]">{folder.name}</span>
            )}

            <span className="text-[11px] text-slate-400 font-normal shrink-0">
              ({totalCount})
            </span>
          </div>

          {/* 右侧悬浮快捷操作菜单 */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* 新建子条目 */}
            <button
              type="button"
              title={`在此目录下新建${itemNoun}`}
              onClick={(e) => {
                e.stopPropagation();
                onCreateNewItem(folder.id);
              }}
              className="p-1 rounded text-slate-400 hover:text-[#5146D8] hover:bg-white transition-colors"
            >
              <Plus size={13} />
            </button>

            {/* 更多菜单按钮 */}
            <button
              type="button"
              title="目录设置"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuFolderId(activeMenuFolderId === folder.id ? null : folder.id);
                setActiveMenuItemId(null);
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
            >
              <MoreVertical size={13} />
            </button>
          </div>
        </div>

        {/* 目录操作浮动菜单 */}
        {activeMenuFolderId === folder.id && (
          <div
            ref={menuRef}
            className="absolute right-2 top-8 z-50 w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1 text-xs text-slate-700"
          >
            <button
              type="button"
              onClick={() => {
                setCreatingParentId(folder.id);
                setCreatingNameInput('');
                setActiveMenuFolderId(null);
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 text-left"
            >
              <FolderPlus size={13} className="text-slate-500" />
              <span>新建子目录</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRenamingFolderId(folder.id);
                setRenameFolderInput(folder.name);
                setActiveMenuFolderId(null);
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 text-left"
            >
              <Edit2 size={13} className="text-slate-500" />
              <span>重命名</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteFolder(folder.id);
                setActiveMenuFolderId(null);
                showToast(`已删除目录「${folder.name}」`);
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-red-50 text-red-600 text-left border-t border-slate-100"
            >
              <Trash2 size={13} />
              <span>删除目录</span>
            </button>
          </div>
        )}

        {/* 内联创建子目录输入框 */}
        {creatingParentId === folder.id && (
          <div
            className="flex items-center gap-1.5 py-1 px-2 my-0.5 rounded-lg bg-indigo-50/50"
            style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}
          >
            <FolderPlus size={14} className="text-[#5146D8] shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="子目录名称..."
              value={creatingNameInput}
              onChange={(e) => setCreatingNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveNewFolder();
                if (e.key === 'Escape') setCreatingParentId(undefined);
              }}
              className="flex-1 px-1.5 py-0.5 text-xs bg-white border border-[#5146D8] rounded outline-none text-slate-800"
            />
            <button
              type="button"
              onClick={handleSaveNewFolder}
              className="p-1 rounded bg-[#5146D8] text-white hover:bg-[#4338CA]"
            >
              <Check size={12} />
            </button>
            <button
              type="button"
              onClick={() => setCreatingParentId(undefined)}
              className="p-1 rounded text-slate-400 hover:text-slate-600"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* 展开内容：嵌套子目录 + 该目录下的条目 */}
        {isExpanded && (
          <div className="space-y-0.5">
            {childFolders.map((child) => renderFolderNode(child, depth + 1))}
            {filteredFolderItems.map((item) => renderTreeItem(item, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // 渲染单个条目（支持拖拽）
  const renderTreeItem = (item: T, depth: number = 0) => {
    const isActive = item.id === resolvedActiveId;
    const isDragging = draggingItemId === item.id;

    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', item.id);
          e.dataTransfer.effectAllowed = 'move';
          setDraggingItemId(item.id);
        }}
        onDragEnd={() => {
          setDraggingItemId(null);
          setDragOverTargetId(null);
        }}
        onClick={() => handleTriggerSelect(item)}
        className={`group relative flex items-center justify-between rounded-xl px-2.5 py-2 cursor-pointer transition-all border ${
          isActive
            ? 'bg-indigo-50/70 border-[#5146D8]/30 shadow-xs'
            : 'hover:bg-slate-50 border-transparent text-slate-700'
        } ${isDragging ? 'opacity-40 scale-98' : 'opacity-100'}`}
        style={{ paddingLeft: `${Math.max(10, depth * 14 + 10)}px` }}
      >
        {/* 激活指示条 */}
        {isActive && (
          <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#5146D8] rounded-r" />
        )}

        {/* 左侧主体 */}
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
          {/* 拖动抓手与图标 */}
          <div className="flex items-center gap-1 shrink-0">
            <span
              className="cursor-grab opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity text-slate-400"
              title="拖拽可快速调整归档路径"
            >
              <GripVertical size={13} />
            </span>
            {renderItemIcon && renderItemIcon(item)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`truncate text-[13px] font-medium leading-snug ${
                  isActive ? 'text-[#171A21] font-semibold' : 'text-slate-800'
                }`}
              >
                {renderItemTitle ? renderItemTitle(item) : item.title}
              </span>
            </div>

            {/* 描述与状态徽标 */}
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
              {renderItemBadge && renderItemBadge(item)}
              {renderItemSubtext && renderItemSubtext(item)}
              {renderItemMeta && renderItemMeta(item)}
            </div>
          </div>
        </div>


        {/* 右侧：三点菜单操作 */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            title="更多操作"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuItemId(activeMenuItemId === item.id ? null : item.id);
              setActiveMenuFolderId(null);
            }}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical size={13} />
          </button>
        </div>

        {/* 条目浮动操作菜单 */}
        {activeMenuItemId === item.id && (
          <div
            ref={menuRef}
            className="absolute right-2 top-8 z-50 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 text-xs text-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {onEditItem && (
              <button
                type="button"
                onClick={() => {
                  onEditItem(item);
                  setActiveMenuItemId(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 text-left"
              >
                <Edit3 size={13} className="text-slate-500" />
                <span>编辑属性</span>
              </button>
            )}

            {/* 快速移动路径子菜单开关 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMovingItemId(movingItemId === item.id ? null : item.id)}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 text-left"
              >
                <div className="flex items-center gap-2">
                  <FolderInput size={13} className="text-slate-500" />
                  <span>移动至文件夹...</span>
                </div>
                <ChevronRight size={12} className="text-slate-400" />
              </button>

              {movingItemId === item.id && (
                <div className="p-1 bg-slate-50 border-t border-b border-slate-100 max-h-40 overflow-y-auto space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onMoveItemToFolder(item.id, null);
                      showToast(`已将《${item.title}》移至根目录未归档`);
                      setActiveMenuItemId(null);
                      setMovingItemId(null);
                    }}
                    className="w-full px-2 py-1 text-left rounded hover:bg-indigo-50 text-[11px] text-slate-600 truncate"
                  >
                    📂 移出至根目录
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        onMoveItemToFolder(item.id, f.id);
                        showToast(`已移动至「${f.name}」`);
                        setActiveMenuItemId(null);
                        setMovingItemId(null);
                      }}
                      className="w-full px-2 py-1 text-left rounded hover:bg-indigo-50 text-[11px] text-slate-600 truncate"
                    >
                      📁 {f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onDeleteItem(item.id);
                setActiveMenuItemId(null);
                showToast(`已删除《${item.title}》`);
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-red-50 text-red-600 text-left border-t border-slate-100"
            >
              <Trash2 size={13} />
              <span>删除该条目</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-white border-r border-[#E5E7EB] flex flex-col select-none transition-all duration-300">
      {/* 顶部控制栏：新建条目大胶囊 + 新建根目录 + 折叠面板 */}
      <div className="p-3 border-b border-[#E5E7EB] space-y-2.5">
        <div className="flex items-center gap-2">
          {/* 紫色饱满胶囊新建按钮 */}
          <button
            type="button"
            onClick={() => handleTriggerCreate(null)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#5146D8] hover:bg-[#4338CA] text-white text-xs font-semibold cursor-pointer shadow-xs hover:shadow transition-all"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{resolvedCreateBtnText}</span>
          </button>

          {/* 新建根目录图标 */}
          <button
            type="button"
            onClick={() => {
              setCreatingParentId(null);
              setCreatingNameInput('');
            }}
            title="新建根目录"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <FolderPlus size={16} />
          </button>

          {/* 收起侧边栏 */}
          <button
            type="button"
            onClick={resolvedToggleOpen}
            title="收起侧边栏"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <PanelLeftClose size={16} />
          </button>

        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5146D8] focus:border-[#5146D8] transition-all"
          />
          {searchKeyword && (
            <button
              type="button"
              onClick={() => setSearchKeyword('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 根级新建文件夹内联输入 */}
      {creatingParentId === null && (
        <div className="p-2 mx-2 mt-2 bg-indigo-50/50 border border-indigo-100 rounded-lg flex items-center gap-1.5">
          <FolderPlus size={14} className="text-[#5146D8] shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="根目录名称..."
            value={creatingNameInput}
            onChange={(e) => setCreatingNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveNewFolder();
              if (e.key === 'Escape') setCreatingParentId(undefined);
            }}
            className="flex-1 px-1.5 py-0.5 text-xs bg-white border border-[#5146D8] rounded outline-none text-slate-800"
          />
          <button
            type="button"
            onClick={handleSaveNewFolder}
            className="p-1 rounded bg-[#5146D8] text-white hover:bg-[#4338CA]"
          >
            <Check size={12} />
          </button>
          <button
            type="button"
            onClick={() => setCreatingParentId(undefined)}
            className="p-1 rounded text-slate-400 hover:text-slate-600"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* 多级树滚动主容器 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-refined">
        {/* 多级文件夹渲染 */}
        {rootFolders.map((folder) => renderFolderNode(folder, 0))}

        {/* 根级未归档条目分组区（支持 Drop 移回根目录） */}
        {unclassifiedItems.length > 0 && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggingItemId) {
                setDragOverTargetId('__root__');
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (dragOverTargetId === '__root__') {
                setDragOverTargetId(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDropToFolder(null, '未归档根目录');
            }}
            className={`mt-3 pt-2 border-t border-slate-100 rounded-lg p-1 transition-colors ${
              dragOverTargetId === '__root__'
                ? 'bg-indigo-50 border-2 border-dashed border-[#5146D8]'
                : ''
            }`}
          >
            <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>未归档条目 ({unclassifiedItems.length})</span>
              <span className="text-[10px] text-slate-300">拖拽至此移出目录</span>
            </div>
            <div className="space-y-0.5 mt-0.5">
              {unclassifiedItems.filter(isItemMatching).map((t) => renderTreeItem(t, 0))}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {items.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-400">
            暂无条目，点击上方按钮创建
          </div>
        )}
      </div>

      {/* 底部持久化与统计状态栏 */}
      <div className="p-3 border-t border-[#E5E7EB] bg-[#F7F8FA] flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium">
          共 {items.length} {itemNoun}
        </span>
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>实时持久化</span>
        </div>
      </div>
    </div>
  );
}
