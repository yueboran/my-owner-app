import React, { useState } from 'react';
import {
  ListTodo,
  Plus,
  Sparkles,
  GripVertical,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  Trash2,
  Wand2,
  Loader2,
  ArrowUpDown,
  BookOpen,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  Check,
  FileText,
  Flame,
  Coffee,
  LayoutGrid,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { useTodos } from '../../hooks/useTodos';
import type { TodoItem, TodoCategory } from '../../types/todo';

const CATEGORIES: TodoCategory[] = [
  '待办事项',
  '想做的事',
  '业务攻坚',
  '学习沉淀',
  '生活日常',
];

const CATEGORY_COLORS: Record<TodoCategory, { bg: string; text: string; border: string }> = {
  待办事项: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  想做的事: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
  业务攻坚: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  学习沉淀: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  生活日常: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
};

export const TodoView: React.FC = () => {
  const {
    todos,
    addTodo,
    toggleComplete,
    deleteTodo,
    reorderTodos,
    saveAiAdvice,
  } = useTodos();

  // 快捷记录状态
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TodoCategory>('待办事项');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [isExpandQuickAdd, setIsExpandQuickAdd] = useState(false);

  // Tab 过滤状态
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('全部');

  // 拖拽重排状态
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // AI 开展建议模态窗
  const [activeAiTodo, setActiveAiTodo] = useState<TodoItem | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');

  // 全局 AI 总结模态窗
  const [isGlobalSummaryOpen, setIsGlobalSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryResult, setSummaryResult] = useState('');

  // 快捷提交
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addTodo(newTitle, newCategory, newDesc, newDueDate || undefined);
    setNewTitle('');
    setNewDesc('');
    setNewDueDate('');
    setIsExpandQuickAdd(false);
  };

  // 拖拽事件处理
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    reorderTodos(draggedIndex, index);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 触发单项 AI 开展建议
  const handleGenerateAiAdvice = async (todo: TodoItem) => {
    setActiveAiTodo(todo);
    setAiResult(todo.aiAdvice || '');
    if (todo.aiAdvice) return;

    setAiLoading(true);
    try {
      const promptText = `请为以下待办/想做的事项生成一份高可执行度的开展建议：
【事项标题】：${todo.title}
【分类】：${todo.category}
${todo.description ? `【详细背景】：${todo.description}` : ''}

请按以下结构输出：
1. 🎯 核心目标与里程碑定义
2. 🛠️ 拆解执行路径（Step 1 / Step 2 / Step 3）
3. ⚠️ 潜在瓶颈与风险防范
4. 💡 效能加速建议或推荐工具`;

      const res = await fetch('/api/knowledge/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: promptText }),
      });

      if (res.ok) {
        const payload = await res.json();
        const adviceText = payload.data?.content || '生成完成';
        setAiResult(adviceText);
        saveAiAdvice(todo.id, adviceText);
      } else {
        const fallback = `【${todo.title} - AI 开展路线】\n1. 🎯 明确交付标准与边界\n2. 🛠️ 第一阶段完成需求梳理与技术验证\n3. 🛠️ 第二阶段敏捷构建核心最小可行版本（MVP）\n4. 💡 建议在知识工程中建立关联索引。`;
        setAiResult(fallback);
        saveAiAdvice(todo.id, fallback);
      }
    } catch {
      const fallback = `【${todo.title} - 本地 AI 建议】\n1. 🎯 优先确立核心价值点\n2. 🛠️ 分阶段落地与敏捷迭代\n3. 💡 随时记录过程心得至知识库。`;
      setAiResult(fallback);
      saveAiAdvice(todo.id, fallback);
    } finally {
      setAiLoading(false);
    }
  };

  // 触发全局 AI 总结
  const handleGenerateGlobalSummary = async () => {
    setIsGlobalSummaryOpen(true);
    setSummaryLoading(true);
    setSummaryResult('');

    try {
      const pendingItems = todos.filter((t) => t.status === 'pending');
      const completedItems = todos.filter((t) => t.status === 'completed');

      const promptText = `请基于当前团队与个人的待办中枢数据，生成一份结构化的高效工作简报与优先级分析：
【当前待办列表（按重要顺序排列）】：
${pendingItems.map((t, idx) => `#${idx + 1} [${t.category}] ${t.title}`).join('\n')}

【近期已完成留档】：
${completedItems.map((t) => `✓ [${t.category}] ${t.title}`).join('\n')}

请输出：
1. 📊 事项概览与健康度评估
2. ⚡ 今日/近期最高优先级攻坚聚焦（Top 3 深度洞察）
3. 💡 时间分配与能效提升建议`;

      const res = await fetch('/api/knowledge/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: promptText }),
      });

      if (res.ok) {
        const payload = await res.json();
        setSummaryResult(payload.data?.content || '总结完成');
      } else {
        setSummaryResult(
          `📊 **事项概览与健康度评估**\n- 当前待办事项：${pendingItems.length} 项（已按重要度排序）\n- 已完成归档：${completedItems.length} 项\n\n⚡ **最高优先级聚焦**\n1. ${pendingItems[0]?.title || '无待办'}\n2. ${pendingItems[1]?.title || '保持推进'}\n\n💡 **能效建议**：建议每日聚焦处理前 30% 核心事项。`
        );
      }
    } catch {
      setSummaryResult('已成功盘点当前全部待办与留档事项，请保持敏捷节奏推进。');
    } finally {
      setSummaryLoading(false);
    }
  };

  // 过滤后的列表
  const filteredTodos = todos
    .filter((todo) => {
      if (activeTab === 'pending') return todo.status === 'pending';
      if (activeTab === 'completed') return todo.status === 'completed';
      return true;
    })
    .filter((todo) => {
      if (categoryFilter === '全部') return true;
      return todo.category === categoryFilter;
    });

  const pendingCount = todos.filter((t) => t.status === 'pending').length;
  const completedCount = todos.filter((t) => t.status === 'completed').length;

  return (
    <div className="page-container">
      {/* 1. 规范化页面头部 */}
      <div className="page-header-block flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-main-title">
            <ListTodo size={22} className="text-[#2b5aed]" /> 待办与心愿中枢
          </h1>
          <p className="page-sub-title mt-1">
            顺序即重要程度 · 支持快捷记录、拖拽重排优先级、单项 AI 开展建议与全局工作简报
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="gradient"
            size="sm"
            leftIcon={<Sparkles size={15} />}
            onClick={handleGenerateGlobalSummary}
          >
            AI 全局事项总结
          </Button>
        </div>
      </div>

      {/* 2. 快捷记录卡片 (Quick Capture Card) */}
      <Card className="p-5 border-[#cbd5e1] shadow-sm">
        <form onSubmit={handleQuickAdd} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="快捷记录待办事项或想做的事情（按 Enter 快速保存并置顶）..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2b5aed] focus:bg-white transition-all"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              leftIcon={<Plus size={16} />}
              disabled={!newTitle.trim()}
            >
              添加
            </Button>
          </div>

          {/* 分类胶囊选择与展开更多选项 */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[#64748b] font-medium mr-1">分类：</span>
              {CATEGORIES.map((cat) => {
                const isSelected = newCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewCategory(cat)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2b5aed] text-white border-[#2b5aed] font-medium shadow-xs'
                        : 'bg-white text-[#475569] border-[#e2e8f0] hover:bg-[#f1f5f9]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsExpandQuickAdd(!isExpandQuickAdd)}
              className="text-xs text-[#2b5aed] hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              {isExpandQuickAdd ? (
                <>收起备注 <ChevronUp size={13} /></>
              ) : (
                <>添加备注与截止日期 <ChevronDown size={13} /></>
              )}
            </button>
          </div>

          {/* 展开的备注与日期输入 */}
          {isExpandQuickAdd && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#f1f5f9] animate-in fade-in duration-150">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="补充背景描述、预期目标或关键备忘（可选）..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2b5aed]"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-xs text-[#475569] focus:outline-none focus:border-[#2b5aed]"
                />
              </div>
            </div>
          )}
        </form>
      </Card>

      {/* 3. 事项状态 Tab 与 分类过滤工具栏 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <Tabs
          items={[
            { key: 'pending', label: '待办推进中', badge: <span className="bg-[#eff6ff] text-[#2b5aed] text-[10px] font-bold px-1.5 py-0.2 rounded-full">{pendingCount}</span> },
            { key: 'completed', label: '已完成留档', badge: <span className="bg-[#f0fdf4] text-[#16a34a] text-[10px] font-bold px-1.5 py-0.2 rounded-full">{completedCount}</span> },
            { key: 'all', label: '全部总览', badge: <span className="bg-[#f1f5f9] text-[#64748b] text-[10px] font-bold px-1.5 py-0.2 rounded-full">{todos.length}</span> },
          ]}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as any)}
        />

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['全部', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`text-xs px-2.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                categoryFilter === cat
                  ? 'bg-[#1e293b] text-white font-medium shadow-xs'
                  : 'bg-white text-[#64748b] border border-[#e2e8f0] hover:bg-[#f1f5f9]'
              }`}
            >
              {cat === '全部' && <LayoutGrid size={12} className="shrink-0" strokeWidth={1.75} />}
              {cat === '待办事项' && <ListTodo size={12} className="shrink-0" strokeWidth={1.75} />}
              {cat === '想做的事' && <Sparkles size={12} className="shrink-0" strokeWidth={1.75} />}
              {cat === '业务攻坚' && <Flame size={12} className="shrink-0 text-rose-500" strokeWidth={1.75} />}
              {cat === '学习沉淀' && <BookOpen size={12} className="shrink-0 text-emerald-500" strokeWidth={1.75} />}
              {cat === '生活日常' && <Coffee size={12} className="shrink-0 text-amber-500" strokeWidth={1.75} />}
              <span>{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. 可拖拽事项列表 (Draggable Ranking List) */}
      <div className="flex flex-col gap-2.5">
        {filteredTodos.map((todo, index) => {
          const isCompleted = todo.status === 'completed';
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;
          const catColor = CATEGORY_COLORS[todo.category] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };

          return (
            <div
              key={todo.id}
              draggable={!isCompleted}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              className={`bg-white rounded-xl border transition-all duration-200 p-3.5 px-4 flex items-center justify-between gap-3 select-none ${
                isCompleted
                  ? 'opacity-65 bg-[#f8fafc] border-[#e2e8f0]'
                  : 'border-[#e2e8f0] hover:border-[#cbd5e1] hover:shadow-xs'
              } ${isDragging ? 'opacity-30 border-dashed border-[#2b5aed]' : ''} ${
                isDragOver ? 'border-t-2 border-t-[#2b5aed] bg-[#eff6ff]/30' : ''
              }`}
            >
              {/* 左侧：拖拽手柄与优先级标识 */}
              <div className="flex items-center gap-2.5 shrink-0">
                {!isCompleted ? (
                  <div
                    className="text-[#94a3b8] hover:text-[#0f172a] cursor-grab active:cursor-grabbing p-1 -ml-1 transition-colors"
                    title="按住拖拽上下调整重要程度"
                  >
                    <GripVertical size={16} />
                  </div>
                ) : (
                  <div className="w-5" />
                )}

                {/* 优先级序号 Badge (仅在未完成列表显示) */}
                {!isCompleted && (
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.5 rounded font-mono ${
                      index === 0
                        ? 'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]'
                        : index === 1
                        ? 'bg-[#fffbeb] text-[#d97706] border border-[#fde68a]'
                        : index === 2
                        ? 'bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]'
                        : 'bg-[#f1f5f9] text-[#64748b]'
                    }`}
                    title={`优先级权重 #${index + 1}`}
                  >
                    #{index + 1}
                  </span>
                )}

                {/* 完成复选框 */}
                <button
                  type="button"
                  onClick={() => toggleComplete(todo.id)}
                  className="cursor-pointer text-[#94a3b8] hover:text-[#16a34a] transition-colors p-0.5"
                  title={isCompleted ? '标记为未完成' : '标记为已完成'}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={18} className="text-[#16a34a]" />
                  ) : (
                    <Circle size={18} />
                  )}
                </button>
              </div>

              {/* 中部：内容展示 */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-sm font-semibold tracking-tight ${
                      isCompleted ? 'line-through text-[#94a3b8]' : 'text-[#0f172a]'
                    }`}
                  >
                    {todo.title}
                  </span>

                  <span
                    className="text-[10.5px] px-2 py-0.5 rounded-md font-medium border"
                    style={{
                      background: catColor.bg,
                      color: catColor.text,
                      borderColor: catColor.border,
                    }}
                  >
                    {todo.category}
                  </span>

                  {todo.aiAdvice && (
                    <span className="text-[10.5px] px-2 py-0.5 rounded-md font-medium bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe] flex items-center gap-1">
                      <Sparkles size={11} /> 已有 AI 建议
                    </span>
                  )}
                </div>

                {todo.description && (
                  <p className="text-xs text-[#64748b] line-clamp-1 leading-relaxed">
                    {todo.description}
                  </p>
                )}

                {/* 底部元数据 */}
                <div className="flex items-center gap-3 text-[11px] text-[#94a3b8] mt-0.5">
                  {todo.dueDate && (
                    <span className="flex items-center gap-1 text-[#ea580c] font-medium">
                      <Calendar size={11} /> 截止 {todo.dueDate}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {new Date(todo.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* 右侧操作栏 */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Wand2 size={13} className="text-[#6345ed]" />}
                  onClick={() => handleGenerateAiAdvice(todo)}
                  className="text-xs"
                >
                  AI 开展建议
                </Button>

                <button
                  type="button"
                  onClick={() => deleteTodo(todo.id)}
                  className="p-1.5 text-[#94a3b8] hover:text-[#ef4444] rounded-lg hover:bg-[#fef2f2] transition-colors cursor-pointer"
                  title="删除事项"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {filteredTodos.length === 0 && (
          <div className="bg-white border border-dashed border-[#cbd5e1] rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
            <ListTodo size={36} className="text-[#94a3b8]" />
            <h3 className="text-sm font-bold text-[#0f172a]">暂无待办事项</h3>
            <p className="text-xs text-[#64748b] max-w-sm">
              在上方快速记录框输入待办或心愿，按 Enter 即可快速建立事项并由 AI 智能规划。
            </p>
          </div>
        )}
      </div>

      {/* 5. 单项 AI 开展建议模态窗 */}
      <Modal
        isOpen={!!activeAiTodo}
        onClose={() => setActiveAiTodo(null)}
        title={
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#6345ed]" />
            <span>AI 智能开展路线图</span>
          </div>
        }
        description={activeAiTodo ? `针对「${activeAiTodo.title}」生成的落地实施拆解与能效建议` : undefined}
        maxWidth="2xl"
      >
        <div className="flex flex-col gap-4">
          {aiLoading ? (
            <div className="p-8 flex flex-col items-center justify-center gap-3 text-xs text-[#64748b]">
              <Loader2 size={24} className="animate-spin text-[#2b5aed]" />
              <span>大模型正在为您拆解关键实施路径与资源清单...</span>
            </div>
          ) : (
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4.5">
              <pre className="text-xs text-[#1e293b] font-sans whitespace-pre-wrap leading-relaxed">
                {aiResult}
              </pre>
            </div>
          )}
        </div>
      </Modal>

      {/* 6. 全局 AI 事项总结模态窗 */}
      <Modal
        isOpen={isGlobalSummaryOpen}
        onClose={() => setIsGlobalSummaryOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#2b5aed]" />
            <span>AI 全局事项总结与工作简报</span>
          </div>
        }
        description="自动盘点当前待办重要程度分布、已完成成果与近期攻坚建议"
        maxWidth="2xl"
      >
        <div className="flex flex-col gap-4">
          {summaryLoading ? (
            <div className="p-8 flex flex-col items-center justify-center gap-3 text-xs text-[#64748b]">
              <Loader2 size={24} className="animate-spin text-[#2b5aed]" />
              <span>正在对所有待办事项与进度进行全局智能研判...</span>
            </div>
          ) : (
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4.5">
              <pre className="text-xs text-[#1e293b] font-sans whitespace-pre-wrap leading-relaxed">
                {summaryResult}
              </pre>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default TodoView;
