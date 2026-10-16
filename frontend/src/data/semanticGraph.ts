import type { KnowledgeItem } from '../knowledgeTypes';

export const graphCategoryColors: Record<string, string> = {
  'AI 产品': '#55d8c6',
  '提示工程': '#f2b45f',
  '模型与技术': '#8aa7ff',
  '内容与创作': '#d39cff',
  '研究与趋势': '#ef8f9c',
  '待整理': '#8490a8',
};

export type SemanticNode = {
  id: string;
  data: {
    label: string;
    nodeType: 'category' | 'knowledge';
    category: string;
    kind?: KnowledgeItem['kind'];
    status?: KnowledgeItem['status'];
    confidence?: number;
    tags?: string[];
    summary?: string;
    color: string;
    childCount?: number;
  };
};

export type SemanticLink = {
  id: string;
  source: string;
  target: string;
  data: {
    relation: 'BELONGS_TO' | 'RELATED_TO';
    label: '收录' | '关联';
  };
};

type SemanticGraphOptions = {
  collapsedCategories?: Set<string>;
  query?: string;
};

export function buildSemanticGraph(items: KnowledgeItem[], options: SemanticGraphOptions = {}) {
  const normalizedQuery = options.query?.trim().toLocaleLowerCase();
  const matchingItems = normalizedQuery
    ? items.filter((item) => `${item.title} ${item.summary} ${item.tags.join(' ')}`.toLocaleLowerCase().includes(normalizedQuery))
    : items;
  const categories = [...new Set(matchingItems.map((item) => item.category))];
  const visibleItems = matchingItems.filter((item) => !options.collapsedCategories?.has(item.category));
  const visibleIds = new Set(visibleItems.map((item) => item.id));
  const nodes: SemanticNode[] = [
    ...categories.map((category) => ({
      id: `category-${category}`,
      data: {
        label: category,
        nodeType: 'category' as const,
        category,
        color: graphCategoryColors[category] ?? graphCategoryColors['待整理'],
        childCount: matchingItems.filter((item) => item.category === category).length,
      },
    })),
    ...visibleItems.map((item) => ({
      id: item.id,
      data: {
        label: item.title,
        nodeType: 'knowledge' as const,
        category: item.category,
        kind: item.kind,
        status: item.status,
        confidence: item.confidence,
        tags: item.tags,
        summary: item.summary,
        color: graphCategoryColors[item.category] ?? graphCategoryColors['待整理'],
      },
    })),
  ];
  const edges: SemanticLink[] = visibleItems.map((item) => ({
    id: `belongs-${item.id}`,
    source: `category-${item.category}`,
    target: item.id,
    data: { relation: 'BELONGS_TO' as const, label: '收录' as const },
  }));
  const seen = new Set<string>();
  visibleItems.forEach((item) => item.related_ids.forEach((targetId) => {
    const key = [item.id, targetId].sort().join(':');
    if (!seen.has(key) && visibleIds.has(targetId)) {
      seen.add(key);
      edges.push({
        id: `related-${key}`,
        source: item.id,
        target: targetId,
        data: { relation: 'RELATED_TO', label: '关联' },
      });
    }
  }));
  return { nodes, edges };
}
