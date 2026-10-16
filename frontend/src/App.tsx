/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 华鲲元启 · 璀璨星图 - 现代企业级前端应用核心中枢
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AppSidebar, NAV_ITEMS } from './components/layout/AppSidebar';
import { AppHeader } from './components/layout/AppHeader';
import { GlobalCommandModal } from './components/layout/GlobalCommandModal';
import { Toast } from './components/ui/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import MarketplaceView from './components/MarketplaceView';
import { AgentChatView } from './components/views/AgentChatView';
import { EventFlowView } from './components/views/EventFlowView';
import { PromptSkillsView } from './components/views/PromptSkillsView';
import { PersonalKnowledgeBaseView, type KnowledgeTabKey } from './components/views/PersonalKnowledgeBaseView';
import { PersonalityTestView } from './components/views/PersonalityTestView';
import { AiNavigationView } from './components/views/AiNavigationView';
import { CareerNavigationView } from './components/views/CareerNavigationView';
import { ExploreView } from './components/views/ExploreView';
import { FootprintMapView } from './components/views/FootprintMapView';
import { PageStudioView } from './components/apps/pageStudio/PageStudioView';
import { SocialMediaView } from './components/apps/socialMedia/SocialMediaView';
import { RecruitmentAgentView } from './components/apps/recruitmentAgent/RecruitmentAgentView';
import { FreeCanvasView } from './components/views/FreeCanvasView';
import ProfileView from './components/ProfileView';
import AuthPage from './components/AuthPage';

import { useAuth } from './hooks/useAuth';
import { useKnowledge } from './hooks/useKnowledge';
import './marketplace.css';

