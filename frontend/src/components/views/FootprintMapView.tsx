/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 华夏星图·足迹与文脉中枢主视窗 (Footprint Map View)
 * 具备中国可缩放高精地图、全国370+市级定位、足迹点亮大盘、美食/古迹/名人/渊源全景联动
 */

import React, { useState, useMemo } from 'react';
import { useFootprints } from '../../hooks/useFootprints';
import { ChinaMapCanvas } from './ChinaMapCanvas';
import { CityCultureDrawer } from './CityCultureDrawer';
import {
  ALL_CHINA_CITIES,
  PROVINCE_LIST,
  PROVINCES_MAP,
  getCityById,
  findCityByName,
} from '../../data/chinaCitiesData';
import {
  MapPin,
  Compass,
  Search,
  Sparkles,
  Award,
  Calendar,
  Layers,
  ChevronDown,
  RotateCcw,
  BookOpen,
  UtensilsCrossed,
  Landmark,
  ScrollText,
  Filter,
  CheckCircle,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';

export const FootprintMapView: React.FC = () => {
  const {
    statusMap,
    setCityStatus,
    getCityStatus,
    getCityCulturalItems,
    addCulturalItem,
    removeCulturalItem,
    trips,
    addTripRecord,
    removeTripRecord,
    generateAiCulturalInsights,
    stats,
    resetToDefault,
  } = useFootprints();

  // 当前选中并在抽屉中展示的城市 ID
  const [selectedCityId, setSelectedCityId] = useState<string | null>('110000'); // 默认展示北京

  // 当前下钻的省份代码（null 表示全国视图）
  const [currentProvinceCode, setCurrentProvinceCode] = useState<number | null>(null);

  // 搜索关键字
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤足迹状态
  const [statusFilter, setStatusFilter] = useState<'all' | 'visited' | 'resident' | 'wishlist'>('all');

  // 处理选中城市
  const handleSelectCity = (cityId: string) => {
    setSelectedCityId(cityId);
  };

  // 快捷搜索城市
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return ALL_CHINA_CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.fullName.toLowerCase().includes(q) ||
        c.province.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  // 选择搜索推荐项
  const handlePickSearchedCity = (cityId: string) => {
    setSelectedCityId(cityId);
    setSearchQuery('');
  };

  // 热门历史文化名城快捷胶囊列表
  const famousCities = [
    { id: '110000', name: '北京' },
    { id: '610100', name: '西安' },
    { id: '320100', name: '南京' },
    { id: '410300', name: '洛阳' },
    { id: '510100', name: '成都' },
    { id: '330100', name: '杭州' },
    { id: '320500', name: '苏州' },
    { id: '440100', name: '广州' },
    { id: '500000', name: '重庆' },
    { id: '620900', name: '敦煌(酒泉)' },
    { id: '540100', name: '拉萨' },
  ];

  // 计算全国足迹覆盖率百分比
  const coveragePercent = ((stats.visitedCount + stats.residentCount) / stats.totalCities * 100).toFixed(1);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. 顶部 Header 题头与大盘看板 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Compass size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span>华夏星图 · 足迹与文脉</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                  全国370+城市全景
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                可缩放中国全境底图，点亮城市足迹，标注美食名吃、名胜古迹、历史名人与文化渊源
              </p>
            </div>
          </div>
        </div>

        {/* 右侧全局操作 */}
        <div className="flex items-center gap-2">
          <button
            onClick={resetToDefault}
            title="重置为默认示范数据"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80 shadow-sm transition-colors"
          >
            <RotateCcw size={13} />
            <span>重置示范</span>
          </button>
        </div>
      </div>

      {/* 2. 足迹统计核心指标大盘 (Footprint Stats Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 已游历打卡 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
            <span>已游历打卡</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {stats.visitedCount}
            <span className="text-xs font-normal text-slate-400 ml-1">城</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp size={12} />
            <span>全国覆盖率 {coveragePercent}%</span>
          </div>
        </div>

        {/* 常住 / 故乡 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
            <span>常住 / 故乡</span>
            <div className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {stats.residentCount}
            <span className="text-xs font-normal text-slate-400 ml-1">城</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-600 font-medium">
            故土情深 · 归宿之地
          </div>
        </div>

        {/* 心愿单 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
            <span>心愿前往</span>
            <div className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {stats.wishlistCount}
            <span className="text-xs font-normal text-slate-400 ml-1">城</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-600 font-medium">
            星辰大海 · 下一站
          </div>
        </div>

        {/* 覆盖省份 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
            <span>涉足省份</span>
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {stats.provincesCovered}
            <span className="text-xs font-normal text-slate-400 ml-1">/ 34省</span>
          </div>
          <div className="mt-2 text-[11px] text-indigo-600 font-medium">
            幅员辽阔 · 走遍神州
          </div>
        </div>

        {/* 文化标注总数 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
            <span>文化标注</span>
            <div className="w-2 h-2 rounded-full bg-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {stats.totalCulturalItems}
            <span className="text-xs font-normal text-slate-400 ml-1">项</span>
          </div>
          <div className="mt-2 text-[11px] text-purple-600 font-medium">
            美食·古迹·名人·渊源
          </div>
        </div>

        {/* 游历日记篇数 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
            <span>旅行日记</span>
            <div className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {stats.totalTrips}
            <span className="text-xs font-normal text-slate-400 ml-1">篇</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-600 font-medium">
            纸短情长 · 岁月留痕
          </div>
        </div>
      </div>

      {/* 3. 多维搜索过滤栏与名城快捷胶囊 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* 左侧：省份级联选择 + 快速搜索框 */}
        <div className="flex items-center gap-2.5 flex-1">
          {/* 省份下钻选择器 */}
          <div className="relative">
            <select
              value={currentProvinceCode || ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                setCurrentProvinceCode(val);
              }}
              className="text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 pl-3 pr-8 rounded-xl border border-slate-200 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="">全国全景视图 (34个省/直辖市/自治区)</option>
              {PROVINCE_LIST.map((p) => (
                <option key={p.adcode} value={p.adcode}>
                  {p.name} ({p.cityCount}城)
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          {/* 城市即时搜索框 */}
          <div className="relative flex-1 max-w-xs">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="搜索城市（如：成都、西安、洛阳）..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
              />
            </div>

            {/* 搜索建议浮层 */}
            {filteredCities.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1 overflow-hidden animate-in fade-in">
                {filteredCities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handlePickSearchedCity(c.id)}
                    className="w-full text-left px-3.5 py-2 hover:bg-indigo-50/70 text-xs flex items-center justify-between group transition-colors"
                  >
                    <span className="font-medium text-slate-800 group-hover:text-indigo-600">
                      {c.fullName}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {c.province}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：热门名城快捷导航胶囊 */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap mr-1">
            名城巡礼：
          </span>
          {famousCities.map((fc) => (
            <button
              key={fc.id}
              onClick={() => setSelectedCityId(fc.id)}
              className={`text-xs px-2.5 py-1 rounded-xl whitespace-nowrap transition-colors ${
                selectedCityId === fc.id
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
              }`}
            >
              {fc.name}
            </button>
          ))}
        </div>
      </div>

      {/* 4. 核心地图展示画布区 */}
      <div className="h-[680px] relative">
        <ChinaMapCanvas
          statusMap={statusMap}
          selectedCityId={selectedCityId}
          onSelectCity={handleSelectCity}
          currentProvinceCode={currentProvinceCode}
          onDrillDownProvince={setCurrentProvinceCode}
        />
      </div>

      {/* 5. 城市文脉画卷与足迹记录抽屉 */}
      {selectedCityId && (
        <CityCultureDrawer
          cityId={selectedCityId}
          onClose={() => setSelectedCityId(null)}
          status={getCityStatus(selectedCityId)}
          onSetStatus={setCityStatus}
          culturalItems={getCityCulturalItems(selectedCityId)}
          onAddCulturalItem={addCulturalItem}
          onRemoveCulturalItem={removeCulturalItem}
          trips={trips}
          onAddTrip={addTripRecord}
          onRemoveTrip={removeTripRecord}
          onGenerateAiCulture={generateAiCulturalInsights}
        />
      )}
    </div>
  );
};
