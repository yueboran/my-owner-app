/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 华夏星图·可缩放中国全境与市级高精地图画布
 * 支持十段线标准版图、全国370+地级市精准散点定位、省份下钻市级多边形、自由平移与无级滚轮缩放
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import type { FootprintStatus } from '../../types/footprint';
import { ALL_CHINA_CITIES, PROVINCES_MAP } from '../../data/chinaCitiesData';
import { ZoomIn, ZoomOut, RotateCcw, ArrowLeft, Layers, Compass, Sparkles } from 'lucide-react';

interface ChinaMapCanvasProps {
  statusMap: Record<string, FootprintStatus>;
  selectedCityId: string | null;
  onSelectCity: (cityId: string) => void;
  currentProvinceCode: number | null;
  onDrillDownProvince: (adcode: number | null) => void;
  viewMode?: 'all-cities' | 'provinces';
}

export const ChinaMapCanvas: React.FC<ChinaMapCanvasProps> = ({
  statusMap,
  selectedCityId,
  onSelectCity,
  currentProvinceCode,
  onDrillDownProvince,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadingProvince, setLoadingProvince] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.2);

  // 初始化并加载中国主地图
  useEffect(() => {
    let isMounted = true;

    async function loadMainChinaMap() {
      try {
        // 先检查是否已经注册了 'china' 地图
        if (!echarts.getMap('china')) {
          const res = await fetch('/geo/china.json');
          if (!res.ok) throw new Error('中国地图数据加载失败');
          const chinaGeoJson = await res.json();
          echarts.registerMap('china', chinaGeoJson);
        }
        if (isMounted) {
          setMapLoaded(true);
        }
      } catch (err) {
        console.error('加载全国地图 GeoJSON 出错', err);
      }
    }

    loadMainChinaMap();

    return () => {
      isMounted = false;
    };
  }, []);

  // 监听容器大小变化并自适应
  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, undefined, {
        renderer: 'canvas',
      });
    }

    const resizeObserver = new ResizeObserver(() => {
      chartInstance.current?.resize();
    });

    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 渲染/更新地图配置
  const renderChart = useCallback(async () => {
    if (!chartInstance.current || !mapLoaded) return;

    const chart = chartInstance.current;
    let targetMapName = 'china';

    // 如果处于省份下钻状态，异步加载该省的下钻 GeoJSON 并注册
    if (currentProvinceCode) {
      const pCodeStr = String(currentProvinceCode);
      const provinceMapName = `province_${pCodeStr}`;

      if (!echarts.getMap(provinceMapName)) {
        setLoadingProvince(true);
        try {
          const res = await fetch(`/geo/provinces/${pCodeStr}.json`);
          if (res.ok) {
            const provinceGeoJson = await res.json();
            echarts.registerMap(provinceMapName, provinceGeoJson);
            targetMapName = provinceMapName;
          }
        } catch {
          // 若下钻失败则降级使用全国
          targetMapName = 'china';
        } finally {
          setLoadingProvince(false);
        }
      } else {
        targetMapName = provinceMapName;
      }
    }

    // 组织散点数据：全国 370 个地级市节点
    const scatterData = ALL_CHINA_CITIES.map((city) => {
      const status = statusMap[city.id] || 'unvisited';
      let itemColor = 'rgba(148, 163, 184, 0.65)'; // 默认未涉足为雅致淡灰
      let symbolSize = 7;
      let zlevel = 1;

      if (status === 'resident') {
        itemColor = '#f59e0b'; // 常住：璀璨琥珀金
        symbolSize = 13;
        zlevel = 4;
      } else if (status === 'visited') {
        itemColor = '#10b981'; // 已打卡：翡翠葱郁绿
        symbolSize = 11;
        zlevel = 3;
      } else if (status === 'wishlist') {
        itemColor = '#3b82f6'; // 心愿单：天青深邃蓝
        symbolSize = 9;
        zlevel = 2;
      }

      const isSelected = city.id === selectedCityId;
      if (isSelected) {
        symbolSize = 16;
        zlevel = 5;
      }

      return {
        name: city.name,
        fullName: city.fullName,
        province: city.province,
        cityId: city.id,
        value: [...city.center, 1],
        status,
        itemStyle: {
          color: itemColor,
          borderColor: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
          borderWidth: isSelected ? 3 : 1.2,
          shadowBlur: isSelected ? 12 : status !== 'unvisited' ? 6 : 0,
          shadowColor: itemColor,
        },
        symbolSize,
        zlevel,
      };
    });

    // 重点打卡城市的常亮发光波纹特效（带有 Ripple 效果）
    const highlightedCitiesData = scatterData.filter(
      (item) => item.status === 'visited' || item.status === 'resident' || item.cityId === selectedCityId
    );

    const isProvinceView = targetMapName !== 'china';

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: {
          color: '#1e293b',
          fontSize: 13,
          fontFamily: 'sans-serif',
        },
        extraCssText: 'box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border-radius: 12px; backdrop-filter: blur(8px);',
        formatter: (params: any) => {
          if (params.seriesType === 'scatter' || params.seriesType === 'effectScatter') {
            const data = params.data;
            const statusNames: Record<string, string> = {
              resident: '🌟 常住 / 故乡',
              visited: '🌿 已游历打卡',
              wishlist: '🚀 心愿单·想去',
              unvisited: '⚪ 尚未踏足',
            };
            const statusText = statusNames[data.status] || '⚪ 尚未踏足';
            return `
              <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #0f172a;">${data.fullName}</div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">所属：${data.province}</div>
              <div style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 12px; background: rgba(241,245,249,0.9); font-weight: 500;">
                ${statusText}
              </div>
              <div style="margin-top: 6px; font-size: 11px; color: #94a3b8;">点击探寻文脉与记录足迹 →</div>
            `;
          }
          if (params.seriesType === 'map') {
            return `<div style="font-weight: 600;">${params.name}</div><div style="font-size: 12px; color: #64748b;">双击或点击即可下钻查看市级轮廓</div>`;
          }
          return '';
        },
      },
      geo: {
        map: targetMapName,
        roam: true, // 开启可自由漫游与滚轮缩放
        zoom: isProvinceView ? 1.05 : 1.25,
        center: isProvinceView ? undefined : [105, 36],
        scaleLimit: {
          min: 0.8,
          max: 15, // 支持高达 15 倍的高清精细放大
        },
        label: {
          show: isProvinceView, // 省份视图下显示地级市名称
          color: '#475569',
          fontSize: 11,
        },
        itemStyle: {
          areaColor: '#f1f5f9', // 优雅柔和的珠光水墨灰底色
          borderColor: '#cbd5e1', // 边界线
          borderWidth: 1,
          shadowColor: 'rgba(0, 0, 0, 0.04)',
          shadowBlur: 10,
        },
        emphasis: {
          label: {
            show: true,
            color: '#0f172a',
            fontWeight: 'bold',
          },
          itemStyle: {
            areaColor: '#e0e7ff', // 悬浮高亮色（微光淡紫蓝）
            borderColor: '#6366f1',
            borderWidth: 1.5,
          },
        },
        select: {
          itemStyle: {
            areaColor: '#c7d2fe',
            borderColor: '#4f46e5',
          },
        },
      },
      series: [
        // 1. 发光波纹呼吸涟漪层（针对已打卡与常住城市）
        {
          name: '高光城市',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: highlightedCitiesData,
          showEffectOn: 'render',
          rippleEffect: {
            brushType: 'stroke',
            scale: 3,
            period: 4,
          },
          zlevel: 3,
        },
        // 2. 全国 370 个市级节点散点图
        {
          name: '全国地级市',
          type: 'scatter',
          coordinateSystem: 'geo',
          data: scatterData,
          label: {
            show: false, // 默认不全部挤占，悬浮时或特定缩放时显示
            formatter: '{b}',
            position: 'right',
            color: '#334155',
            fontSize: 11,
          },
          emphasis: {
            label: {
              show: true,
              color: '#0f172a',
              fontWeight: 600,
            },
          },
          zlevel: 4,
        },
      ],
    };

    chart.setOption(option, true);

    // 绑定交互事件
    chart.off('click');
    chart.on('click', (params: any) => {
      // 点击地级市散点
      if (params.seriesType === 'scatter' || params.seriesType === 'effectScatter') {
        const cityId = params.data?.cityId;
        if (cityId) {
          onSelectCity(cityId);
        }
      }
      // 点击地图上的省份多边形进行下钻
      else if (params.componentType === 'geo' || params.seriesType === 'map') {
        const clickedName = params.name;
        // 如果当前在全国视图，且点击了某个省，支持下钻
        if (!isProvinceView) {
          const matchedProvince = Object.values(PROVINCES_MAP).find(
            (p) => p.name.includes(clickedName) || clickedName.includes(p.name)
          );
          if (matchedProvince) {
            onDrillDownProvince(matchedProvince.adcode);
          }
        } else {
          // 在省份视图下点击了某个市的区域，尝试匹配对应地级市
          const matchedCity = ALL_CHINA_CITIES.find(
            (c) => c.name === clickedName || c.fullName === clickedName || clickedName.includes(c.name)
          );
          if (matchedCity) {
            onSelectCity(matchedCity.id);
          }
        }
      }
    });
  }, [
    mapLoaded,
    currentProvinceCode,
    statusMap,
    selectedCityId,
    onSelectCity,
    onDrillDownProvince,
  ]);

  useEffect(() => {
    renderChart();
  }, [renderChart]);

  // 控制操作：放大
  const handleZoomIn = () => {
    if (!chartInstance.current) return;
    const currentOpt: any = chartInstance.current.getOption();
    const currentZoom = currentOpt.geo?.[0]?.zoom || 1.2;
    chartInstance.current.setOption({
      geo: { zoom: currentZoom * 1.35 },
    });
    setZoomLevel(currentZoom * 1.35);
  };

  // 控制操作：缩小
  const handleZoomOut = () => {
    if (!chartInstance.current) return;
    const currentOpt: any = chartInstance.current.getOption();
    const currentZoom = currentOpt.geo?.[0]?.zoom || 1.2;
    chartInstance.current.setOption({
      geo: { zoom: Math.max(0.6, currentZoom * 0.75) },
    });
    setZoomLevel(Math.max(0.6, currentZoom * 0.75));
  };

  // 控制操作：复位视图
  const handleReset = () => {
    if (!chartInstance.current) return;
    chartInstance.current.setOption({
      geo: {
        zoom: currentProvinceCode ? 1.05 : 1.25,
        center: currentProvinceCode ? undefined : [105, 36],
      },
    });
  };

  // 返回全国视图
  const handleBackToCountry = () => {
    onDrillDownProvince(null);
  };

  const currentProvinceName = currentProvinceCode
    ? PROVINCES_MAP[String(currentProvinceCode)]?.name || '省份视图'
    : '中华人民共和国全国全景';

  return (
    <div className="relative w-full h-full min-h-[620px] rounded-3xl overflow-hidden bg-gradient-to-b from-slate-50/80 via-white/80 to-indigo-50/30 border border-slate-200/80 shadow-sm backdrop-blur-md">
      {/* 顶部状态浮动栏 */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          <Compass size={14} className="text-indigo-600" />
          <span>{currentProvinceName}</span>
        </div>
        {currentProvinceCode && (
          <button
            onClick={handleBackToCountry}
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors font-medium border border-indigo-100"
          >
            <ArrowLeft size={12} />
            <span>返回全国</span>
          </button>
        )}
      </div>

      {/* 图例指引悬浮胶囊 */}
      <div className="absolute bottom-5 left-4 z-20 flex items-center gap-3 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/80 shadow-sm text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
          常住 / 故乡
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
          已游历打卡
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
          心愿单·想去
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-300" />
          未踏足
        </span>
      </div>

      {/* 右侧悬浮快捷操作工具箱 */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          title="放大地图"
          className="w-9 h-9 flex items-center justify-center bg-white/95 hover:bg-white text-slate-700 hover:text-indigo-600 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition-all"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={handleZoomOut}
          title="缩小地图"
          className="w-9 h-9 flex items-center justify-center bg-white/95 hover:bg-white text-slate-700 hover:text-indigo-600 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition-all"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={handleReset}
          title="复位中心"
          className="w-9 h-9 flex items-center justify-center bg-white/95 hover:bg-white text-slate-700 hover:text-indigo-600 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition-all"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* 审图与规范提示 */}
      <div className="absolute bottom-5 right-4 z-20 text-[11px] text-slate-400 bg-white/80 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-100 pointer-events-none">
        国家地理信息标准审图号版图规范 · 支持自由缩放与市级精确定位
      </div>

      {/* 加载遮罩提示 */}
      {(!mapLoaded || loadingProvince) && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="mt-3 text-xs font-medium text-slate-600">
            {loadingProvince ? '正在载入省份高精市界图层...' : '正在展开华夏星图与地级市数据...'}
          </span>
        </div>
      )}

      {/* ECharts 真实地图渲染挂载 DOM */}
      <div ref={chartRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
