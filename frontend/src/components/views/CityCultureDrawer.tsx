/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 华夏星图·城市文脉画卷与足迹记录抽屉 (City Culture & Footprint Drawer)
 * 包含城市古今概述、足迹打卡管理、美食/古迹/名人/渊源四大Tab、用户自定义标注、AI智能文脉扩充
 */

import React, { useState, useMemo } from 'react';
import type {
  FootprintStatus,
  CulturalItem,
  CultureCategory,
  TripRecord,
} from '../../types/footprint';
import { getCityById } from '../../data/chinaCitiesData';
import { getPredefinedCulture } from '../../data/defaultCulturalData';
import {
  X,
  MapPin,
  UtensilsCrossed,
  Landmark,
  BookOpen,
  Sparkles,
  Calendar,
  Users,
  Star,
  Plus,
  Trash2,
  Wand2,
  CheckCircle2,
  Clock,
  Compass,
  ScrollText,
  BadgeCheck,
  Heart,
  ChevronRight,
} from 'lucide-react';

interface CityCultureDrawerProps {
  cityId: string | null;
  onClose: () => void;
  status: FootprintStatus;
  onSetStatus: (cityId: string, status: FootprintStatus) => void;
  culturalItems: CulturalItem[];
  onAddCulturalItem: (
    cityId: string,
    item: Omit<CulturalItem, 'id' | 'createdAt' | 'isCustom'>
  ) => void;
  onRemoveCulturalItem: (cityId: string, itemId: string) => void;
  trips: TripRecord[];
  onAddTrip: (trip: Omit<TripRecord, 'id' | 'createdAt'>) => void;
  onRemoveTrip: (tripId: string) => void;
  onGenerateAiCulture: (cityId: string, cityName: string, province: string) => Promise<any>;
}

