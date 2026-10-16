import { useState, useEffect, useCallback } from 'react';
import type { KnowledgeItem, CaptureKind, Classification } from '../knowledgeTypes';
import { demoKnowledge } from '../data/knowledgeData';
import { buildSemanticGraph } from '../data/semanticGraph';

const STORAGE_KEY = 'starmap-knowledge-v1';

export function useKnowledge() {
  const [items, setItems] = useState<KnowledgeItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : demoKnowledge;
    } catch {
      return demoKnowledge;
    }
  });

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const fetchKnowledge = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/knowledge/items');
      if (res.ok) {
        const payload = await res.json();
        if (payload.data?.length) {
          setItems(payload.data);
        }
      }
    } catch {
      // 离线使用本地数据
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKnowledge();
  }, [fetchKnowledge]);

  const saveKnowledgeItem = useCallback(
    async (content: string, kind: CaptureKind, classification: Classification) => {
      const sourceUrl = content.match(/https?:\/\/\S+/i)?.[0];
      const localItem: KnowledgeItem = {
        id: crypto.randomUUID(),
        title: classification.summary.slice(0, 34) || '未命名灵感',
        content,
        kind,
        category: classification.category,
        tags: classification.tags,
        summary: classification.summary,
        source_url: sourceUrl,
        status: 'inbox',
        confidence: classification.confidence,
        classification_reason: classification.reason,
        related_ids: [],
        favorite: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setItems((prev) => [localItem, ...prev]);

      try {
        const response = await fetch('/api/knowledge/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, kind, source_url: sourceUrl }),
        });
        if (response.ok) {
          const payload = await response.json();
          if (payload.data) {
            setItems((prev) => prev.map((item) => (item.id === localItem.id ? payload.data : item)));
          }
        }
      } catch {
        // 本地优先
      }
    },
    []
  );

  const exportGraphJson = useCallback(() => {
    const graph = buildSemanticGraph(items);
    const payload = {
      schema: 'starmap.semantic-graph.v1',
      generated_at: new Date().toISOString(),
      description: '主题节点与知识节点组成的语义图。',
      ...graph,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `starmap-knowledge-graph-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  return {
    items,
    loading,
    saveKnowledgeItem,
    exportGraphJson,
    setItems,
  };
}
