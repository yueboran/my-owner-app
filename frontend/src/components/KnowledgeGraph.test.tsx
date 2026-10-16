// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { vi } from 'vitest';
import * as KnowledgeGraphModule from './KnowledgeGraph';
import type { NodeData } from '@antv/g6';

describe('KnowledgeNodeCard', () => {
  it('暴露可独立验证的业务节点组件', () => {
    expect((KnowledgeGraphModule as Record<string, unknown>).KnowledgeNodeCard).toBeTypeOf('function');
  });

  it('在 React 节点内双击主题时触发展开收起回调', () => {
    const onToggle = vi.fn();
    const NodeCard = KnowledgeGraphModule.KnowledgeNodeCard as unknown as React.FC<{
      node: NodeData;
      selected: boolean;
      collapsed: boolean;
      onToggle: () => void;
    }>;
    const { getByText } = render(
      <NodeCard
        node={{ id: 'category-AI 产品', data: { label: 'AI 产品', nodeType: 'category', category: 'AI 产品', color: '#55d8c6', childCount: 1 } }}
        selected={false}
        collapsed={false}
        onToggle={onToggle}
      />,
    );

    fireEvent.doubleClick(getByText('AI 产品'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('在 React 节点内点击知识卡片时触发选择回调', () => {
    const onSelect = vi.fn();
    const NodeCard = KnowledgeGraphModule.KnowledgeNodeCard as unknown as React.FC<{
      node: NodeData;
      selected: boolean;
      collapsed: boolean;
      onSelect: () => void;
    }>;
    const { getByText } = render(
      <NodeCard
        node={{ id: 'knowledge-1', data: { label: '合同风险', nodeType: 'knowledge', category: 'AI 产品', color: '#55d8c6', status: 'reading', confidence: 0.9 } }}
        selected={false}
        collapsed={false}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(getByText('合同风险'));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe('startGraphRender', () => {
  it('组件在异步渲染完成前卸载时，等待完成后再销毁且不发布就绪实例', async () => {
    let resolveRender: (() => void) | undefined;
    const graph = {
      render: vi.fn(() => new Promise<void>((resolve) => { resolveRender = resolve; })),
      destroy: vi.fn(),
    };
    const onReady = vi.fn();
    const startGraphRender = (KnowledgeGraphModule as Record<string, unknown>).startGraphRender as
      | ((instance: typeof graph, ready: () => void) => () => void)
      | undefined;

    expect(startGraphRender).toBeTypeOf('function');
    const cleanup = startGraphRender!(graph, onReady);
    cleanup();
    expect(graph.destroy).not.toHaveBeenCalled();

    resolveRender?.();
    await Promise.resolve();

    expect(graph.destroy).toHaveBeenCalledTimes(1);
    expect(onReady).not.toHaveBeenCalled();
  });
});
