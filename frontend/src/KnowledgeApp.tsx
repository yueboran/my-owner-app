import { useEffect, useMemo, useState } from 'react';
import {
  Archive, ArrowRight, BookOpen, Box, Check, ChevronDown, ChevronRight, ChevronLeft,
  CircleDot, Clock, Clock3, Command, Download, ExternalLink, FileText, Heart,
  Inbox, Layers3, Lightbulb, Link2, Menu, Network, PanelRightClose, Search,
  Sparkles, Bot, RefreshCcw, Star, Tag, Trash2, WandSparkles, X,
  LayoutGrid, FolderKanban, User, CheckCircle2, FolderGit2, LogOut, Settings
} from 'lucide-react';
import QuickCapture from './components/QuickCapture';
import KnowledgeGraph from './components/KnowledgeGraph';
import MarketplaceView from './components/MarketplaceView';
import { buildSemanticGraph } from './data/semanticGraph';
import { classifyLocally, demoKnowledge } from './data/knowledgeData';
import type { CaptureKind, Classification, KnowledgeItem, KnowledgeStatus, WorkspaceView } from './knowledgeTypes';
import './knowledge.css';
import './marketplace.css';

const API_BASE = (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ?? '/api';
const STORAGE_KEY = 'starmap-knowledge-v1';
import AnalysisView from './components/AnalysisView';

const kindMeta: Record<CaptureKind, { label: string; icon: typeof Lightbulb }> = {
  idea: { label: '灵感', icon: Lightbulb },
  link: { label: '链接', icon: Link2 },
  prompt: { label: '提示词', icon: WandSparkles },
  quote: { label: '摘录', icon: BookOpen },
  note: { label: '笔记', icon: FileText },
};

const statusMeta: Record<KnowledgeStatus, string> = {
  inbox: '待消化',
  reading: '阅读中',
  distilled: '已沉淀',
};

function relativeTime(value: string) {
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
  const minutes = Math.max(1, Math.round((Date.now() - new Date(normalized).getTime()) / 60000));
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.round(hours / 24)} 天前`;
}

function loadStoredItems(): KnowledgeItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : demoKnowledge;
  } catch {
    return demoKnowledge;
  }
}

export default function KnowledgeApp() {
  const [items, setItems] = useState<KnowledgeItem[]>(loadStoredItems);
  
  // 从 URL Hash 获取初始视图，缺省为 marketplace
  const getInitialView = (): WorkspaceView => {
    const hash = window.location.hash.replace('#', '') as WorkspaceView;
    const validViews: WorkspaceView[] = ['marketplace', 'library', 'graph', 'inbox', 'projects', 'analysis'];
    return validViews.includes(hash) ? hash : 'marketplace';
  };

  const [view, setView] = useState<WorkspaceView>(getInitialView);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // 后端项目列表状态 (对接 /api/projects)
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // 知识工程子菜单展开折叠
  const [knowledgeEngineOpen, setKnowledgeEngineOpen] = useState(true);

  // 统一路由跳转函数（自动同步 Hash 与全局状态）
  const navigateTo = (targetView: WorkspaceView, filterKeyword?: string) => {
    setView(targetView);
    window.location.hash = targetView;
    if (filterKeyword !== undefined) {
      setQuery(filterKeyword);
    }
    setUserMenuOpen(false);
    // 若在小屏幕下自动关闭抽屉
    if (window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
  };

  // 监听浏览器前进后退与 Hash 改变
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as WorkspaceView;
      const validViews: WorkspaceView[] = ['marketplace', 'library', 'graph', 'inbox', 'projects', 'analysis'];
      if (validViews.includes(hash)) {
        setView(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(items)), [items]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!selectedId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(undefined);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedId]);

  // 从后端加载知识库条目
  useEffect(() => {
    fetch(`${API_BASE}/knowledge/items`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => {
        const serverItems = payload.data as KnowledgeItem[];
        if (serverItems?.length) {
          setItems((current) => {
            const serverIds = new Set(serverItems.map((item) => item.id));
            return [...serverItems, ...current.filter((item) => !serverIds.has(item.id))];
          });
        }
      })
      .catch(() => undefined);
  }, []);

  // 切换到项目视图时，从后端加载真实项目列表
  useEffect(() => {
    if (view === 'projects') {
      setLoadingProjects(true);
      fetch(`${API_BASE}/projects`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((payload) => {
          if (payload.data?.list) {
            setProjectsList(payload.data.list);
          }
        })
        .catch(() => undefined)
        .finally(() => setLoadingProjects(false));
    }
  }, [view]);

  const categories = useMemo(() => ['全部', ...Array.from(new Set(items.map((item) => item.category)))], [items]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = category === '全部' || item.category === category;
      const haystack = `${item.title} ${item.content} ${item.tags.join(' ')}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query.toLowerCase());
      const matchesView = view !== 'inbox' || item.status === 'inbox';
      return matchesCategory && matchesQuery && matchesView;
    });
  }, [category, items, query, view]);

  const selected = items.find((item) => item.id === selectedId);

  const saveItem = async (content: string, kind: CaptureKind, classification: Classification) => {
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
    setItems((current) => [localItem, ...current]);
    setToast(`已记录，并归入「${classification.category}」`);
    try {
      const response = await fetch(`${API_BASE}/knowledge/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, kind, source_url: sourceUrl }),
      });
      if (response.ok) {
        const payload = await response.json();
        setItems((current) => current.map((item) => (item.id === localItem.id ? payload.data : item)));
      }
    } catch {
      // 离线优先
    }
  };

  const updateItem = (id: string, patch: Partial<KnowledgeItem>, message?: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...patch, updated_at: new Date().toISOString() } : item
      )
    );
    if (message) setToast(message);
    void fetch(`${API_BASE}/knowledge/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => undefined);
  };

  const deleteItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setSelectedId(undefined);
    setToast('已移除这条记录');
    void fetch(`${API_BASE}/knowledge/items/${id}`, { method: 'DELETE' }).catch(() => undefined);
  };

  const openItem = (id: string) => {
    setSelectedId(id);
  };

  const exportGraph = () => {
    const graph = buildSemanticGraph(items);
    const payload = {
      schema: 'starmap.semantic-graph.v1',
      generated_at: new Date().toISOString(),
      description: '主题节点与知识节点组成的语义图。BELONGS_TO 表示主题归属，RELATED_TO 表示知识关联。',
      ...graph,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `starmap-knowledge-graph-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast('语义图谱 JSON 已导出');
  };

  // 点击知识工程主菜单时的智能跳转处理
  const handleKnowledgeEngineClick = () => {
    if (!knowledgeEngineOpen) {
      setKnowledgeEngineOpen(true);
    }
    // 如果当前不在知识工程的子页面，则自动跳转到知识资料库
    if (view !== 'library' && view !== 'graph' && view !== 'inbox') {
      navigateTo('library');
    } else {
      setKnowledgeEngineOpen(!knowledgeEngineOpen);
    }
  };

  return (
    <div className="app-shell">
      {/* 1. 左侧树形侧边栏 */}
      <aside className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* 顶部品牌识别区（点击可快速回首页） */}
        <div className="sidebar-header">
          <div
            className="brand-logo-wrap"
            style={{ cursor: 'pointer' }}
            onClick={() => navigateTo('marketplace')}
            title="返回应用广场首页"
          >
            <div className="brand-logo-icon">
              <Sparkles size={18} />
            </div>
            {!sidebarCollapsed && (
              <span className="brand-title">华鲲元启</span>
            )}
          </div>
        </div>

        {/* 导航菜单列表 */}
        <div className="sidebar-nav-scroll">
          {/* ① 应用广场 */}
          <button
            className={`nav-item-btn ${view === 'marketplace' ? 'active-featured' : ''}`}
            onClick={() => navigateTo('marketplace')}
            title="应用广场"
          >
            <div className="nav-item-icon">
              <LayoutGrid size={17} />
            </div>
            {!sidebarCollapsed && <span className="nav-item-label">应用广场</span>}
          </button>

          {/* ② 知识工程 */}
          <button
            className={`nav-item-btn ${(view === 'library' || view === 'graph' || view === 'inbox') && !sidebarCollapsed ? 'active-sub' : ''}`}
            onClick={handleKnowledgeEngineClick}
            title="知识工程"
          >
            <div className="nav-item-icon">
              <FolderKanban size={17} />
            </div>
            {!sidebarCollapsed && (
              <>
                <span className="nav-item-label">知识工程</span>
                <span className={`nav-arrow ${knowledgeEngineOpen ? 'rotated' : ''}`}>
                  <ChevronDown size={14} />
                </span>
              </>
            )}
          </button>

          {/* 知识工程展开的子菜单 */}
          {!sidebarCollapsed && knowledgeEngineOpen && (
            <div className="sub-menu-list">
              <button
                className={`sub-menu-item ${view === 'library' ? 'active' : ''}`}
                onClick={() => navigateTo('library')}
              >
                <BookOpen size={14} />
                <span>知识资料库</span>
              </button>
              <button
                className={`sub-menu-item ${view === 'graph' ? 'active' : ''}`}
                onClick={() => navigateTo('graph')}
              >
                <Network size={14} />
                <span>关系星图 (3D/2D)</span>
              </button>
              <button
                className={`sub-menu-item ${view === 'inbox' ? 'active' : ''}`}
                onClick={() => navigateTo('inbox')}
              >
                <Inbox size={14} />
                <span>今日收集箱</span>
              </button>
            </div>
          )}

          {/* ③ 项目矩阵 (对接 /api/projects) */}
          <button
            className={`nav-item-btn ${view === 'projects' ? 'active-featured' : ''}`}
            onClick={() => navigateTo('projects')}
            title="项目矩阵"
          >
            <div className="nav-item-icon">
              <FolderGit2 size={17} />
            </div>
            {!sidebarCollapsed && <span className="nav-item-label">项目矩阵</span>}
          </button>

          {/* ④ 分析洞察 (对接 /api/analysis/run) */}
          <button
            className={`nav-item-btn ${view === 'analysis' ? 'active-featured' : ''}`}
            onClick={() => navigateTo('analysis')}
            title="分析洞察"
          >
            <div className="nav-item-icon">
              <Bot size={17} />
            </div>
            {!sidebarCollapsed && <span className="nav-item-label">分析洞察</span>}
          </button>
        </div>

        {/* 底部折叠切换 */}
        <div className="sidebar-footer">
          <button
            className="collapse-toggle-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? '展开导航' : '收起导航'}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>

      {/* 2. 主工作区 */}
      <div className="app-main">
        {/* 顶部全局信息与快速导航栏 */}
        <header className="main-topbar">
          <div style={{ position: 'relative' }}>
            <div
              className="user-profile-widget"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="user-avatar-circle">
                <User size={16} />
              </div>
              <span className="user-name-text">yueboran</span>
              <ChevronDown size={14} color="#8c9ba8" />
            </div>

            {/* 用户下拉菜单浮层 */}
            {userMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 6,
                  background: '#ffffff',
                  borderRadius: 10,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0',
                  width: 160,
                  padding: '6px 0',
                  zIndex: 50,
                }}
              >
                <button
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    fontSize: 13,
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onClick={() => navigateTo('marketplace')}
                >
                  <LayoutGrid size={15} /> 应用广场
                </button>
                <button
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    fontSize: 13,
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onClick={() => navigateTo('library')}
                >
                  <BookOpen size={15} /> 知识资料库
                </button>
                <button
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    fontSize: 13,
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onClick={() => navigateTo('projects')}
                >
                  <FolderGit2 size={15} /> 项目矩阵
                </button>
                <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
                <button
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    fontSize: 13,
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onClick={() => navigateTo('analysis')}
                >
                  <Bot size={15} /> 系统分析报告
                </button>
              </div>
            )}
          </div>
        </header>

        {/* 页面视图路由分发 */}
        {view === 'marketplace' ? (
          <MarketplaceView
            onNavigateToView={(target) => navigateTo(target as WorkspaceView)}
            onOpenKnowledgeDetail={(keyword) => navigateTo('library', keyword)}
            onSaveToKnowledge={(content, cat, title) => {
              saveItem(content, 'note', {
                kind: 'note',
                category: cat || 'AI 产品',
                tags: [cat || 'AI 应用'],
                summary: title || '应用沉淀内容',
                confidence: 0.95,
                reason: '由应用集市智能体一键沉淀',
              });
            }}
          />
        ) : view === 'graph' ? (
          <div className="marketplace-container graph-page">
            <section className="graph-view">
              <div className="section-heading graph-heading">
                <div>
                  <p className="eyebrow">KNOWLEDGE CONSTELLATION</p>
                  <h2>知识关系星图</h2>
                  <p>{items.length} 个知识实体 · {categories.length - 1} 个主题域 · G6 语义拓扑</p>
                </div>
                <button className="graph-export" onClick={exportGraph}><Download size={15} />导出语义图谱</button>
              </div>

              <KnowledgeGraph
                items={items}
                selectedId={selectedId}
                onSelect={openItem}
                onRelate={(sourceId, targetId) => {
                  const source = items.find((item) => item.id === sourceId);
                  if (!source || source.related_ids.includes(targetId)) return;
                  updateItem(sourceId, { related_ids: [...source.related_ids, targetId] }, '已建立知识关联');
                }}
              />
            </section>
          </div>
        ) : view === 'analysis' ? (
          <div className="marketplace-container">
            <AnalysisView />
          </div>
        ) : view === 'projects' ? (
          /* 项目档案库视图 (对应 /api/projects) */
          <div className="marketplace-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: 18, color: '#1a202c' }}>项目矩阵与工作流档案</h2>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  后端持久化项目管理，支持多维度业务工作流与知识资产关联
                </p>
              </div>
            </div>

            {loadingProjects ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                正在从后端同步项目档案...
              </div>
            ) : projectsList.length > 0 ? (
              <section className="market-cards-grid">
                {projectsList.map((proj) => (
                  <div key={proj.id} className="market-card-item">
                    <div className="market-card-header">
                      <div className="app-icon-container" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                        <FolderGit2 size={18} />
                      </div>
                      <div className="app-title-group">
                        <h4 className="app-card-title">{proj.name}</h4>
                        <span className="app-card-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                          {proj.tag || '项目'}
                        </span>
                      </div>
                    </div>
                    <p className="app-card-desc">{proj.intro || '暂无详细介绍'}</p>
                    <div className="market-card-footer">
                      <div className="meta-author">
                        <User size={12} />
                        <span>获赞 {proj.likes ?? 0}</span>
                      </div>
                      <div className="meta-date">
                        <Clock size={12} />
                        <span>{proj.created_at ? relativeTime(proj.created_at) : '最近'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            ) : (
              <div style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 40, textAlign: 'center' }}>
                <FolderGit2 size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ margin: '0 0 6px', fontSize: 15, color: '#334155' }}>当前暂无项目档案</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  您可以在知识工程中沉淀灵感，或在应用广场中一键生成并归档。
                </p>
              </div>
            )}
          </div>
        ) : (
          /* 知识工程 -> 知识资料库 / 今日收集箱 视图 */
          <div className="marketplace-container">
            <QuickCapture onSave={saveItem} />

            <section className="market-toolbar" style={{ marginTop: 10 }}>
              <div className="market-title-tabs">
                <h2 className="market-section-title">
                  {view === 'inbox' ? '待消化收集箱' : '知识资料库'}
                </h2>
                <div className="category-capsules">
                  {categories.map((itemCategory) => (
                    <button
                      key={itemCategory}
                      className={`capsule-btn ${category === itemCategory ? 'active' : ''}`}
                      onClick={() => setCategory(itemCategory)}
                    >
                      {itemCategory}
                    </button>
                  ))}
                </div>
              </div>

              <div className="market-search-box">
                <input
                  type="text"
                  placeholder="搜索知识内容、标签或主题"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Search size={16} color="#8c9ba8" />
              </div>
            </section>

            {/* 知识卡片流 */}
            <section className="market-cards-grid">
              {visibleItems.map((item) => {
                const meta = kindMeta[item.kind] ?? kindMeta.note;
                const Icon = meta.icon;
                return (
                  <div
                    key={item.id}
                    className="market-card-item"
                    onClick={() => openItem(item.id)}
                  >
                    <div className="market-card-header">
                      <div
                        className="app-icon-container"
                        style={{ background: '#eef2ff', color: '#4f46e5' }}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="app-title-group">
                        <h4 className="app-card-title">{item.title}</h4>
                        <span
                          className="app-card-badge"
                          style={{ background: '#f0fdf4', color: '#16a34a' }}
                        >
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <p className="app-card-desc">
                      {item.summary || item.content}
                    </p>

                    <div className="market-card-footer">
                      <div className="meta-author">
                        <User size={12} />
                        <span>AI 置信度 {Math.round(item.confidence * 100)}%</span>
                      </div>
                      <div className="meta-date">
                        <Clock size={12} />
                        <span>{relativeTime(item.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          </div>
        )}
      </div>

      {/* 3. 知识详情滑出抽屉 */}
      {selected && (
        <>
          <button className="detail-scrim" onClick={() => setSelectedId(undefined)} aria-label="关闭知识详情" />
          <aside className="detail-panel" aria-label="知识详情">
            <div className="detail-toolbar">
              <span>{kindMeta[selected.kind]?.label ?? '笔记'}</span>
              <div>
                <button onClick={() => updateItem(selected.id, { favorite: !selected.favorite })} aria-label="收藏">
                  <Heart size={18} fill={selected.favorite ? 'currentColor' : 'none'} />
                </button>
                <button onClick={() => setSelectedId(undefined)} aria-label="关闭详情">
                  <PanelRightClose size={19} />
                </button>
              </div>
            </div>
            <div className="detail-scroll">
              <p className="detail-category">{selected.category}</p>
              <h2>{selected.title}</h2>
              <div className="detail-meta">
                <span><Clock3 size={14} />{relativeTime(selected.created_at)}</span>
                <span><Tag size={14} />{selected.tags.length} 个标签</span>
              </div>
              <div className="detail-content">{selected.content}</div>
              {selected.source_url && (
                <a className="source-link" href={selected.source_url} target="_blank" rel="noreferrer">
                  <Link2 size={16} />
                  <span>{selected.source_url}</span>
                  <ExternalLink size={15} />
                </a>
              )}
              <section className="ai-insight">
                <div className="ai-insight-head">
                  <Sparkles size={16} />
                  <strong>自动整理依据</strong>
                  <span>{Math.round(selected.confidence * 100)}%</span>
                </div>
                <p>{selected.classification_reason}</p>
                <div>{selected.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
              </section>
              <section className="status-section">
                <h3>处理状态</h3>
                <div className="status-switch">
                  {(Object.keys(statusMeta) as KnowledgeStatus[]).map((status) => (
                    <button
                      key={status}
                      className={selected.status === status ? 'active' : ''}
                      onClick={() => updateItem(selected.id, { status }, `已标记为${statusMeta[status]}`)}
                    >
                      {selected.status === status && <Check size={14} />}
                      {statusMeta[status]}
                    </button>
                  ))}
                </div>
              </section>
            </div>
            <button className="delete-button" onClick={() => deleteItem(selected.id)}>
              <Trash2 size={16} />
              移除记录
            </button>
          </aside>
        </>
      )}

      {/* 4. 浮动 Toast 提示 */}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
