export type CaptureKind = 'idea' | 'link' | 'prompt' | 'quote' | 'note';
export type KnowledgeStatus = 'inbox' | 'reading' | 'distilled';

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  kind: CaptureKind;
  category: string;
  tags: string[];
  summary: string;
  source_url?: string;
  source_title?: string;
  status: KnowledgeStatus;
  confidence: number;
  classification_reason: string;
  related_ids: string[];
  favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Classification {
  kind: CaptureKind;
  category: string;
  tags: string[];
  summary: string;
  confidence: number;
  reason: string;
}

// 视图类型与后端真实核心业务模块完全对齐
export type WorkspaceView =
  | 'marketplace'   // 应用广场（包含行业精选智能助手与集市）
  | 'library'       // 知识工程 -> 知识资料库
  | 'graph'         // 知识工程 -> 关系星图 (3D/2D)
  | 'inbox'         // 知识工程 -> 今日收集箱
  | 'projects'      // 项目档案库 (对应 /api/projects)
  | 'analysis';     // 分析洞察 (对应 /api/analysis/run)
