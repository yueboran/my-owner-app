/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 全国 34 个省级行政区与 370+ 地级市地理数据库
 */

import type { CityGeoItem } from '../types/footprint';
import citiesRawData from './chinaCitiesData.json';

// 全国所有地级市列表
export const ALL_CHINA_CITIES: CityGeoItem[] = citiesRawData.cities as CityGeoItem[];

// 按省份归类的省份字典
export const PROVINCES_MAP = citiesRawData.provinces as Record<
  string,
  {
    adcode: number;
    name: string;
    center: [number, number];
    cities: CityGeoItem[];
  }
>;

// 省份列表（34个省级行政区）
export const PROVINCE_LIST = Object.values(PROVINCES_MAP).map((p) => ({
  adcode: p.adcode,
  name: p.name,
  center: p.center,
  cityCount: p.cities.length,
}));

// 根据城市 ID 查找城市
export function getCityById(cityId: string): CityGeoItem | undefined {
  return ALL_CHINA_CITIES.find((c) => c.id === cityId);
}

// 根据城市名称（模糊或精准）查找城市
export function findCityByName(keyword: string): CityGeoItem | undefined {
  if (!keyword) return undefined;
  const clean = keyword.trim().replace(/(市|地区|盟|州)$/, '');
  return ALL_CHINA_CITIES.find(
    (c) =>
      c.name === clean ||
      c.fullName === keyword ||
      c.name.includes(clean) ||
      clean.includes(c.name)
  );
}

// 获取某一省份下的所有城市
export function getCitiesByProvince(provinceName: string): CityGeoItem[] {
  return ALL_CHINA_CITIES.filter((c) => c.province.includes(provinceName) || provinceName.includes(c.province));
}
