export type TodoCategory = '待办事项' | '想做的事' | '业务攻坚' | '学习沉淀' | '生活日常';
export type TodoStatus = 'pending' | 'completed' | 'archived';

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  category: TodoCategory;
  status: TodoStatus;
  order: number; // 排序序号，数值越小越重要
  dueDate?: string;
  tags: string[];
  aiAdvice?: string; // AI 生成的开展建议
  created_at: string;
  updated_at: string;
  completed_at?: string;
}
