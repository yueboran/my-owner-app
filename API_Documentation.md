# 璀璨星图 (迹向) - 前后端对接 API 数据格式文档

> **版本更新记录 (Changelog)**
> - **最新更新**：前端结构已执行冗余视图组件清理（移除了 `BentoGrid`、`HeroSection` 等历史隔离组件），但**核心数据模型未受影响**，本 API 文档中的所有 `interface` 和端点 (Endpoints) 设计依然保持为最新基准，可供后端放心对接。

本文档基于前端当前的数据结构 (`src/types.ts`)，梳理了所有需要与后端对接的 API 接口和数据格式。旨在为后端开发提供清晰的接口规范和数据模型定义。

## 1. 通用约定

### 1.1 基础请求头 (Headers)
```http
Content-Type: application/json
Authorization: Bearer <Your-Token> (如有身份鉴权)
```

### 1.2 标准响应结构
所有 API 接口返回的数据应统一包装在如下结构中：
```typescript
interface ApiResponse<T> {
  code: number;         // 状态码：200 表示成功，其他表示异常
  message: string;      // 成功或错误的提示信息
  data: T;              // 实际返回的数据负载
}
```

### 1.3 分页响应结构
```typescript
interface PaginatedData<T> {
  list: T[];            // 当前页数据列表
  total: number;        // 总条目数
  page: number;         // 当前页码
  limit: number;        // 每页条目数
}
```

---

## 2. 核心数据模型 (Data Models)

此处列出后端需要与前端保持一致的核心数据结构定义。

### 2.1 项目档案 (Project)
```typescript
interface Project {
  id: string;
  name: string;
  coverImage?: string;
  icon: string;           // 材质图标名称
  intro: string;          // 简短介绍
  description: string;    // 详细背景描述（支持富文本/HTML）
  auroraScore: number;    // 综合得分（雷达图平均值）
  radar: RadarDimensions; // 五维雷达评分
  radarContributors?: {
    concept?: { author: string; avatarUrl: string };
    research?: { author: string; avatarUrl: string };
    planning?: { author: string; avatarUrl: string };
    extension?: { author: string; avatarUrl: string };
    evaluation?: { author: string; avatarUrl: string };
  };
  tags: string[];         // 分类标签路径
  commentsCount: number;
  timeAgo: string;        // 或 ISO 8601 时间戳
  hotness: string;        // 热度（如 "9.2k"）
  likes: number;
  bookmarked?: boolean;
  
  // 痛点共鸣与共创轨迹
  painPointCount?: number;
  inspirationSource?: string;
  inspirationAuthor?: string;
  inspirationAuthorRole?: string;
  coCreationTimeline?: CoCreationEvent[];
}
```

### 2.2 雷达图评分 (RadarDimensions)
```typescript
interface RadarDimensions {
  concept: number;    // 核心概念 (0-100)
  research: number;   // 深度调研 (0-100)
  planning: number;   // 方案规划 (0-100)
  extension: number;  // 拓展与延伸 (0-100)
  evaluation: number; // 价值与评估 (0-100)
}
```

### 2.3 评论与延展 (Comment)
```typescript
interface Comment {
  id: string;
  author: string;
  avatarUrl?: string;
  timeAgo: string;
  title?: string;
  content: string;
  imageUrl?: string;
  images?: string[];
  type?: 'comment' | 'expansion';
  projectName?: string;
  category?: string;
  ratings?: Record<string, number>;
}
```

### 2.4 共创轨迹事件 (CoCreationEvent)
```typescript
interface CoCreationEvent {
  date: string;
  author: string;
  authorRole?: string;
  eventType: 'inspiration' | 'tech_claim' | 'prototype' | 'milestone' | 'community';
  content: string;
  emoji: string;
}
```

### 2.5 动态 Feed (TimelineFeedItem)
```typescript
interface TimelineFeedItem {
  id: string;
  author: string;
  avatarUrl?: string;
  timeAgo: string;
  feedType: 'expansion' | 'comment' | 'recommendation';
  feedTypeLabel?: string;
  projectName?: string;
  projectIntro?: string;
  projectCover?: string;
  content: string;
  likes: number;
  replyCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  categoryTags?: string[];
}
```

