/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 性格测试与职场优势画像测评视图
 */

import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Target,
  Briefcase,
  Compass,
  Award,
  Zap,
  Share2,
} from 'lucide-react';
import { usePersonalityTest } from '../../hooks/usePersonalityTest';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export const PersonalityTestView: React.FC = () => {
  const {
    currentStep,
    totalQuestions,
    currentQuestion,
    answers,
    testCompleted,
    activeProfile,
    scores,
    selectOption,
    prevQuestion,
    restartTest,
  } = usePersonalityTest();

  const [copied, setCopied] = useState(false);

  const progressPercent = Math.round(((currentStep + 1) / totalQuestions) * 100);

  const handleShare = () => {
    if (activeProfile) {
      const shareText = `🌟 我的 MBTI 职场性格测评结果为【${activeProfile.type} - ${activeProfile.name}】（${activeProfile.nickname}）\n核心特质：${activeProfile.traits.join(' · ')}\n推荐发展方向：${activeProfile.careerSuggestions.join('、')}`;
      navigator.clipboard.writeText(shareText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="page-container animate-in fade-in duration-300">
      {/* 1. 规范化页面头部 */}
      <div className="page-header-block flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-main-title flex items-center gap-2">
            <Brain size={22} className="text-[#2b5aed]" /> MBTI 职场性格与优势测评
          </h1>
          <p className="page-sub-title mt-1">
            洞察个人决策逻辑与认知模型，精准定位核心职场优势与最佳发展路径
          </p>
        </div>

        {testCompleted && (
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="border-[#e2e8f0] text-[#334155] hover:bg-[#f8fafc]"
            >
              <Share2 size={14} className="mr-1.5" />
              {copied ? '已复制结果' : '分享报告'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={restartTest}
              className="bg-gradient-to-r from-[#2b5aed] to-[#6345ed] text-white shadow-sm"
            >
              <RotateCcw size={14} className="mr-1.5" />
              重新测评
            </Button>
          </div>
        )}
      </div>

      {/* 2. 主区域：测试答题流程 或 结果画像展示 */}
      {!testCompleted ? (
        /* 答题状态卡片 */
        <div className="max-w-2xl mx-auto py-6">
          <Card className="border border-[#e2e8f0] bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* 顶部进度条 */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-[#64748b] mb-2 font-medium">
                <span className="text-[#2563eb] font-semibold">
                  第 {currentStep + 1} / {totalQuestions} 题
                </span>
                <span>{currentQuestion.category}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-[#f1f5f9] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#2563eb] to-[#6345ed] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* 题目内容 */}
            <div className="my-8">
              <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider block mb-2">
                QUESTION #{currentQuestion.id}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-[#0f172a] leading-relaxed">
                {currentQuestion.question}
              </h2>
            </div>

            {/* 选项卡片 A / B */}
            <div className="space-y-3.5 mb-8">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = answers[currentQuestion.id] === option.value;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectOption(currentQuestion.id, option.value)}
                    className={`w-full text-left p-4 sm:p-5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb] shadow-sm'
                        : 'border-[#e2e8f0] bg-white hover:border-[#bfdbfe] hover:bg-[#f8fafc] text-[#334155]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#2563eb] text-white'
                            : 'bg-[#f1f5f9] text-[#64748b] group-hover:bg-[#e2e8f0]'
                        }`}
                      >
                        {idx === 0 ? 'A' : 'B'}
                      </div>
                      <span className="text-xs sm:text-sm font-medium leading-relaxed">
                        {option.text}
                      </span>
                    </div>

                    <ArrowRight
                      size={16}
                      className={`shrink-0 ml-2 transition-transform ${
                        isSelected
                          ? 'text-[#2563eb] translate-x-0.5'
                          : 'text-[#94a3b8] group-hover:translate-x-0.5 group-hover:text-[#2563eb]'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* 底部导航 */}
            <div className="flex items-center justify-between pt-4 border-t border-[#f1f5f9]">
              <button
                type="button"
                onClick={prevQuestion}
                disabled={currentStep === 0}
                className={`flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors ${
                  currentStep === 0
                    ? 'text-[#cbd5e1] cursor-not-allowed'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                <ArrowLeft size={14} />
                <span>上一题</span>
              </button>

              <span className="text-[11px] text-[#94a3b8]">点击选项自动进入下一题</span>
            </div>
          </Card>
        </div>
      ) : (
        /* 测试结果报告 */
        activeProfile && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 1. 核心性格画像 Hero Banner */}
            <Card className="border border-[#e2e8f0] bg-gradient-to-br from-white via-white to-[#eff6ff] rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] mb-3">
                    <Sparkles size={13} />
                    <span>MBTI 职场性格类型</span>
                  </div>
                  <div className="flex items-baseline gap-3 mb-2">
                    <h2 className="text-3xl sm:text-4xl font-black text-[#0f172a] tracking-tight">
                      {activeProfile.type}
                    </h2>
                    <span className="text-lg sm:text-xl font-bold text-[#2563eb]">
                      {activeProfile.name}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#64748b] mb-4">
                    定位称号：<span className="text-[#0f172a]">{activeProfile.nickname}</span>
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed max-w-xl italic bg-white/70 p-3 rounded-lg border border-[#e2e8f0]">
                    “ {activeProfile.representativeQuote} ”
                  </p>
                </div>

                {/* 性格特质标签胶囊 */}
                <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
                  {activeProfile.traits.map((t) => (
                    <span
                      key={t}
                      className="px-3.5 py-1 rounded-lg text-xs font-semibold bg-white border border-[#bfdbfe] text-[#2563eb] shadow-xs text-center"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </Card>

            {/* 2. 维度倾向比分分布 */}
            <Card className="border border-[#e2e8f0] bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-[#0f172a] mb-4 flex items-center gap-1.5">
                <Compass size={15} className="text-[#2563eb]" /> 认知与行为维度得分
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#f1f5f9]">
                  <div className="flex justify-between text-xs font-semibold text-[#0f172a] mb-1">
                    <span>外向 (E: {scores.E})</span>
                    <span>内向 (I: {scores.I})</span>
                  </div>
                  <div className="w-full bg-[#e2e8f0] h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-[#2563eb] h-full"
                      style={{ width: `${(scores.E / (scores.E + scores.I || 1)) * 100}%` }}
                    />
                    <div
                      className="bg-[#7c3aed] h-full"
                      style={{ width: `${(scores.I / (scores.E + scores.I || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#f1f5f9]">
                  <div className="flex justify-between text-xs font-semibold text-[#0f172a] mb-1">
                    <span>实感 (S: {scores.S})</span>
                    <span>直觉 (N: {scores.N})</span>
                  </div>
                  <div className="w-full bg-[#e2e8f0] h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-[#059669] h-full"
                      style={{ width: `${(scores.S / (scores.S + scores.N || 1)) * 100}%` }}
                    />
                    <div
                      className="bg-[#2563eb] h-full"
                      style={{ width: `${(scores.N / (scores.S + scores.N || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#f1f5f9]">
                  <div className="flex justify-between text-xs font-semibold text-[#0f172a] mb-1">
                    <span>思考 (T: {scores.T})</span>
                    <span>情感 (F: {scores.F})</span>
                  </div>
                  <div className="w-full bg-[#e2e8f0] h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-[#dc2626] h-full"
                      style={{ width: `${(scores.T / (scores.T + scores.F || 1)) * 100}%` }}
                    />
                    <div
                      className="bg-[#ea580c] h-full"
                      style={{ width: `${(scores.F / (scores.T + scores.F || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#f1f5f9]">
                  <div className="flex justify-between text-xs font-semibold text-[#0f172a] mb-1">
                    <span>判断 (J: {scores.J})</span>
                    <span>知觉 (P: {scores.P})</span>
                  </div>
                  <div className="w-full bg-[#e2e8f0] h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-[#2563eb] h-full"
                      style={{ width: `${(scores.J / (scores.J + scores.P || 1)) * 100}%` }}
                    />
                    <div
                      className="bg-[#db2777] h-full"
                      style={{ width: `${(scores.P / (scores.J + scores.P || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* 3. 核心优势与发展建议 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 核心职场优势 */}
              <Card className="border border-[#e2e8f0] bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-[#0f172a] mb-3 flex items-center gap-1.5">
                  <Award size={15} className="text-[#16a34a]" /> 核心职场竞争优势
                </h3>
                <div className="space-y-2.5">
                  {activeProfile.strengths.map((st, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-3 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-xs text-[#166534]"
                    >
                      <CheckCircle2 size={15} className="text-[#16a34a] shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-medium">{st}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* 推荐职业方向 */}
              <Card className="border border-[#e2e8f0] bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-[#0f172a] mb-3 flex items-center gap-1.5">
                  <Briefcase size={15} className="text-[#2563eb]" /> 推荐匹配发展方向
                </h3>
                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  {activeProfile.careerSuggestions.map((job, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs font-semibold text-[#0f172a] text-center"
                    >
                      {job}
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-[#eff6ff] rounded-lg border border-[#bfdbfe] text-[11px] text-[#1e40af] leading-relaxed">
                  <span className="font-semibold">工作风格解析：</span>
                  {activeProfile.workStyle}
                </div>
              </Card>
            </div>
          </div>
        )
      )}
    </div>
  );
};
