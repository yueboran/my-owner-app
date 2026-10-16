import type { Classification, KnowledgeItem } from '../knowledgeTypes';

const now = Date.now();

export const demoKnowledge: KnowledgeItem[] = [
  {
    id: 'seed-1', title: '把 AI 对话变成可生长的知识资产',
    content: '不要只保存整段对话。应该提取其中可复用的判断、提示词与方法，再通过主题和关系重新组织。',
    kind: 'idea', category: 'AI 产品', tags: ['AI 产品', '工作流'], summary: '从 AI 对话中提取可复用判断，并通过关系重新组织。',
    status: 'inbox', confidence: 0.85, classification_reason: '识别到“AI、工作流、知识”等主题词。',
    related_ids: ['seed-2', 'seed-5'], favorite: true, created_at: new Date(now - 18e5).toISOString(), updated_at: new Date(now - 18e5).toISOString(),
  },
  {
    id: 'seed-2', title: '渐进式知识蒸馏',
    content: '灵感先进入收集箱，阅读时补充上下文，最后再沉淀成观点。不要强迫用户在记录时完成所有分类。',
    kind: 'note', category: 'AI 产品', tags: ['AI 产品', '产品设计'], summary: '记录、阅读、沉淀应是三个渐进阶段。',
    status: 'reading', confidence: 0.91, classification_reason: '识别到“用户、记录、分类”等产品主题词。',
    related_ids: ['seed-1', 'seed-4'], favorite: false, created_at: new Date(now - 72e5).toISOString(), updated_at: new Date(now - 36e5).toISOString(),
  },
  {
    id: 'seed-3', title: '研究型提示词：先提出反证',
    content: '提示词：分析一个观点时，先列出三个可能推翻它的证据，再给出支持证据，最后标注不确定性。',
    kind: 'prompt', category: '提示工程', tags: ['提示工程', 'Prompt', '研究'], summary: '让模型先寻找反证，再形成带不确定性的结论。',
    status: 'distilled', confidence: 0.93, classification_reason: '识别到“提示词、证据、研究”等主题词。',
    related_ids: ['seed-6'], favorite: true, created_at: new Date(now - 864e5).toISOString(), updated_at: new Date(now - 864e5).toISOString(),
  },
  {
    id: 'seed-4', title: '阅读界面不该像数据后台',
    content: '密度可以高，但正文区域必须稳定、安静。把操作收进边缘，把注意力留给内容本身。',
    kind: 'quote', category: '内容与创作', tags: ['内容与创作', '产品设计'], summary: '高密度界面也需要稳定安静的正文区域。',
    status: 'distilled', confidence: 0.78, classification_reason: '识别到“阅读、正文、内容”等创作主题词。',
    related_ids: ['seed-2'], favorite: false, created_at: new Date(now - 1728e5).toISOString(), updated_at: new Date(now - 1728e5).toISOString(),
  },
  {
    id: 'seed-5', title: 'GraphRAG 的价值在关系检索',
    content: 'https://microsoft.github.io/graphrag/ 与普通向量检索相比，图谱更适合回答跨文档、跨实体的全局问题。',
    kind: 'link', category: '模型与技术', tags: ['模型与技术', 'RAG'], summary: '图谱检索更适合跨文档和跨实体的全局问题。',
    source_url: 'https://microsoft.github.io/graphrag/', status: 'reading', confidence: 0.94, classification_reason: '识别到“GraphRAG、向量、检索”等技术主题词。',
    related_ids: ['seed-1', 'seed-6'], favorite: false, created_at: new Date(now - 2592e5).toISOString(), updated_at: new Date(now - 2592e5).toISOString(),
  },
  {
    id: 'seed-6', title: '长上下文不等于可靠记忆',
    content: '上下文窗口变长，只是让信息有机会被看到；稳定记忆仍需要提取、索引、更新与遗忘机制。',
    kind: 'note', category: '模型与技术', tags: ['模型与技术', 'RAG', '研究'], summary: '可靠记忆依赖提取、索引、更新和遗忘，而不只是长上下文。',
    status: 'inbox', confidence: 0.88, classification_reason: '识别到“上下文、索引、记忆”等技术主题词。',
    related_ids: ['seed-3', 'seed-5'], favorite: false, created_at: new Date(now - 3456e5).toISOString(), updated_at: new Date(now - 3456e5).toISOString(),
  },
];

const categoryRules: Array<[string, string[]]> = [
  ['AI 产品', ['产品', '用户', '需求', '场景', '工作流', 'agent', 'copilot']],
  ['提示工程', ['prompt', '提示词', 'system', '上下文', '指令']],
  ['模型与技术', ['模型', 'llm', 'rag', 'embedding', '向量', '微调', '推理', 'token', 'api']],
  ['内容与创作', ['写作', '文章', '视频', '脚本', '设计', '创意', '内容', '视觉']],
  ['研究与趋势', ['研究', '论文', '报告', '趋势', '数据', '实验', 'benchmark']],
];

export function classifyLocally(content: string): Classification {
  const lower = content.toLowerCase();
  const scored = categoryRules.map(([category, words]) => ({ category, hits: words.filter((word) => lower.includes(word)) }))
    .sort((a, b) => b.hits.length - a.hits.length);
  const best = scored[0];
  const category = best.hits.length ? best.category : '待整理';
  const kind: Classification['kind'] = /https?:\/\//i.test(content) ? 'link'
    : /(prompt:|提示词|你是一名|请你)/i.test(content) ? 'prompt'
      : content.length <= 80 ? 'idea' : 'note';
  const tags = [category, ...(lower.includes('rag') || lower.includes('向量') ? ['RAG'] : []), ...(lower.includes('agent') || lower.includes('智能体') ? ['Agent'] : [])]
    .filter((tag, index, list) => tag !== '待整理' && list.indexOf(tag) === index).slice(0, 4);
  const compact = content.replace(/\s+/g, ' ').trim();
  return {
    kind, category, tags, summary: compact.length > 92 ? `${compact.slice(0, 92)}…` : compact,
    confidence: best.hits.length ? Math.min(.94, .55 + best.hits.length * .12) : .42,
    reason: best.hits.length ? `识别到“${best.hits.slice(0, 3).join('、')}”等主题词。` : '暂未发现明确主题词，先放入待整理。',
  };
}
