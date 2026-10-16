// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExploreView } from './ExploreView';
import type { KnowledgeItem } from '../../knowledgeTypes';

vi.mock('../KnowledgeGraph', () => ({
  default: () => <div aria-label="G6 知识关系星图">G6 graph</div>,
}));

const item: KnowledgeItem = {
  id: 'knowledge-1',
  title: '合同风险识别',
  content: '识别合同主体风险',
  kind: 'note',
  category: 'AI 产品',
  tags: ['合同'],
  summary: '识别合同风险',
  status: 'reading',
  confidence: 0.9,
  classification_reason: '测试',
  related_ids: [],
  favorite: false,
  created_at: '2026-09-29T00:00:00.000Z',
  updated_at: '2026-09-29T00:00:00.000Z',
};

describe('ExploreView', () => {
  it('默认且唯一挂载 G6 图谱，不再加载旧 3D 引擎', async () => {
    render(<ExploreView items={[item]} onExportGraph={vi.fn()} onToast={vi.fn()} />);

    expect(await screen.findByLabelText('G6 知识关系星图')).toBeTruthy();
  });
});
