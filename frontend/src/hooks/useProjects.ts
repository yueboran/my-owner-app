import { useState, useEffect, useCallback } from 'react';
import type { Project, Comment, DraftRecord } from '../types';

const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: '智能财报翻译官',
    icon: 'account_balance',
    intro: '💡 每次看财报都像在读天书，能不能有个AI帮我用人话翻译一下？ —— @财务小李',
    description: '通过多模态大模型实时分析研报、财报及市场动态，用大白话输出核心结论，让每个人都能看懂复杂的金融数据。',
    auroraScore: 88,
    radar: { concept: 92, research: 85, planning: 88, extension: 80, evaluation: 95 },
    radarContributors: {},
    tags: ['个人成长', 'RAG', '打工人的救星'],
    commentsCount: 12,
    timeAgo: '2小时前',
    likes: 342,
    painPointCount: 156,
  },
  {
    id: 'proj-2',
    name: '社区医生 AI 助手',
    icon: 'neurology',
    intro: '💡 每次看病，医生一大半时间都在敲键盘录病历。能不能让AI帮医生写？ —— @急诊科老王',
    description: '利用联邦学习模型在保护患者隐私的前提下，帮医生自动生成病历，解放医生双手把时间还给病人。',
    auroraScore: 92,
    radar: { concept: 95, research: 90, planning: 88, extension: 92, evaluation: 96 },
    radarContributors: {},
    tags: ['健康与医疗', 'Healthcare', '科技向善'],
    commentsCount: 8,
    timeAgo: '5小时前',
    likes: 512,
    painPointCount: 320,
  },
  {
    id: 'proj-3',
    name: '设计师的魔法画笔',
    icon: 'palette',
    intro: '💡 每次改 banner 都要等设计师排期，能不能有个AI让我自己画？ —— @运营小鱼',
    description: '让不懂设计的人也能用自然语言生成专业级的矢量设计稿，并与主流设计软件无缝对接。',
    auroraScore: 84,
    radar: { concept: 89, research: 72, planning: 82, extension: 85, evaluation: 78 },
    radarContributors: {},
    tags: ['效率工具', 'Generative Art', '搞钱小助手'],
    commentsCount: 24,
    timeAgo: '1天前',
    likes: 189,
    painPointCount: 89,
  },
  {
    id: 'proj-4',
    name: '法务合同风险透镜',
    icon: 'gavel',
    intro: '💡 非标合同条款暗藏陷阱，如何快速交叉核验企业合规库？ —— @法务张总',
    description: '深度识别商务合同中的履约风险与隐蔽霸王条款，自动对比最新民商事判例，生成修改建议书。',
    auroraScore: 94,
    radar: { concept: 96, research: 92, planning: 90, extension: 94, evaluation: 95 },
    radarContributors: {},
    tags: ['企业服务', '合同审查', '打工人的救星'],
    commentsCount: 19,
    timeAgo: '2天前',
    likes: 420,
    painPointCount: 210,
  },
];

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('stars:projects');
    return saved ? JSON.parse(saved) : MOCK_PROJECTS;
  });

  const [loading, setLoading] = useState<boolean>(false);

  // 草稿箱
  const [drafts, setDrafts] = useState<DraftRecord[]>(() => {
    const saved = localStorage.getItem('stars:drafts');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('stars:projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('stars:drafts', JSON.stringify(drafts));
  }, [drafts]);

  // 从后端拉取项目
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const payload = await res.json();
        if (payload.data?.list?.length) {
          setProjects(payload.data.list);
        }
      }
    } catch {
      // 离线使用本地数据
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const toggleLike = useCallback((id: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, likes: (p.likes || 0) + 1 } : p))
    );
  }, []);

  const toggleBookmark = useCallback((id: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, bookmarked: !p.bookmarked } : p))
    );
  }, []);

  const toggleRecordBookmark = useCallback((projectId: string, recordId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId && p.comments) {
          return {
            ...p,
            comments: p.comments.map((c) =>
              c.id === recordId ? { ...c, bookmarked: !c.bookmarked } : c
            ),
          };
        }
        return p;
      })
    );
  }, []);

  const addProject = useCallback((newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
  }, []);

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const saveDraft = useCallback((draft: DraftRecord) => {
    setDrafts((prev) => [draft, ...prev.filter((d) => d.id !== draft.id)]);
  }, []);

  const deleteDraft = useCallback((draftId: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
  }, []);

  return {
    projects,
    loading,
    drafts,
    fetchProjects,
    toggleLike,
    toggleBookmark,
    toggleRecordBookmark,
    addProject,
    updateProject,
    deleteProject,
    saveDraft,
    deleteDraft,
    setProjects,
  };
}
