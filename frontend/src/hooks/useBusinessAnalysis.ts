/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 商业分析研报数据与研读中枢管理 Hook
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  BusinessReport,
  BusinessReportFolder,
  IndustryCategory,
  ReportType,
  BusinessTargetType,
} from '../types/businessAnalysis';
import { INITIAL_BUSINESS_REPORTS } from '../data/businessAnalysisData';

const STORAGE_KEY = 'hk_business_reports_v2';
const FOLDER_STORAGE_KEY = 'hk_business_folders_v2';

const DEFAULT_FOLDERS: BusinessReportFolder[] = [
  { id: 'folder-ai', name: '人工智能与前沿科技', parentId: null, isExpanded: true, createdAt: 1 },
  { id: 'folder-ecom', name: '出海与跨境电商', parentId: null, isExpanded: true, createdAt: 2 },
  { id: 'folder-saas', name: '企业服务与SaaS', parentId: null, isExpanded: true, createdAt: 3 },
  { id: 'folder-macro', name: '宏观经济与资本市场', parentId: null, isExpanded: true, createdAt: 4 },
];

export function useBusinessAnalysis() {
  const [folders, setFolders] = useState<BusinessReportFolder[]>(() => {
    try {
      const stored = localStorage.getItem(FOLDER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse business folders:', e);
    }
    return DEFAULT_FOLDERS;
  });

  const [reports, setReports] = useState<BusinessReport[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 合并最新内置研报，确保系统更新时新研报的四维资源与商业模型自动展现
          const map = new Map<string, BusinessReport>();
          INITIAL_BUSINESS_REPORTS.forEach((r) => map.set(r.id, r));
          parsed.forEach((r: BusinessReport) => {
            const base = map.get(r.id);
            if (base) {
              map.set(r.id, {
                ...base,
                ...r,
                businessTarget: base.businessTarget || r.businessTarget,
                fourResources: base.fourResources || r.fourResources,
                exchangeModel: base.exchangeModel || r.exchangeModel,
                threeTierLearning: base.threeTierLearning || r.threeTierLearning,
              });
            } else {
              map.set(r.id, r);
            }
          });
          return Array.from(map.values());
        }
      }
    } catch (e) {
      console.error('Failed to parse business reports:', e);
    }
    // 初次加载时将初始研报映射到对应的默认文件夹
    return INITIAL_BUSINESS_REPORTS.map((r) => {
      let folderId: string | null = null;
      if (r.category === 'ai_tech') folderId = 'folder-ai';
      else if (r.category === 'global_ecom') folderId = 'folder-ecom';
      else if (r.category === 'enterprise') folderId = 'folder-saas';
      else if (r.category === 'macro_finance') folderId = 'folder-macro';
      return { ...r, folderId };
    });
  });

  const [activeReportId, setActiveReportId] = useState<string>(() => {
    return reports[0]?.id || 'report-embodied-ai-2026';
  });

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<IndustryCategory | 'all'>('all');
  const [selectedType, setSelectedType] = useState<ReportType | 'all'>('all');
  const [selectedBusinessTarget, setSelectedBusinessTarget] = useState<BusinessTargetType | 'all'>('all');

  // 持久化文件夹存储
  useEffect(() => {
    try {
      localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Failed to save business folders:', e);
    }
  }, [folders]);

  // 持久化研报存储
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch (e) {
      console.error('Failed to save business reports:', e);
    }
  }, [reports]);


  // 当前研读的研报
  const activeReport = useMemo(() => {
    return reports.find((r) => r.id === activeReportId) || reports[0] || null;
  }, [reports, activeReportId]);

  // 过滤后的研报清单
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchSearch =
        !searchTerm.trim() ||
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.sourceOrg.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory = selectedCategory === 'all' || r.category === selectedCategory;
      const matchType = selectedType === 'all' || r.reportType === selectedType;
      const matchTarget = selectedBusinessTarget === 'all' || r.businessTarget === selectedBusinessTarget;

      return matchSearch && matchCategory && matchType && matchTarget;
    });
  }, [reports, searchTerm, selectedCategory, selectedType, selectedBusinessTarget]);

  // 切换收藏
  const toggleBookmark = useCallback((reportId: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, isBookmarked: !r.isBookmarked } : r))
    );
  }, []);

  // 新增录入研报
  const addReport = useCallback(
    (newReportData: Omit<BusinessReport, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newReport: BusinessReport = {
        ...newReportData,
        id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setReports((prev) => [newReport, ...prev]);
      setActiveReportId(newReport.id);
      return newReport;
    },
    []
  );

  // 更新研报
  const updateReport = useCallback(
    (reportId: string, updated: Partial<BusinessReport>) => {
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, ...updated, updatedAt: Date.now() }
            : r
        )
      );
    },
    []
  );

  // 删除研报
  const deleteReport = useCallback(
    (reportId: string) => {
      setReports((prev) => {
        const next = prev.filter((r) => r.id !== reportId);
        if (activeReportId === reportId && next.length > 0) {
          setActiveReportId(next[0].id);
        }
        return next;
      });
    },
    [activeReportId]
  );

  // 新建文件夹
  const createFolder = useCallback((name: string, parentId?: string | null) => {
    const newFolder: BusinessReportFolder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || '新建研报分组',
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

  // 删除文件夹（同时将该文件夹内的研报移到未归档区或父级目录）
  const deleteFolder = useCallback((folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId && f.parentId !== folderId));
    setReports((prev) =>
      prev.map((r) => (r.folderId === folderId ? { ...r, folderId: null } : r))
    );
  }, []);

  // 展开/收起文件夹
  const toggleFolderExpand = useCallback((folderId: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, isExpanded: !f.isExpanded } : f))
    );
  }, []);

  // 移动研报到指定文件夹
  const moveReportToFolder = useCallback((reportId: string, targetFolderId: string | null) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, folderId: targetFolderId, updatedAt: Date.now() } : r))
    );
  }, []);

  return {
    reports,
    filteredReports,
    folders,
    activeReportId,
    activeReport,
    setActiveReportId,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    selectedType,
    setSelectedType,
    selectedBusinessTarget,
    setSelectedBusinessTarget,
    toggleBookmark,
    addReport,
    updateReport,
    deleteReport,
    createFolder,
    renameFolder,
    deleteFolder,
    toggleFolderExpand,
    moveReportToFolder,
  };
}

