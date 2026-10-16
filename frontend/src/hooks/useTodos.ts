import { useState, useEffect, useCallback } from 'react';
import type { TodoItem, TodoCategory, TodoStatus } from '../types/todo';

const STORAGE_KEY = 'starmap-todos-v1';

const DEFAULT_TODOS: TodoItem[] = [
  {
    id: 'todo-1',
    title: '完成生产级企业 UI 设计规范交付与组件拆分',
    description: '严格遵循 Design Tokens 与 5 大核心 Skills，实现全站统一的浅色高光质感。',
    category: '业务攻坚',
    status: 'pending',
    order: 0,
    tags: ['前端重构', 'DesignSystem'],
    dueDate: '2026-09-30',
    created_at: new Date(Date.now() - 36e5).toISOString(),
    updated_at: new Date(Date.now() - 36e5).toISOString(),
  },
  {
    id: 'todo-2',
    title: '构建 3D 知识图谱多维力导向聚合算法',
    description: '优化实体节点与主题星云的空间吸引力与排斥力参数，提升跨文档关联表现。',
    category: '想做的事',
    status: 'pending',
    order: 1,
    tags: ['知识图谱', '3D星域'],
    created_at: new Date(Date.now() - 72e5).toISOString(),
    updated_at: new Date(Date.now() - 72e5).toISOString(),
  },
  {
    id: 'todo-3',
    title: '研读 GraphRAG 与 Agent 编排前沿论文',
    description: '梳理上下文检索与知识沉淀的最佳工程实践，沉淀为标准提示词库。',
    category: '学习沉淀',
    status: 'pending',
    order: 2,
    tags: ['RAG', 'Agent'],
    created_at: new Date(Date.now() - 864e5).toISOString(),
    updated_at: new Date(Date.now() - 864e5).toISOString(),
  },
  {
    id: 'todo-4',
    title: '接入后端多模型路由与 API 鉴权机制',
    description: '支持根据任务类型动态调度 Gemini、OpenCode 及本地离线模型。',
    category: '待办事项',
    status: 'completed',
    order: 3,
    tags: ['后端架构'],
    created_at: new Date(Date.now() - 1728e5).toISOString(),
    updated_at: new Date(Date.now() - 1728e5).toISOString(),
    completed_at: new Date(Date.now() - 864e5).toISOString(),
  },
];

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_TODOS;
    } catch {
      return DEFAULT_TODOS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  // 新增待办（默认插入到列表最顶部，拥有最高优先级）
  const addTodo = useCallback(
    (
      title: string,
      category: TodoCategory = '待办事项',
      description?: string,
      dueDate?: string,
      tags: string[] = []
    ) => {
      if (!title.trim()) return;

      const now = new Date().toISOString();
      const newTodo: TodoItem = {
        id: crypto.randomUUID(),
        title: title.trim(),
        description: description?.trim(),
        category,
        status: 'pending',
        order: 0,
        dueDate,
        tags,
        created_at: now,
        updated_at: now,
      };

      setTodos((prev) => {
        // 其他事项的 order 依次后移
        const updated = prev.map((item) => ({ ...item, order: item.order + 1 }));
        return [newTodo, ...updated];
      });
    },
    []
  );

  // 切换完成状态
  const toggleComplete = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const isCompleting = item.status !== 'completed';
          return {
            ...item,
            status: isCompleting ? 'completed' : 'pending',
            completed_at: isCompleting ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString(),
          };
        }
        return item;
      })
    );
  }, []);

  // 更新待办
  const updateTodo = useCallback((id: string, patch: Partial<TodoItem>) => {
    setTodos((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...patch, updated_at: new Date().toISOString() } : item
      )
    );
  }, []);

  // 删除待办
  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // 拖拽重排（改变优先级顺序）
  const reorderTodos = useCallback((sourceIndex: number, destinationIndex: number) => {
    setTodos((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(sourceIndex, 1);
      result.splice(destinationIndex, 0, removed);
      // 重新为所有项赋予连续递增的 order
      return result.map((item, idx) => ({ ...item, order: idx }));
    });
  }, []);

  // 保存某事项的 AI 开展建议
  const saveAiAdvice = useCallback((id: string, advice: string) => {
    setTodos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, aiAdvice: advice } : item))
    );
  }, []);

  return {
    todos,
    addTodo,
    toggleComplete,
    updateTodo,
    deleteTodo,
    reorderTodos,
    saveAiAdvice,
  };
}
