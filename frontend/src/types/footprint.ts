/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 华夏星图·足迹与文脉数据模型定义
 */

// 足迹状态类型
export type FootprintStatus = 'unvisited' | 'visited' | 'resident' | 'wishlist';

// 四大文化标注维度分类
export type CultureCategory = 'food' | 'spot' | 'celebrity' | 'heritage';

// 单条文化标注项目
export interface CulturalItem {
  id: string;
  category: CultureCategory; // 美食 | 名胜古迹 | 历史名人 | 文化渊源
  title: string;             // 标题/名称（如：北京烤鸭、故宫博物院、李白、苏绣工艺）
  subtitle?: string;          // 副标题或标签（如：非遗名吃、世界文化遗产、盛唐诗仙）
  description: string;       // 详细介绍与渊源故事
  tags?: string[];            // 关键词标签
  eraOrHistory?: string;     // 历史年代/朝代/起源
  highlight?: string;        // 核心亮点/名句/典故
  imageUrl?: string;         // 图片或象征性图腾
  isCustom?: boolean;        // 是否为用户自定义新增的标注
  createdAt?: string;        // 创建时间
}

// 单次足迹打卡记录（旅行日记）
export interface TripRecord {
  id: string;
  cityId: string;
  cityName: string;
  date: string;              // 旅行日期或年月
  rating: number;            // 体验评分 1~5 星
  companion?: string;        // 同行伴侣/家人/好友/独自
  summary: string;           // 旅途心境或日记摘要
  photos?: string[];         // 留影列表
  createdAt: string;
}

// 城市基本地理信息
export interface CityGeoItem {
  id: string;                // 行政区划代码，如 "110000", "510100"
  name: string;              // 简短名称（如 "北京", "成都", "西安"）
  fullName: string;          // 完整名称（如 "北京市", "成都市", "西安市"）
  province: string;          // 所属省份（如 "四川省", "陕西省"）
  provinceCode: number;      // 所属省份代码
  center: [number, number];  // 经纬度坐标 [lng, lat]
}

// 城市的文脉与足迹复合信息
export interface CityCultureProfile {
  cityId: string;
  cityName: string;
  province: string;
  alias?: string;            // 古称/别称（如 "长安"、"锦官城"、"金陵"、"临安"）
  summaryQuote?: string;     // 代表性诗词或千古名句
  overview?: string;         // 城市文脉概述
  footprintStatus: FootprintStatus; // 当前足迹状态
  items: CulturalItem[];     // 该城市下的美食、古迹、名人、渊源条目
  trips: TripRecord[];       // 游历打卡足迹日志
}

// 统计大盘指标
export interface FootprintStats {
  totalCities: number;       // 全国收录城市总数 (370)
  visitedCount: number;      // 已去过城市数
  residentCount: number;     // 常住/故乡城市数
  wishlistCount: number;     // 心愿单城市数
  provincesCovered: number;  // 涉足省份数 (总计34)
  totalCulturalItems: number;// 标注收录文脉总数
  totalTrips: number;        // 旅行日志篇数
}
