/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 华夏星图·足迹与文脉管理 Hook
 * 支持足迹打卡、城市点亮、四大文化标注 CRUD、本地持久化与 AI 智能文脉扩充
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  FootprintStatus,
  CulturalItem,
  TripRecord,
  FootprintStats,
  CultureCategory,
} from '../types/footprint';
import { ALL_CHINA_CITIES, getCityById, findCityByName } from '../data/chinaCitiesData';
import { DEFAULT_CULTURAL_DATABASE, getPredefinedCulture } from '../data/defaultCulturalData';

const STORAGE_KEY_STATUS = 'cx_footprints_status_v1';
const STORAGE_KEY_CUSTOM_ITEMS = 'cx_footprints_custom_items_v1';
const STORAGE_KEY_TRIPS = 'cx_footprints_trips_v1';

export function useFootprints() {
  // 1. 各城市足迹状态映射表: { [cityId]: FootprintStatus }
  const [statusMap, setStatusMap] = useState<Record<string, FootprintStatus>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATUS);
      if (saved) return JSON.parse(saved);
    } catch {
      // 容错处理
    }
    // 默认初始示范点亮数据（北京、西安、成都、杭州为已打卡或常住）
    const initialMap: Record<string, FootprintStatus> = {};
    Object.values(DEFAULT_CULTURAL_DATABASE).forEach((item) => {
      if (item.defaultStatus) {
        initialMap[item.cityId] = item.defaultStatus;
      }
    });
    return initialMap;
  });

  // 2. 用户自定义/修改的文化标注列表: { [cityId]: CulturalItem[] }
  const [customItemsMap, setCustomItemsMap] = useState<Record<string, CulturalItem[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_ITEMS);
      if (saved) return JSON.parse(saved);
    } catch {
      // 容错
    }
    return {};
  });

  // 3. 足迹打卡游历日志列表: TripRecord[]
  const [trips, setTrips] = useState<TripRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRIPS);
      if (saved) return JSON.parse(saved);
    } catch {
      // 容错
    }
    return [
      {
        id: 'trip-demo-1',
        cityId: '110000',
        cityName: '北京',
        date: '2024-10-01',
        rating: 5,
        companion: '家人',
        summary: '秋高气爽游紫禁城，红墙金瓦间感受六百年帝都气魄，晚上在全聚德品尝果木烤鸭。',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'trip-demo-2',
        cityId: '610100',
        cityName: '西安',
        date: '2024-05-03',
        rating: 5,
        companion: '好友',
        summary: '登明城墙骑行，大雁塔下梦回大唐盛世，回民街的羊肉泡馍与肉夹馍回味悠长。',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'trip-demo-3',
        cityId: '510100',
        cityName: '成都',
        date: '2025-01-15',
        rating: 5,
        companion: '独自',
        summary: '都江堰探寻千古水利智慧，锦里品尝三大炮与热气腾腾的牛油老火锅。',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // 持久化保存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATUS, JSON.stringify(statusMap));
    } catch (e) {
      console.warn('存储足迹状态失败', e);
    }
  }, [statusMap]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_ITEMS, JSON.stringify(customItemsMap));
    } catch (e) {
      console.warn('存储自定义文脉标注失败', e);
    }
  }, [customItemsMap]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TRIPS, JSON.stringify(trips));
    } catch (e) {
      console.warn('存储足迹打卡记录失败', e);
    }
  }, [trips]);

  // 修改城市足迹状态
  const setCityStatus = useCallback((cityId: string, status: FootprintStatus) => {
    setStatusMap((prev) => {
      const updated = { ...prev };
      if (status === 'unvisited') {
        delete updated[cityId];
      } else {
        updated[cityId] = status;
      }
      return updated;
    });
  }, []);

  // 获取特定城市的足迹状态
  const getCityStatus = useCallback(
    (cityId: string): FootprintStatus => {
      return statusMap[cityId] || 'unvisited';
    },
    [statusMap]
  );

  // 获取某个城市的全部文化标注（预设 + 用户自定义）
  const getCityCulturalItems = useCallback(
    (cityId: string, categoryFilter?: CultureCategory): CulturalItem[] => {
      const predefined = DEFAULT_CULTURAL_DATABASE[cityId]?.items || [];
      const custom = customItemsMap[cityId] || [];
      const combined = [...predefined, ...custom];
      if (categoryFilter) {
        return combined.filter((i) => i.category === categoryFilter);
      }
      return combined;
    },
    [customItemsMap]
  );

  // 添加用户自定义文化标注
  const addCulturalItem = useCallback(
    (cityId: string, item: Omit<CulturalItem, 'id' | 'createdAt' | 'isCustom'>) => {
      const newItem: CulturalItem = {
        ...item,
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };
      setCustomItemsMap((prev) => ({
        ...prev,
        [cityId]: [newItem, ...(prev[cityId] || [])],
      }));
      return newItem;
    },
    []
  );

  // 删除用户自定义标注
  const removeCulturalItem = useCallback((cityId: string, itemId: string) => {
    setCustomItemsMap((prev) => ({
      ...prev,
      [cityId]: (prev[cityId] || []).filter((i) => i.id !== itemId),
    }));
  }, []);

  // 添加足迹游历打卡
  const addTripRecord = useCallback(
    (trip: Omit<TripRecord, 'id' | 'createdAt'>) => {
      const newTrip: TripRecord = {
        ...trip,
        id: `trip-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setTrips((prev) => [newTrip, ...prev]);

      // 顺便将城市状态设为已打卡（如果不是常住）
      setStatusMap((prev) => {
        if (prev[trip.cityId] !== 'resident') {
          return { ...prev, [trip.cityId]: 'visited' };
        }
        return prev;
      });

      return newTrip;
    },
    []
  );

  // 删除足迹游历打卡
  const removeTripRecord = useCallback((tripId: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== tripId));
  }, []);

  // AI 智能文脉扩展（如果城市无数据或想要更多深度资料）
  const generateAiCulturalInsights = useCallback(
    async (cityId: string, cityName: string, province: string): Promise<CulturalItem[]> => {
      // 模拟具有深度文化素养的 AI 知识生成引擎
      const cleanName = cityName.replace(/(市|地区|盟|州)$/, '');
      const aiItems: CulturalItem[] = [
        {
          id: `ai-food-${Date.now()}`,
          category: 'food',
          title: `${cleanName}地道老街风味坊`,
          subtitle: '民间非遗传统滋味',
          description: `汇聚${cleanName}千百年来民间传承之乡土风味，注重食材原汁原味与传统火候，香气扑鼻，回味无穷。`,
          eraOrHistory: '明清市井饮食文化流传',
          highlight: '原汁原味，地道乡愁',
          tags: ['AI提炼', '地方名吃'],
          isCustom: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'ai-spot-' + Date.now(),
          category: 'spot',
          title: `${cleanName}古城遗址与古桥`,
          subtitle: '岁月沉淀的历史印记',
          description: `作为${province}的重要历史节点，保存有明清时期的古驿道、青石板老街与历史防御建筑，见证地域沧桑巨变。`,
          eraOrHistory: '明代古建遗存',
          highlight: '青砖黛瓦，古意盎然',
          tags: ['AI提炼', '历史古迹'],
          isCustom: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: `ai-celebrity-${Date.now()}`,
          category: 'celebrity',
          title: `${cleanName}历代先贤名儒`,
          subtitle: '文脉留香的名家墨客',
          description: `在${cleanName}这片沃土上，历代涌现出众多忠臣良将、诗书名家与巧手工匠，为华夏文脉留下了宝贵的精神财富。`,
          eraOrHistory: '历代人文先贤',
          highlight: '诗礼传家，风骨傲然',
          tags: ['AI提炼', '文人志士'],
          isCustom: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: `ai-heritage-${Date.now()}`,
          category: 'heritage',
          title: `${cleanName}传统民俗与非遗技艺`,
          subtitle: '岁月薪火相传的民间智慧',
          description: `蕴含${cleanName}深厚的民俗风情与传统手造技艺，逢年过节锣鼓喧天，世代相传的非遗技艺展现中华民族独特的精神图腾。`,
          eraOrHistory: '世代民俗传承',
          highlight: '巧夺天工，弦歌不辍',
          tags: ['AI提炼', '非物质文化遗产'],
          isCustom: true,
          createdAt: new Date().toISOString(),
        },
      ];

      // 写入用户自定义列表
      setCustomItemsMap((prev) => ({
        ...prev,
        [cityId]: [...(prev[cityId] || []), ...aiItems],
      }));

      return aiItems;
    },
    []
  );

  // 统计大盘指标
  const stats: FootprintStats = useMemo(() => {
    let visited = 0;
    let resident = 0;
    let wishlist = 0;
    const coveredProvinces = new Set<string>();

    Object.entries(statusMap).forEach(([cityId, status]) => {
      const city = getCityById(cityId);
      if (status === 'visited') {
        visited++;
        if (city) coveredProvinces.add(city.province);
      } else if (status === 'resident') {
        resident++;
        if (city) coveredProvinces.add(city.province);
      } else if (status === 'wishlist') {
        wishlist++;
      }
    });

    // 计算总文脉条目数量
    let customCount = 0;
    Object.values(customItemsMap).forEach((arr) => {
      customCount += arr.length;
    });
    let predefinedCount = 0;
    Object.values(DEFAULT_CULTURAL_DATABASE).forEach((item) => {
      predefinedCount += item.items.length;
    });

    return {
      totalCities: ALL_CHINA_CITIES.length,
      visitedCount: visited,
      residentCount: resident,
      wishlistCount: wishlist,
      provincesCovered: coveredProvinces.size,
      totalCulturalItems: predefinedCount + customCount,
      totalTrips: trips.length,
    };
  }, [statusMap, customItemsMap, trips]);

  // 重置为系统默认数据
  const resetToDefault = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_STATUS);
    localStorage.removeItem(STORAGE_KEY_CUSTOM_ITEMS);
    localStorage.removeItem(STORAGE_KEY_TRIPS);
    const initialMap: Record<string, FootprintStatus> = {};
    Object.values(DEFAULT_CULTURAL_DATABASE).forEach((item) => {
      if (item.defaultStatus) {
        initialMap[item.cityId] = item.defaultStatus;
      }
    });
    setStatusMap(initialMap);
    setCustomItemsMap({});
    setTrips([]);
  }, []);

  return {
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
  };
}
