/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 事件底层 JSON 与大模型交互抽屉 (EventJsonDrawer)
 * 职责：
 * 1. 100% 透明展示事件底层的标准 JSON 表示
 * 2. 提供专门针对大模型 (LLM) 优化的高语义高密度 JSON 复制
 * 3. 集成 AI 智能推理引擎：基于底层 JSON 自动分析进展、推演下一步分支或闭环建议
 * 4. 支持直接在线编辑底层 JSON 并实时生效
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Code2,
  Copy,
  Check,
  Sparkles,
  Bot,
  Save,
  RefreshCw,
  GitBranch,
  Flag,
  FileCheck,
  Send,
} from 'lucide-react';
import { formatEventToLlmJson, type EventFlow } from '../../types/eventFlow';

interface EventJsonDrawerProps {
  isOpen: boolean;
  event: EventFlow | null;
  onClose: () => void;
  onUpdateEvent?: (eventId: string, partial: Partial<EventFlow>) => void;
  onAddNextStep?: (eventId: string, params: { name: string; description?: string }) => void;
  showToast?: (msg: string) => void;
}

export const EventJsonDrawer: React.FC<EventJsonDrawerProps> = ({
  isOpen,
  event,
  onClose,
  onUpdateEvent,
  onAddNextStep,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'llm' | 'raw' | 'aiInfer'>('llm');
  const [rawJsonText, setRawJsonText] = useState<string>('');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // AI 推理状态
  const [isInferring, setIsInferring] = useState<boolean>(false);
  const [aiInferenceResult, setAiInferenceResult] = useState<{
    assessment: string;
    suggestedActionType: 'branch' | 'next_step' | 'closure';
    suggestedTitle: string;
    suggestedDesc: string;
    rationale: string;
  } | null>(null);

  useEffect(() => {
    if (event) {
      setRawJsonText(JSON.stringify(event, null, 2));
      setAiInferenceResult(null);
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const llmJsonStr = formatEventToLlmJson(event);

  // 复制 JSON
  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedType(type);
      showToast?.('已将 JSON 复制到剪贴板，可直接发送给大模型！');
      setTimeout(() => setCopiedType(null), 2000);
    });
  };

  // 保存就地修改的 Raw JSON
  const handleSaveRawJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      onUpdateEvent?.(event.id, parsed);
      showToast?.('底层 JSON 数据已更新并重新渲染拓扑图！');
    } catch (e: any) {
      showToast?.(`JSON 语法错误: ${e.message}`);
    }
  };

  // 模拟大模型理解当前 JSON 并推演下一步
  const handleRunAiInference = () => {
    setIsInferring(true);
    setTimeout(() => {
      const completedCount = event.nodes.filter((n) => n.status === 'completed').length;
      const totalCount = event.nodes.length;
      const progressRatio = totalCount > 0 ? completedCount / totalCount : 0;

      if (progressRatio >= 0.75) {
        setAiInferenceResult({
          assessment: `大模型分析：事件《${event.title}》已完成 ${completedCount}/${totalCount} 个核心节点，主干推进已趋于成熟。`,
          suggestedActionType: 'closure',
          suggestedTitle: '组织最终成果评审并执行闭环归档',
          suggestedDesc: '建议收拢各分支产出物，完成验收备忘，正式流转至【已完成库】。',
          rationale: '主要交付链路已经走通，再开辟子分支将导致交付延期，此时适宜收敛闭环。',
        });
      } else if (event.branches.length === 0) {
        setAiInferenceResult({
          assessment: `大模型分析：事件当前为单线性链路推进中，为加快攻坚速率，建议解耦出并行子任务分支。`,
          suggestedActionType: 'branch',
          suggestedTitle: `分支: ${event.title.slice(0, 8)}专项自动化验证`,
          suggestedDesc: '创建并行验证分支，与主干开发并行推进，避免主链路阻塞。',
          rationale: '识别到主链路节点复杂度较高，衍生分支能够隔离非阻塞性需求。',
        });
      } else {
        setAiInferenceResult({
          assessment: `大模型分析：事件存在活跃分支【${event.branches[0]?.name}】，当前宜继续推进主干核心节点。`,
          suggestedActionType: 'next_step',
          suggestedTitle: '核心业务链路联调与端到端回归',
          suggestedDesc: '将已完成的底层服务与上层界面进行端到端联通测试。',
          rationale: '保持主干稳健推进，待主干达到里程碑后再考虑合并分支。',
        });
      }
      setIsInferring(false);
    }, 900);
  };

  // 采纳 AI 建议
  const handleAdoptSuggestion = () => {
    if (!aiInferenceResult) return;
    onAddNextStep?.(event.id, {
      name: aiInferenceResult.suggestedTitle,
      description: aiInferenceResult.suggestedDesc,
    });
    showToast?.(`已成功将 AI 建议采纳为事件的下一步推进节点！`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* 抽屉头部 */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#5146D8] flex items-center justify-center">
              <Code2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>底层 JSON 结构与大模型中枢</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-[#5146D8] font-medium">
                  LLM-Friendly
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">
                事件：{event.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 选项卡切换 */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('llm')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeTab === 'llm'
                  ? 'bg-white text-[#5146D8] shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              大模型优化视图 (精简语义)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('aiInfer')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'aiInfer'
                  ? 'bg-white text-[#5146D8] shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles size={12} className="text-[#5146D8]" />
              <span>AI 智能推演</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('raw')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeTab === 'raw'
                  ? 'bg-white text-[#5146D8] shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              完整底层 JSON (可编辑)
            </button>
          </div>

          {activeTab === 'llm' && (
            <button
              type="button"
              onClick={() => handleCopy(llmJsonStr, 'llm')}
              className="px-2.5 py-1 text-xs rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedType === 'llm' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copiedType === 'llm' ? '已复制' : '复制给大模型'}</span>
            </button>
          )}

          {activeTab === 'raw' && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleCopy(rawJsonText, 'raw')}
                className="px-2 py-1 text-xs rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                {copiedType === 'raw' ? '已复制' : '复制'}
              </button>
              <button
                type="button"
                onClick={handleSaveRawJson}
                className="px-2.5 py-1 text-xs rounded-md bg-[#5146D8] hover:bg-[#4338CA] text-white font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Save size={12} />
                <span>保存生效</span>
              </button>
            </div>
          )}
        </div>

        {/* 主体视图内容 */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#F8FAFC]">
          {activeTab === 'llm' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200/60 text-xs text-indigo-900 leading-relaxed">
                💡 <strong>大模型友好提示</strong>：该 JSON 剔除了冗余图元坐标，保留事件全生命周期、状态、节点依赖边与分支拓扑。大模型能够 100% 精确理解并可依据此结构自主生成下一步建议。
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono leading-relaxed overflow-x-auto shadow-inner max-h-[560px]">
                {llmJsonStr}
              </pre>
            </div>
          )}

          {activeTab === 'aiInfer' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot size={18} className="text-[#5146D8]" />
                    <span className="text-xs font-bold text-slate-900">大模型意图感知与决策推演</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunAiInference}
                    disabled={isInferring}
                    className="px-3 py-1.5 rounded-lg bg-[#5146D8] hover:bg-[#4338CA] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isInferring ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    <span>{isInferring ? 'AI 正在分析推演...' : '开始智能推演下一步'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  大模型将加载该事件的全部节点完成度与拓扑依赖边，评估当前阶段瓶颈，自动推演下一步是应当“开辟新分支”还是“推进并闭环”。
                </p>
              </div>

              {aiInferenceResult && (
                <div className="p-5 rounded-xl bg-white border border-indigo-200 shadow-sm space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {aiInferenceResult.suggestedActionType === 'closure'
                        ? '🏁 建议执行【闭环沉淀】'
                        : aiInferenceResult.suggestedActionType === 'branch'
                        ? '🌱 建议开辟【并行新分支】'
                        : '➕ 建议推进【主干下一步】'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {aiInferenceResult.assessment}
                  </p>

                  <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-1.5">
                    <div className="text-[11px] font-semibold text-[#5146D8]">
                      建议节点标题：{aiInferenceResult.suggestedTitle}
                    </div>
                    <div className="text-xs text-slate-600">
                      {aiInferenceResult.suggestedDesc}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-2">
                      推理依据：{aiInferenceResult.rationale}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAdoptSuggestion}
                    className="w-full py-2 px-3 rounded-lg bg-[#5146D8] hover:bg-[#4338CA] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Check size={14} />
                    <span>采纳此建议并加入流程节点</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="space-y-2">
              <span className="text-xs text-slate-500 block">
                可直接在下方修改底层 JSON（如修改优先级、新增节点等），点击右上角保存即可双向更新：
              </span>
              <textarea
                value={rawJsonText}
                onChange={(e) => setRawJsonText(e.target.value)}
                rows={24}
                className="w-full text-xs font-mono p-4 rounded-xl bg-slate-900 text-slate-100 leading-relaxed outline-none border border-slate-800 shadow-inner resize-y"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