export default function App() {
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = [
      'marketplace',
      'agent-chat',
      'free-canvas',
      'explore',
      'personal-knowledge',
      'todos',
      'prompt-skills',
      'journal',
      'knowledge-collector',
      'footprint-map',
      'page-studio',
      'social-media',
      'recruitment-agent',
      'biography',
      'business-analysis',
      'personality-test',
      'ai-navigation',
      'career-navigation',
      'profile',
      'auth',
    ];
    if (hash === 'practice') return 'journal';
    return validTabs.includes(hash) ? hash : 'marketplace';
  };


  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // 认证状态管理
  const { currentUser, logout, updateAvatar } = useAuth();
  // 知识库实体与图谱导出
  const { items: knowledgeItems, exportGraphJson } = useKnowledge();

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2600);
  }, []);

  const navigateTo = useCallback((tabName: string) => {
    setActiveTab(tabName);
    window.location.hash = tabName;
  }, []);

  // 监听 Hash 变化
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setActiveTab(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 监听全局快捷键 ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentTabTitle = (() => {
    if (['personal-knowledge', 'journal', 'knowledge-collector', 'biography', 'business-analysis'].includes(activeTab)) {
      return '个人知识库';
    }
    if (activeTab === 'todos') return '事件流程';
    for (const item of NAV_ITEMS) {
      if (item.key === activeTab) return item.label;
      if (item.children) {
        const sub = item.children.find((c) => c.key === activeTab);
        if (sub) return sub.label;
      }
    }
    if (activeTab === 'profile') return '个人中心';
    if (activeTab === 'auth') return '登录注册';
    return '工作台';
  })();


  return (
    <div className="app-shell flex min-h-screen relative overflow-hidden bg-[#F7F8FA]">
      {/* 1. 现代化生产级侧边栏 */}
      <AppSidebar
        activeTab={activeTab}
        onNavigate={navigateTo}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentUser={currentUser}
        onOpenSearch={() => setIsCommandOpen(true)}
      />

      {/* 2. 主区域 */}
      <div className="app-main flex-1 flex flex-col min-w-0 bg-transparent relative z-10">
        {/* 顶部 Header */}
        <AppHeader
          activeTabTitle={currentTabTitle}
          currentUser={currentUser}
          onNavigate={navigateTo}
          onLogout={() => {
            logout();
            showToast('已安全退出登录');
          }}
          onOpenSearch={() => setIsCommandOpen(true)}
        />

        {/* 核心页面视图分发 */}
        <main className={`flex-1 ${activeTab === 'free-canvas' || activeTab === 'explore' || activeTab === 'agent-chat' ? 'overflow-hidden flex flex-col h-[calc(100vh-56px)]' : ''}`}>
          <ErrorBoundary key={activeTab}>
          {/* 应用广场 */}
          {activeTab === 'marketplace' && (
            <MarketplaceView
              onNavigateToView={(target) => navigateTo(target)}
            />
          )}

          {/* 对话智能体 */}
          {activeTab === 'agent-chat' && <AgentChatView onNavigate={navigateTo} />}

          {/* 自由画布 */}
          {activeTab === 'free-canvas' && <FreeCanvasView onNavigate={navigateTo} />}

          {/* 知识图谱画布（占据全部空间） */}
          {activeTab === 'explore' && (
            <ExploreView
              items={knowledgeItems}
              onExportGraph={() => {
                exportGraphJson();
                showToast('已导出知识图谱 JSON');
              }}
              onToast={showToast}
            />
          )}


          {/* 个人知识库（聚合：工作日记、知识收集、商业分析、个人传记） */}
          {(activeTab === 'personal-knowledge' ||
            activeTab === 'journal' ||
            activeTab === 'knowledge-collector' ||
            activeTab === 'biography' ||
            activeTab === 'business-analysis') && (
            <PersonalKnowledgeBaseView
              initialTab={
                (activeTab === 'journal' ||
                activeTab === 'knowledge-collector' ||
                activeTab === 'biography' ||
                activeTab === 'business-analysis'
                  ? activeTab
                  : undefined) as KnowledgeTabKey | undefined
              }
              onTabChange={(subTab) => {
                window.location.hash = subTab;
              }}
            />
          )}

          {/* 事件跟踪（以事件为单位，双库与分支闭环） */}
          {activeTab === 'todos' && <EventFlowView />}

          {/* 提示词与 Skill 技能库 */}
          {activeTab === 'prompt-skills' && (
            <PromptSkillsView
              onNavigateToChat={(initialPrompt) => {
                navigateTo('agent-chat');
                if (initialPrompt) {
                  setTimeout(() => {
                    window.dispatchEvent(
                      new CustomEvent('starmap-fill-chat-input', {
                        detail: { prompt: initialPrompt },
                      })
                    );
                  }, 150);
                }
              }}
            />
          )}

          {/* 华夏足迹 */}
          {activeTab === 'footprint-map' && <FootprintMapView />}

          {/* 书页工坊（应用合集子应用） */}
          {activeTab === 'page-studio' && <PageStudioView />}
          {activeTab === 'social-media' && <SocialMediaView />}
          {activeTab === 'recruitment-agent' && <RecruitmentAgentView />}


          {/* 性格测试 */}
          {activeTab === 'personality-test' && <PersonalityTestView />}

          {/* AI 导航 */}
          {activeTab === 'ai-navigation' && <AiNavigationView />}

          {/* 求职导航 */}
          {activeTab === 'career-navigation' && <CareerNavigationView />}

          {/* 个人中心 */}
          {activeTab === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              onLogout={() => {
                logout();
                showToast('已安全退出登录');
              }}
              onAvatarUpload={(file) => {
                updateAvatar(file);
                showToast('头像已更新');
              }}
              onNavigateToAuth={() => navigateTo('auth')}
            />
          )}

          {/* 登录认证页面 */}
          {activeTab === 'auth' && <AuthPage onBack={() => navigateTo('marketplace')} />}
          </ErrorBoundary>
        </main>
      </div>

      {/* 3. 全局 Command Palette 快捷搜索浮层 */}
      <GlobalCommandModal
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        projects={[]}
        onNavigate={navigateTo}
        onSelectProject={() => {}}
      />

      {/* 4. 全局 Toast 提示 */}
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  );
}
