import { describe, expect, it } from 'vitest';
import { buildSemanticGraph } from './semanticGraph';
import type { KnowledgeItem } from '../knowledgeTypes';

const item: KnowledgeItem = {
  id: 'knowledge-1',
  title: '合同主体风险识别',
  content: '识别合同主体与风险等级。',
  kind: 'note',
  category: 'AI 产品',
  tags: ['合同', '风险'],
  summary: '识别合同主体风险',
  status: 'reading',
  confidence: 0.92,
  classification_reason: '示例',
  related_ids: [],
  favorite: true,
  created_at: '2026-09-29T00:00:00.000Z',
  updated_at: '2026-09-29T00:00:00.000Z',
};

const secondItem: KnowledgeItem = {
  ...item,
  id: 'knowledge-2',
  title: '提示词评测方法',
  category: '提示工程',
  tags: ['提示词'],
  summary: '建立稳定的提示词评测基线',
};

describe('buildSemanticGraph', () => {
  it('将知识条目转换为 G6 的 data 字段契约', () => {
    const graph = buildSemanticGraph([item]);

    expect(graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'knowledge-1',
        data: expect.objectContaining({
          label: '合同主体风险识别',
          nodeType: 'knowledge',
          category: 'AI 产品',
          status: 'reading',
          confidence: 0.92,
        }),
      }),
    ]));
    expect(graph.edges).toEqual([
      expect.objectContaining({
        id: 'belongs-knowledge-1',
        source: 'category-AI 产品',
        target: 'knowledge-1',
        data: { relation: 'BELONGS_TO', label: '收录' },
      }),
    ]);
  });

  it('折叠类别时隐藏其知识节点及关联边', () => {
    const buildWithOptions = buildSemanticGraph as unknown as (
      items: KnowledgeItem[],
      options: { collapsedCategories: Set<string> },
    ) => ReturnType<typeof buildSemanticGraph>;

    const graph = buildWithOptions([item, secondItem], {
      collapsedCategories: new Set(['AI 产品']),
    });

    expect(graph.nodes.map((node) => node.id)).toEqual([
      'category-AI 产品',
      'category-提示工程',
      'knowledge-2',
    ]);
    expect(graph.edges.map((edge) => edge.id)).toEqual(['belongs-knowledge-2']);
  });

  it('搜索时保留匹配知识及其所属类别', () => {
    const buildWithOptions = buildSemanticGraph as unknown as (
      items: KnowledgeItem[],
      options: { query: string },
    ) => ReturnType<typeof buildSemanticGraph>;

    const graph = buildWithOptions([item, secondItem], { query: '合同' });

    expect(graph.nodes.map((node) => node.id)).toEqual([
      'category-AI 产品',
      'knowledge-1',
    ]);
    expect(graph.edges.map((edge) => edge.id)).toEqual(['belongs-knowledge-1']);
  });
});
