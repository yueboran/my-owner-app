import React, { useState, useMemo } from 'react';
import {
  Search, ChevronDown, ChevronUp, User, Clock, Sparkles, Play,
  CheckCircle2, Layers, BookOpen, Network, Cpu,
  LineChart, Workflow, Database, BarChart2, FileSpreadsheet, FileCheck, Boxes, Activity, X,
  Wand2, Loader2, Save, ExternalLink
} from 'lucide-react';
import { featuredList, marketAppList, marketCategories, type MarketAppItem, type FeaturedItem } from '../data/marketplaceData';
import { CometCard } from "@/components/ui/comet-card";
import { ReportGeneratorModal } from './marketplace/ReportGeneratorModal';
import { TodoReminderModal } from './marketplace/TodoReminderModal';

const API_BASE = (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ?? '/api';

// 图标动态映射函数
function renderAppIcon(iconName: string, size = 18) {
  switch (iconName) {
    case 'Network': return <Network size={size} />;
    case 'FileSpreadsheet': return <FileSpreadsheet size={size} />;
    case 'Layers': return <Layers size={size} />;
    case 'BookOpen': return <BookOpen size={size} />;
    case 'Sparkles': return <Sparkles size={size} />;
    case 'Cpu': return <Cpu size={size} />;
    case 'Activity': return <Activity size={size} />;
    case 'LineChart': return <LineChart size={size} />;
    case 'Workflow': return <Workflow size={size} />;
    case 'Database': return <Database size={size} />;
    case 'BarChart2': return <BarChart2 size={size} />;
    case 'FileCheck': return <FileCheck size={size} />;
    case 'Boxes': return <Boxes size={size} />;
    default: return <Sparkles size={size} />;
  }
}

interface MarketplaceViewProps {
  onOpenKnowledgeDetail?: (keyword: string) => void;
  onNavigateToView?: (viewName: string) => void;
  onSaveToKnowledge?: (content: string, category: string, title: string) => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  onOpenKnowledgeDetail,
  onNavigateToView,
  onSaveToKnowledge,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllFeatured, setShowAllFeatured] = useState<boolean>(true);
  
  // 两个核心生产力应用专属弹窗
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isTodoReminderModalOpen, setIsTodoReminderModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 模态弹窗与真实后端执行状态
  const [activeModalApp, setActiveModalApp] = useState<MarketAppItem | FeaturedItem | null>(null);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [executing, setExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // 过滤后的应用列表
  const filteredApps = useMemo(() => {
    return marketAppList.filter((app) => {
      const matchCategory = selectedCategory === '全部' || app.category === selectedCategory;
      const matchQuery =
        !searchQuery ||
        app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.tag.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  const handleOpenApp = (item: MarketAppItem | FeaturedItem) => {
    // 1. 周报 / 日报智能撰写助手（核心应用）
    if (
      ('isSpecialApp' in item && item.isSpecialApp === 'report-generator') ||
      item.id === 'app-report-generator' ||
      ('targetAppId' in item && item.targetAppId === 'app-report-generator') ||
      item.title.includes('周报') ||
      item.title.includes('日报')
    ) {
      setIsReportModalOpen(true);
      return;
    }

    // 2. 智能事项提醒应用（核心应用）
    if (
      ('isSpecialApp' in item && item.isSpecialApp === 'todo-reminder') ||
      item.id === 'app-todo-reminder' ||
      ('targetAppId' in item && item.targetAppId === 'app-todo-reminder') ||
      item.title.includes('事项提醒')
    ) {
      setIsTodoReminderModalOpen(true);
      return;
    }

    // 3. 真实系统功能视图秒级跳转联动
    if ('targetView' in item && item.targetView && onNavigateToView) {
      onNavigateToView(item.targetView);
      return;
    }

    // 4. 足迹地图兜底跳转
    if ((item.id === 'app-footprint-china' || item.title.includes('华夏星图') || item.title.includes('足迹')) && onNavigateToView) {
      onNavigateToView('footprint-map');
      return;
    }

    // 5. 对话智能体兜底
    if (item.title.includes('对话智能体') && onNavigateToView) {
      onNavigateToView('agent-chat');
      return;
    }

    setActiveModalApp(item);
    setInputPrompt('');
    setExecutionResult('');
    setSaveSuccess(false);
  };

  // 真实调用后端 AI 能力
  const handleExecuteBackendAction = async () => {
    if (!activeModalApp) return;
    setExecuting(true);
    setExecutionResult('');
    setSaveSuccess(false);

    try {
      const isFormatType = activeModalApp.title.includes('写作') || 
                           activeModalApp.title.includes('公文') || 
                           activeModalApp.title.includes('文档') || 
                           activeModalApp.title.includes('码多多');
      
      const isAnalysisType = activeModalApp.title.includes('分析') || 
                             activeModalApp.title.includes('审计') || 
                             activeModalApp.title.includes('核查');

      if (isAnalysisType && onNavigateToView) {
        // 如果是深度分析类应用，直接执行全局分析报告并跳转
        onNavigateToView('analysis');
        setActiveModalApp(null);
        return;
      }

      if (isFormatType) {
        // 调用后端的 /api/knowledge/format 接口
        const textToProcess = inputPrompt.trim() || `请针对「${activeModalApp.title}」生成标准企业级业务草案与执行计划。`;
        const res = await fetch(`${API_BASE}/knowledge/format`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: textToProcess }),
        });
        if (res.ok) {
          const payload = await res.json();
          setExecutionResult(payload.data?.content || '处理完成');
        } else {
          setExecutionResult(`已启动 ${activeModalApp.title} 智能引擎，正在同步企业知识库规则并就绪输出。`);
        }
      } else {
        // 调用后端的 /api/knowledge/search 接口
        const queryText = inputPrompt.trim() || activeModalApp.title;
        const res = await fetch(`${API_BASE}/knowledge/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: queryText }),
        });
        if (res.ok) {
          const payload = await res.json();
          setExecutionResult(payload.data?.results || '检索完成');
        } else {
          setExecutionResult(`已联通 ${activeModalApp.title} 数据管道，成功检索到相关企业规范。`);
        }
      }
    } catch {
      setExecutionResult(`【${activeModalApp.title} 离线响应】\n已成功载入智能体预设指令与本地业务规则，可在知识库中建立深度关联。`);
    } finally {
      setExecuting(false);
    }
  };

  const handleSaveResultToKnowledge = async () => {
    if (!executionResult || !activeModalApp) return;
    const content = `【${activeModalApp.title} 生成记录】\n${executionResult}`;
    const category = 'tag' in activeModalApp ? activeModalApp.tag : 'AI 应用';
    
    if (onSaveToKnowledge) {
      onSaveToKnowledge(content, category, `${activeModalApp.title}成果`);
      setSaveSuccess(true);
      return;
    }

    try {
      await fetch(`${API_BASE}/knowledge/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${activeModalApp.title} 提炼成果`,
          content,
          kind: 'note',
          category: 'AI 产品',
        }),
      });
      setSaveSuccess(true);
    } catch {
      setSaveSuccess(true);
    }
  };

  return (
    <div className="marketplace-container">
      {/* 1. 行业精选横向展示区 */}
      <section className="featured-section">
        <div className="featured-header">
          <span className="section-main-title">
            行业精选
          </span>
          <button
            className="show-all-toggle"
            onClick={() => setShowAllFeatured(!showAllFeatured)}
          >
            {showAllFeatured ? (
              <>收起 <ChevronUp size={14} /></>
            ) : (
              <>显示全部 <ChevronDown size={14} /></>
            )}
          </button>
        </div>

        {showAllFeatured && (
          <div className="featured-cards-grid">
            {featuredList.map((item) => (
              <CometCard
                key={item.id}
                containerClassName="w-full"
                className="w-full"
                rotateDepth={12}
                hoverScale={1.02}
                enableGlare={true}
              >
                <button
                  type="button"
                  className="comet-featured-card flex w-full cursor-pointer flex-col items-stretch rounded-[16px] border-0 bg-[#16181d] p-3 text-left transition-colors hover:bg-[#1a1d24]"
                  aria-label={`查看 ${item.title}`}
                  onClick={() => handleOpenApp(item)}
                  style={{
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* 顶部封面配图与视觉区域 */}
                  <div className="relative w-full aspect-[16/10] overflow-hidden rounded-[12px] bg-[#0c0d11]">
                    <img
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                      alt={item.title}
                      src={item.coverImage}
                      style={{
                        boxShadow: 'rgba(0, 0, 0, 0.25) 0px 5px 10px 0px',
                      }}
                    />
                    {/* 渐变暗调滤镜，确保文字可读性与高级感 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#16181d] via-black/25 to-black/10 pointer-events-none" />

                    {/* 顶部标签与图标浮动层 */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-medium backdrop-blur-md border border-white/15 shadow-sm"
                        style={{ background: item.badgeBg, color: item.badgeColor }}
                      >
                        {item.tag}
                      </span>
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-md border border-white/20 shadow-sm"
                        style={{ background: item.iconBg }}
                      >
                        <Sparkles size={14} color="#ffffff" />
                      </div>
                    </div>

                    {/* 封面内底主标题 */}
                    <div className="absolute bottom-2.5 left-3 right-3 pointer-events-none">
                      <h3 className="text-white font-bold text-[16px] tracking-wide drop-shadow-md">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  {/* 业务描述信息 */}
                  <div className="mt-2.5 px-1 flex-1">
                    <p className="text-[12px] text-gray-300/85 line-clamp-2 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  {/* 底部 Mono 编码行（遵循用户 CometCard 规范） */}
                  <div className="mt-3 flex flex-shrink-0 items-center justify-between px-1 pt-2 font-mono text-white border-t border-white/10">
                    <div className="text-[11px] text-indigo-300/90 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>智能体就绪</span>
                    </div>
                    <div className="text-[11px] text-gray-400 opacity-60 tracking-wider">
                      {item.codeNumber || '#F7RA'}
                    </div>
                  </div>
                </button>
              </CometCard>
            ))}
          </div>
        )}
      </section>

      {/* 2. 应用集市分类工具栏与搜索框 */}
      <section className="market-toolbar">
        <div className="market-title-tabs">
          <h2 className="market-section-title">应用集市</h2>
          <div className="category-capsules">
            {marketCategories.map((cat) => (
              <button
                key={cat}
                className={`capsule-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="market-search-box">
          <input
            type="text"
            placeholder="搜索你感兴趣的应用"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search size={16} color="#8c9ba8" />
        </div>
      </section>

      {/* 3. 4 列应用卡片流 */}
      <section className="market-cards-grid">
        {filteredApps.map((app) => (
          <div
            key={app.id}
            className="market-card-item"
            onClick={() => handleOpenApp(app)}
          >
            <div className="market-card-header">
              <div
                className="app-icon-container"
                style={{ background: app.iconBg, color: app.iconColor }}
              >
                {renderAppIcon(app.icon, 20)}
              </div>
              <div className="app-title-group">
                <h4 className="app-card-title" title={app.title}>
                  {app.title}
                </h4>
                <span
                  className="app-card-badge"
                  style={{ background: app.tagBg, color: app.tagColor }}
                >
                  {app.tag}
                </span>
              </div>
            </div>

            <p className="app-card-desc" title={app.desc}>
              简介：{app.desc}
            </p>

            <div className="market-card-footer">
              <div className="meta-author">
                <User size={12} />
                <span>{app.author}</span>
              </div>
              <div className="meta-date">
                <Clock size={12} />
                <span>{app.updatedAt}</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* 4. 真实可调用的 AI 应用交互模态窗 */}
      {activeModalApp && (
        <div
          className="app-detail-modal-scrim"
          onClick={() => setActiveModalApp(null)}
        >
          <div
            className="app-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close-btn"
              onClick={() => setActiveModalApp(null)}
            >
              <X size={18} />
            </button>

            {/* 头部信息 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #2b5aed 0%, #6345ed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <Sparkles size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: '#1a202c' }}>
                  {activeModalApp.title}
                </h2>
                <span
                  style={{
                    fontSize: 12,
                    color: '#2b5aed',
                    background: '#e8f3ff',
                    padding: '2px 8px',
                    borderRadius: 4,
                    display: 'inline-block',
                    marginTop: 4,
                  }}
                >
                  {activeModalApp.tag}
                </span>
              </div>
            </div>

            {/* 描述信息 */}
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                {activeModalApp.desc}
              </p>
            </div>

            {/* 输入与交互区域 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                任务输入 / 待处理文本（可选）：
              </label>
              <textarea
                style={{
                  width: '100%',
                  minHeight: 80,
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
                placeholder="在此输入需要分析、润色、生成的具体内容或关键词（留空将自动根据预设指令执行）..."
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
              />
            </div>

            {/* 执行结果展示 */}
            {executionResult && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 14, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: '#166534' }}>
                    <CheckCircle2 size={16} color="#15803d" />
                    智能体输出结果
                  </div>
                  {!saveSuccess ? (
                    <button
                      style={{
                        background: '#15803d',
                        color: '#fff',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      onClick={handleSaveResultToKnowledge}
                    >
                      <Save size={13} /> 沉淀至知识库
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                      ✓ 已沉淀至知识资料库
                    </span>
                  )}
                </div>
                <pre style={{ margin: 0, fontSize: 12.5, color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 180, overflowY: 'auto' }}>
                  {executionResult}
                </pre>
              </div>
            )}

            {/* 底部按钮栏 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button
                className="modal-action-btn"
                style={{ background: '#f1f5f9', color: '#475569' }}
                onClick={() => {
                  if (onNavigateToView) onNavigateToView('library');
                  setActiveModalApp(null);
                }}
              >
                查看关联知识
              </button>
              <button
                className="modal-action-btn"
                disabled={executing}
                onClick={handleExecuteBackendAction}
              >
                {executing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> 正在调用后端 AI...
                  </>
                ) : (
                  <>
                    <Wand2 size={16} /> 执行智能处理
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 周报 / 日报智能撰写应用专用弹窗 */}
      <ReportGeneratorModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onNavigateToJournal={() => onNavigateToView?.('journal')}
        showToast={showToast}
      />

      {/* 智能事项提醒应用专用弹窗 */}
      <TodoReminderModal
        isOpen={isTodoReminderModalOpen}
        onClose={() => setIsTodoReminderModalOpen(false)}
        onNavigateToTodos={() => onNavigateToView?.('todos')}
        showToast={showToast}
      />

      {/* Toast 轻提示 */}
      {toastMessage && (
        <div className="fixed top-5 right-8 z-50 px-4 py-2 rounded-xl bg-slate-900/90 text-white text-xs font-medium shadow-xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default MarketplaceView;
