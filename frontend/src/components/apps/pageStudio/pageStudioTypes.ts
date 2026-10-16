/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 书页工坊应用状态与网络通信模块
 */

export interface ChapterSummary {
  number: number;
  title: string;
  encrypted?: boolean;
  imageCount?: number;
}

export interface ProgressState {
  chapter?: number;
  paragraph: number;
  total: number;
}

export interface PageStudioJob {
  id: string;
  kind?: string;
  format?: string;
  url: string;
  title: string;
  start: number;
  end: number;
  status: 'ready' | 'running' | 'paused' | 'failed' | 'complete' | 'exporting' | string;
  message?: string;
  error?: string | null;
  progress?: ProgressState;
  createdAt: string | number;
  artifacts: string[];
  chapters: ChapterSummary[];
}

export interface PageStudioState {
  jobs: PageStudioJob[];
  current: PageStudioJob | null;
  browserOpen: boolean;
  token?: string;
}

export const STATUS_LABELS: Record<string, string> = {
  ready: '准备中',
  running: '正在抓取',
  paused: '已暂停',
  failed: '需要处理',
  complete: '已完成',
  exporting: '正在导出',
};
