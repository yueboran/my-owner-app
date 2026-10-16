/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 个人传记与历史人物谱牒鉴戒 Hook
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  BiographyProfile,
  BiographyFolder,
  BiographyTimelineEvent,
  BiographyCategory,
  TimelineEventStage,
} from '../types/biography';
import { INITIAL_BIOGRAPHIES } from '../data/biographyData';

const STORAGE_KEY = 'hk_historical_biographies_v3';
const FOLDER_STORAGE_KEY = 'hk_historical_bio_folders_v1';

const DEFAULT_BIO_FOLDERS: BiographyFolder[] = [
  { id: 'folder-leader', name: '先贤统帅与名将', parentId: null, isExpanded: true, createdAt: 1 },
  { id: 'folder-thinker', name: '思想宗师与哲人', parentId: null, isExpanded: true, createdAt: 2 },
  { id: 'folder-strategist', name: '经世名臣与商界巨擘', parentId: null, isExpanded: true, createdAt: 3 },
  { id: 'folder-innovator', name: '科学探索与革新者', parentId: null, isExpanded: true, createdAt: 4 },
];

export function useBiography() {
  const [folders, setFolders] = useState<BiographyFolder[]>(() => {
    try {
      const stored = localStorage.getItem(FOLDER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse biography folders:', e);
    }
    return DEFAULT_BIO_FOLDERS;
  });

  const [biographies, setBiographies] = useState<BiographyProfile[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 确保每个初始人物都拥有最新的推演剧本库
          return parsed.map((item: BiographyProfile) => {
            const initial = INITIAL_BIOGRAPHIES.find((init) => init.id === item.id);
            return {
              ...item,
              scenarios: item.scenarios && item.scenarios.length > 0 ? item.scenarios : (initial?.scenarios || []),
            };
          });
        }
      }
    } catch (e) {
      console.error('Failed to parse biographies:', e);
    }
    // 初始映射
    return INITIAL_BIOGRAPHIES.map((b) => {
      let folderId = 'folder-leader';
      if (b.category === 'thinker') folderId = 'folder-thinker';
      else if (b.category === 'strategist') folderId = 'folder-strategist';
      else if (b.category === 'innovator') folderId = 'folder-innovator';
      return { ...b, folderId };
    });
  });

  const [activeBioId, setActiveBioId] = useState<string>(() => {
    return biographies[0]?.id || 'zhang-huaiyi';
  });

  // 持久化保存文件夹
  useEffect(() => {
    try {
      localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Failed to save biography folders:', e);
    }
  }, [folders]);

  // 持久化保存传记
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(biographies));
    } catch (e) {
      console.error('Failed to save biographies:', e);
    }
  }, [biographies]);


  // 当前激活的人物
  const activeBio = useMemo(() => {
    return biographies.find((b) => b.id === activeBioId) || biographies[0] || null;
  }, [biographies, activeBioId]);

  // 新增人物档案
  const addBiography = useCallback(
    (params: {
      name: string;
      courtesyName?: string;
      era: string;
      category: BiographyCategory;
      tagline: string;
      motto: string;
      overview: string;
      avatarEmoji?: string;
      registryType?: string;
      nativePlace?: string;
      birthDate?: string;
      ageOrLifespan?: string;
      height?: string;
      weight?: string;
      rankOrTitle?: string;
      education?: string;
      motive?: string;
      hobbies?: string;
    }) => {
      const newBio: BiographyProfile = {
        id: `bio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: params.name.trim(),
        courtesyName: params.courtesyName?.trim() || undefined,
        era: params.era.trim(),
        category: params.category || 'leader',
        tagline: params.tagline.trim(),
        motto: params.motto.trim(),
        overview: params.overview.trim(),
        avatarEmoji: params.avatarEmoji || '📜',
        dossier: {
          registryType: params.registryType || '履歷牒',
          nativePlace: params.nativePlace || '郡望待考',
          birthDate: params.birthDate || '吉日生',
          ageOrLifespan: params.ageOrLifespan || '盛年',
          appearance: {
            height: params.height || '五尺八寸',
            weight: params.weight || '一百四十斤',
            bearing: '器宇軒昂，風骨凝然',
          },
          serviceInfo: {
            rankOrTitle: params.rankOrTitle || '名士',
            rankBadgeColor: '#f59e0b',
          },
          background: {
            education: params.education || '博覽群書，明曉事理',
            motive: params.motive || '志在兼濟天下，立身揚名',
            hobbies: params.hobbies || '讀書、習禮、靜思',
          },
          physicalCondition: {
            assessment: '壯健',
            lastCheckDate: '近代',
            injuryOrScars: '筋骨強健，無礙大局',
          },
        },
        analysis: {
          successFactors: ['【志向篤定】：目標明確，百折不撓。'],
          failureLessons: ['【防微杜漸】：需警惕戰術順利掩蓋戰略盲區。'],
          actionableInsights: ['知行合一，用確定性的笨功夫對抗外界動盪。'],
          luckAndTiming: ['順應時代大勢，風雲際會之時順勢而起。'],
        },
        timeline: [],
        scenarios: [],
        externalSources: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setBiographies((prev) => [newBio, ...prev]);
      setActiveBioId(newBio.id);
      return newBio;
    },
    []
  );

  // 更新人物档案
  const updateBiography = useCallback((id: string, updates: Partial<BiographyProfile>) => {
    setBiographies((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates, updatedAt: Date.now() } : b))
    );
  }, []);

  // 删除人物档案
  const deleteBiography = useCallback(
    (id: string) => {
      setBiographies((prev) => {
        const next = prev.filter((b) => b.id !== id);
        if (next.length > 0 && activeBioId === id) {
          setActiveBioId(next[0].id);
        }
        return next;
      });
    },
    [activeBioId]
  );

  // 为人物在生平时间线上新增大事件
  const addTimelineEvent = useCallback(
    (
      bioId: string,
      event: {
        year: string;
        title: string;
        stage: TimelineEventStage;
        description: string;
        outcomeType: 'success' | 'failure' | 'turning_point';
        situation?: string;
        rootCause?: string;
        characterAnalysis?: string;
        experienceFactor: string;
        luckFactor: string;
        lessonLearned: string;
        externalRef?: string;
      }
    ) => {
      const newEvent: BiographyTimelineEvent = {
        id: `tl-event-${Date.now()}`,
        year: event.year.trim(),
        title: event.title.trim(),
        stage: event.stage || 'rise',
        description: event.description.trim(),
        outcomeType: event.outcomeType || 'turning_point',
        situation: event.situation?.trim() || '身处关键历史节点，面临重大内外挑战与两难抉择。',
        rootCause: event.rootCause?.trim() || '时代大势演变与深层内在驱动力交织爆发。',
        characterAnalysis: event.characterAnalysis?.trim() || '体现了该人物在逆境与决策中的独特心智模型与性格底色。',
        attribution: {
          experienceFactor: event.experienceFactor.trim(),
          luckFactor: event.luckFactor.trim(),
        },
        lessonLearned: event.lessonLearned.trim(),
        externalRef: event.externalRef?.trim() || undefined,
      };

      setBiographies((prev) =>
        prev.map((b) =>
          b.id === bioId
            ? { ...b, timeline: [...b.timeline, newEvent], updatedAt: Date.now() }
            : b
        )
      );
      return newEvent;
    },
    []
  );

  // 删除时间线事件
  const deleteTimelineEvent = useCallback((bioId: string, eventId: string) => {
    setBiographies((prev) =>
      prev.map((b) =>
        b.id === bioId
          ? { ...b, timeline: b.timeline.filter((e) => e.id !== eventId), updatedAt: Date.now() }
          : b
      )
    );
  }, []);

  // 为人物添加外部参考资料/库
  const addExternalSource = useCallback(
    (bioId: string, source: { name: string; type: string; url?: string }) => {
      setBiographies((prev) =>
        prev.map((b) =>
          b.id === bioId
            ? {
                ...b,
                externalSources: [...b.externalSources, source],
                updatedAt: Date.now(),
              }
            : b
        )
      );
    },
    []
  );

  // 新建文件夹
  const createFolder = useCallback((name: string, parentId?: string | null) => {
    const newFolder: BiographyFolder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || '新建人物分组',
      parentId: parentId || null,
      isExpanded: true,
      createdAt: Date.now(),
    };
    setFolders((prev) => [...prev, newFolder]);
    return newFolder;
  }, []);

  // 重命名文件夹
  const renameFolder = useCallback((folderId: string, newName: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, name: newName.trim() } : f))
    );
  }, []);

  // 删除文件夹
  const deleteFolder = useCallback((folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId && f.parentId !== folderId));
    setBiographies((prev) =>
      prev.map((b) => (b.folderId === folderId ? { ...b, folderId: null } : b))
    );
  }, []);

  // 展开/收起文件夹
  const toggleFolderExpand = useCallback((folderId: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, isExpanded: !f.isExpanded } : f))
    );
  }, []);

  // 移动人物到指定文件夹
  const moveBioToFolder = useCallback((bioId: string, targetFolderId: string | null) => {
    setBiographies((prev) =>
      prev.map((b) => (b.id === bioId ? { ...b, folderId: targetFolderId, updatedAt: Date.now() } : b))
    );
  }, []);

  return {
    biographies,
    folders,
    activeBioId,
    activeBio,
    setActiveBioId,
    addBiography,
    updateBiography,
    deleteBiography,
    addTimelineEvent,
    deleteTimelineEvent,
    addExternalSource,
    createFolder,
    renameFolder,
    deleteFolder,
    toggleFolderExpand,
    moveBioToFolder,
  };
}