export const CityCultureDrawer: React.FC<CityCultureDrawerProps> = ({
  cityId,
  onClose,
  status,
  onSetStatus,
  culturalItems,
  onAddCulturalItem,
  onRemoveCulturalItem,
  trips,
  onAddTrip,
  onRemoveTrip,
  onGenerateAiCulture,
}) => {
  if (!cityId) return null;

  const cityInfo = getCityById(cityId);
  const predefined = getPredefinedCulture(cityId);

  // 当前选中的文化分类 Tab
  const [activeTab, setActiveTab] = useState<'all' | CultureCategory | 'trips'>('all');

  // 新增文化标注弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState<CultureCategory>('food');
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEra, setNewEra] = useState('');
  const [newHighlight, setNewHighlight] = useState('');

  // 新增足迹打卡记录弹窗状态
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [tripDate, setTripDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tripRating, setTripRating] = useState(5);
  const [tripCompanion, setTripCompanion] = useState('家人');
  const [tripSummary, setTripSummary] = useState('');

  // AI 提炼文脉加载状态
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState('');

  // 针对当前城市的打卡旅行记录
  const cityTrips = useMemo(() => {
    return trips.filter((t) => t.cityId === cityId);
  }, [trips, cityId]);

  // 按分类过滤文脉条目
  const filteredItems = useMemo(() => {
    if (activeTab === 'all' || activeTab === 'trips') return culturalItems;
    return culturalItems.filter((item) => item.category === activeTab);
  }, [culturalItems, activeTab]);

  // 统计各分类条目数量
  const categoryCounts = useMemo(() => {
    const counts = { food: 0, spot: 0, celebrity: 0, heritage: 0 };
    culturalItems.forEach((i) => {
      if (counts[i.category] !== undefined) {
        counts[i.category]++;
      }
    });
    return counts;
  }, [culturalItems]);

  // 处理保存新标注
  const handleSaveCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    onAddCulturalItem(cityId, {
      category: newCategory,
      title: newTitle.trim(),
      subtitle: newSubtitle.trim() || undefined,
      description: newDescription.trim(),
      eraOrHistory: newEra.trim() || undefined,
      highlight: newHighlight.trim() || undefined,
      tags: ['用户标注'],
    });

    // 清空重置
    setNewTitle('');
    setNewSubtitle('');
    setNewDescription('');
    setNewEra('');
    setNewHighlight('');
    setShowAddModal(false);
  };

  // 处理保存打卡记录
  const handleSaveTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripSummary.trim()) return;

    onAddTrip({
      cityId,
      cityName: cityInfo?.name || '未知城市',
      date: tripDate,
      rating: tripRating,
      companion: tripCompanion,
      summary: tripSummary.trim(),
    });

    setTripSummary('');
    setShowAddTripModal(false);
  };

  // 触发 AI 文脉提炼
  const handleTriggerAi = async () => {
    if (!cityInfo) return;
    setAiGenerating(true);
    setAiSuccessMsg('');
    try {
      await onGenerateAiCulture(cityId, cityInfo.name, cityInfo.province);
      setAiSuccessMsg('已智能扩充该城市美食、古迹、名人与渊源！');
      setTimeout(() => setAiSuccessMsg(''), 3000);
    } catch {
      // 容错
    } finally {
      setAiGenerating(false);
    }
  };

  const cityName = cityInfo?.name || '城市';
  const fullProvince = cityInfo?.province || '';
  const alias = predefined?.alias || '历史名城';
  const quote =
    predefined?.summaryQuote ||
    `江山留胜迹，我辈复登临。${cityName}山水人文，千古悠悠。`;
  const overview =
    predefined?.overview ||
    `${cityName}承载着深厚的华夏地域文脉，山川灵秀、物产丰饶，拥有独特的民俗风貌与人文印记。`;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] lg:w-[540px] bg-white/95 backdrop-blur-2xl border-l border-slate-200/90 shadow-2xl flex flex-col transition-transform duration-300">
      {/* 1. 顶部城市封面与题头 */}
      <div className="relative p-6 pb-5 bg-gradient-to-br from-indigo-900 via-slate-900 to-sky-950 text-white overflow-hidden">
        {/* 背景光斑与水印 */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-6 -right-4 text-7xl font-serif text-white/5 font-bold select-none pointer-events-none">
          {cityName}
        </div>

        {/* 顶部工具栏（关闭按钮） */}
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 text-indigo-200 border border-white/10 backdrop-blur">
              {fullProvince}
            </span>
            <span className="text-xs text-slate-300 font-medium">{alias}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 城市大标题与名句 */}
        <div className="relative z-10 mb-4">
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>{cityName}</span>
            <span className="text-sm font-normal text-sky-200/80">
              ({cityInfo?.fullName})
            </span>
          </h2>
          <p className="mt-1.5 text-xs text-indigo-100/90 italic font-serif leading-relaxed">
            “{quote}”
          </p>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed line-clamp-2">
            {overview}
          </p>
        </div>

        {/* 足迹状态切换条 */}
        <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between gap-1">
          <span className="text-xs text-slate-300 font-medium">足迹点亮：</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSetStatus(cityId, 'resident')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                status === 'resident'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              <Sparkles size={12} className={status === 'resident' ? 'text-white' : 'text-amber-400'} />
              <span>常住/故乡</span>
            </button>
            <button
              onClick={() => onSetStatus(cityId, 'visited')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                status === 'visited'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              <CheckCircle2 size={12} className={status === 'visited' ? 'text-white' : 'text-emerald-400'} />
              <span>已游历</span>
            </button>
            <button
              onClick={() => onSetStatus(cityId, 'wishlist')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                status === 'wishlist'
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              <Compass size={12} className={status === 'wishlist' ? 'text-white' : 'text-blue-400'} />
              <span>心愿单</span>
            </button>
            {status !== 'unvisited' && (
              <button
                onClick={() => onSetStatus(cityId, 'unvisited')}
                title="重置为未踏足"
                className="px-2 py-1 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10"
              >
                重置
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. 标签导航栏 */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50 border-b border-slate-200/80 text-xs font-medium">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-white text-indigo-600 font-semibold shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            全部 ({culturalItems.length})
          </button>
          <button
            onClick={() => setActiveTab('food')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'food'
                ? 'bg-white text-amber-600 font-semibold shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UtensilsCrossed size={12} />
            美食 ({categoryCounts.food})
          </button>
          <button
            onClick={() => setActiveTab('spot')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'spot'
                ? 'bg-white text-emerald-600 font-semibold shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark size={12} />
            古迹 ({categoryCounts.spot})
          </button>
          <button
            onClick={() => setActiveTab('celebrity')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'celebrity'
                ? 'bg-white text-purple-600 font-semibold shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen size={12} />
            名人 ({categoryCounts.celebrity})
          </button>
          <button
            onClick={() => setActiveTab('heritage')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'heritage'
                ? 'bg-white text-sky-600 font-semibold shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ScrollText size={12} />
            渊源 ({categoryCounts.heritage})
          </button>
          <button
            onClick={() => setActiveTab('trips')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'trips'
                ? 'bg-white text-rose-600 font-semibold shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar size={12} />
            足迹 ({cityTrips.length})
          </button>
        </div>

        {/* 快捷操作：新增与 AI 扩充 */}
        <div className="flex items-center gap-1.5 ml-2">
          <button
            onClick={handleTriggerAi}
            disabled={aiGenerating}
            title="一键 AI 提炼文脉与美食"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors border border-indigo-100 whitespace-nowrap disabled:opacity-50"
          >
            <Wand2 size={12} className={aiGenerating ? 'animate-spin' : ''} />
            <span>AI提炼</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            title="添加自定义文化标注"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors whitespace-nowrap"
          >
            <Plus size={12} />
            <span>标注</span>
          </button>
        </div>
      </div>

      {/* AI 提示信息 */}
      {aiSuccessMsg && (
        <div className="mx-5 mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-600" />
          <span>{aiSuccessMsg}</span>
        </div>
      )}

      {/* 3. 中间内容滚动列表 */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* 如果选中的是「足迹日记」Tab */}
        {activeTab === 'trips' ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                游历记录与打卡日志
              </h3>
              <button
                onClick={() => setShowAddTripModal(true)}
                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded-lg border border-rose-100 transition-colors"
              >
                <Plus size={12} />
                <span>记一笔足迹</span>
              </button>
            </div>

            {cityTrips.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                <Compass size={32} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs text-slate-600 font-medium">
                  尚未记录此城市的游历足迹
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  点击上方按钮，记录旅行日期、随行好友与难忘体验吧！
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cityTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow transition-shadow relative group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-800">
                          <Calendar size={12} className="text-indigo-600" />
                          {trip.date}
                        </span>
                        {trip.companion && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            <Users size={11} />
                            {trip.companion}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center text-amber-500">
                          {Array.from({ length: trip.rating }).map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              className="fill-amber-400 text-amber-400"
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => onRemoveTrip(trip.id)}
                          title="删除足迹"
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">
                      {trip.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* 文化四维卡片列表 */
          <div>
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                <Sparkles size={32} className="mx-auto text-indigo-400 mb-2" />
                <p className="text-xs text-slate-600 font-medium">
                  该维度暂无详细标注
                </p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <button
                    onClick={handleTriggerAi}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl shadow-sm transition-colors"
                  >
                    AI 深度提炼文脉
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 shadow-sm transition-colors"
                  >
                    手动添加标注
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredItems.map((item) => {
                  // 根据分类设置颜色与图标
                  const categoryMeta = {
                    food: {
                      icon: UtensilsCrossed,
                      color: 'text-amber-700',
                      bg: 'bg-amber-50',
                      border: 'border-amber-200/80',
                      badge: '地道美食',
                    },
                    spot: {
                      icon: Landmark,
                      color: 'text-emerald-700',
                      bg: 'bg-emerald-50',
                      border: 'border-emerald-200/80',
                      badge: '名胜古迹',
                    },
                    celebrity: {
                      icon: BookOpen,
                      color: 'text-purple-700',
                      bg: 'bg-purple-50',
                      border: 'border-purple-200/80',
                      badge: '历史名人',
                    },
                    heritage: {
                      icon: ScrollText,
                      color: 'text-sky-700',
                      bg: 'bg-sky-50',
                      border: 'border-sky-200/80',
                      badge: '文化渊源',
                    },
                  }[item.category];

                  const IconComp = categoryMeta.icon;

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative group"
                    >
                      {/* 卡片头部 */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${categoryMeta.bg} ${categoryMeta.color} ${categoryMeta.border}`}
                          >
                            <IconComp size={11} />
                            {categoryMeta.badge}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                            {item.title}
                          </h4>
                          {item.isCustom && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-medium border border-indigo-100">
                              自定义
                            </span>
                          )}
                        </div>

                        {/* 自定义删除按钮 */}
                        {item.isCustom && (
                          <button
                            onClick={() => onRemoveCulturalItem(cityId, item.id)}
                            title="删除此标注"
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      {/* 副标题或历史渊源 */}
                      {(item.subtitle || item.eraOrHistory) && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-2">
                          {item.subtitle && <span>{item.subtitle}</span>}
                          {item.subtitle && item.eraOrHistory && <span>·</span>}
                          {item.eraOrHistory && (
                            <span className="text-slate-400 italic">
                              {item.eraOrHistory}
                            </span>
                          )}
                        </div>
                      )}

                      {/* 核心亮点引言 */}
                      {item.highlight && (
                        <div className="p-2 mb-2 rounded-xl bg-slate-50 border border-slate-100 text-xs text-indigo-950 font-medium font-serif flex items-center gap-1.5">
                          <Sparkles size={12} className="text-amber-500 shrink-0" />
                          <span>{item.highlight}</span>
                        </div>
                      )}

                      {/* 详细描述 */}
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {item.description}
                      </p>

                      {/* 标签流 */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-2.5 border-t border-slate-100">
                          {item.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. 新增自定义文化标注模态弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-600" />
                <span>为「{cityName}」新增文化标注</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  标注类别
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'food', label: '美食', icon: UtensilsCrossed },
                      { id: 'spot', label: '名胜古迹', icon: Landmark },
                      { id: 'celebrity', label: '历史名人', icon: BookOpen },
                      { id: 'heritage', label: '文化渊源', icon: ScrollText },
                    ] as const
                  ).map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setNewCategory(cat.id)}
                        className={`py-2 px-1 text-xs rounded-xl flex flex-col items-center gap-1 border transition-all ${
                          newCategory === cat.id
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon size={14} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  名称 / 标题 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="如：锦里小吃街、杜甫草堂、苏轼..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    副标题 / 称号
                  </label>
                  <input
                    type="text"
                    placeholder="如：中华老字号、唐代诗圣..."
                    value={newSubtitle}
                    onChange={(e) => setNewSubtitle(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    朝代 / 起源
                  </label>
                  <input
                    type="text"
                    placeholder="如：明清两代、盛唐、民国..."
                    value={newEra}
                    onChange={(e) => setNewEra(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  名句或核心亮点
                </label>
                <input
                  type="text"
                  placeholder="如：味兼南北、天下第一关、诗画天成..."
                  value={newHighlight}
                  onChange={(e) => setNewHighlight(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  详细描述与文化故事 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="记录该美食的做法特色、古迹的人文内涵或名人的生平轶事..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                >
                  保存标注
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. 新增足迹打卡日记弹窗 */}
      {showAddTripModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Compass size={16} className="text-rose-600" />
                <span>记录「{cityName}」游历足迹</span>
              </h3>
              <button
                onClick={() => setShowAddTripModal(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTrip} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    游历日期
                  </label>
                  <input
                    type="date"
                    required
                    value={tripDate}
                    onChange={(e) => setTripDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    同行人员
                  </label>
                  <input
                    type="text"
                    placeholder="如：独自、家人、挚友、同学..."
                    value={tripCompanion}
                    onChange={(e) => setTripCompanion(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  旅行体验评分
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setTripRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        size={20}
                        className={`${
                          star <= tripRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-slate-500 font-medium ml-2">
                    {tripRating} 星体验
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  游历心境与旅行随笔 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="记录走过的街巷古道、尝过的地道风味、以及此刻的心情与感悟..."
                  value={tripSummary}
                  onChange={(e) => setTripSummary(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTripModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm"
                >
                  保存足迹
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