---

## 3. API 接口定义

### 3.1 档案与项目管理 (Projects)

#### 3.1.1 获取项目列表 (排行榜 / 发现页)
- **Method:** `GET`
- **Path:** `/api/projects`
- **Query 参数:**
  - `category` (string, 可选): 标签过滤，如 `身体健康`
  - `sortBy` (string, 可选): `hotness` | `latest` | `score`
  - `page` (number, 默认 1)
  - `limit` (number, 默认 10)
- **Response Data:** `PaginatedData<Project>`

#### 3.1.2 获取项目详情
- **Method:** `GET`
- **Path:** `/api/projects/:id`
- **Response Data:** `Project`

#### 3.1.3 创建新项目 (提交档案)
- **Method:** `POST`
- **Path:** `/api/projects`
- **Request Body:** 
  ```json
  {
    "name": "项目名称",
    "intro": "一句话介绍",
    "description": "详细描述HTML",
    "tags": ["健康与精力 / 身体健康 / 饮食管理"],
    "icon": "Activity",
    "coverImage": "base64/url"
  }
  ```
- **Response Data:** `Project`

#### 3.1.4 更新项目信息
- **Method:** `PUT`
- **Path:** `/api/projects/:id`
- **Request Body:** Partial `<Project>`
- **Response Data:** `Project`

#### 3.1.5 交互操作 (喜欢 / 收藏 / 痛点共鸣)
- **点赞:** `POST /api/projects/:id/like`
- **收藏:** `POST /api/projects/:id/bookmark`
- **共鸣:** `POST /api/projects/:id/painpoint`
- **Response Data:** `{ status: "success", currentCount: number }`

---

### 3.2 评论与共创 (Comments & Co-creation)

#### 3.2.1 获取项目评论列表
- **Method:** `GET`
- **Path:** `/api/projects/:id/comments`
- **Query 参数:** `page`, `limit`
- **Response Data:** `PaginatedData<Comment>`

#### 3.2.2 发表评论/延展
- **Method:** `POST`
- **Path:** `/api/projects/:id/comments`
- **Request Body:**
  ```json
  {
    "content": "评论内容...",
    "type": "expansion",
    "title": "可选标题",
    "images": ["url1", "url2"]
  }
  ```
- **Response Data:** `Comment`

#### 3.2.3 提交/更新雷达评分
- **Method:** `POST`
- **Path:** `/api/projects/:id/radar`
- **Request Body:**
  ```json
  {
    "radarDimensions": {
      "concept": 85,
      "research": 90,
      "planning": 70,
      "extension": 80,
      "evaluation": 95
    }
  }
  ```
- **Response Data:** 
  ```json
  {
    "newAverage": 84,
    "updatedRadar": { /* 最新的雷达均值 */ }
  }
  ```

---

### 3.3 动态广场 (Timeline)

#### 3.3.1 获取时间线 Feed 流
- **Method:** `GET`
- **Path:** `/api/feed`
- **Query 参数:** `page`, `limit`, `type` (可选，过滤类型)
- **Response Data:** `PaginatedData<TimelineFeedItem>`

---

### 3.4 用户中心与资产投资组合 (Portfolio)

#### 3.4.1 获取个人资产看板概览
- **Method:** `GET`
- **Path:** `/api/user/portfolio/stats`
- **Response Data:** 
  ```json
  {
    "totalValuation": 12500,
    "valuationChange24h": 320,
    "totalHoldings": 45,
    "influenceRank": "A+",
    "createdCount": 12,
    "commenterCount": 30,
    "streakDays": 15,
    "weeklyActivity": [2, 5, 8, 3, 10, 4, 7]
  }
  ```

#### 3.4.2 获取持仓列表
- **Method:** `GET`
- **Path:** `/api/user/portfolio/holdings`
- **Query 参数:** `page`, `limit`
- **Response Data:** `PaginatedData<PortfolioHolding>`
 *(PortfolioHolding 模型包含 project, role, valuationChange 等字段)*

#### 3.4.3 获取站内通知
- **Method:** `GET`
- **Path:** `/api/user/notifications`
- **Response Data:** `PaginatedData<InAppNotification>`
*(通知类型包括 comment, milestone, painpoint)*
