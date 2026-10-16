import React from "react";
import { Activity, Brain, Rocket, DollarSign } from "lucide-react";

export type TreeNode = {
  id: string;
  label: string;
  color: string;
  summary?: string;
  image?: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
};

export const treeData: TreeNode[] = [
  {
    id: "1", label: "身心", color: "#4cd7f6", image: "/api/static/images/banners/banner_1.webp",
    icon: <Activity className="w-5 h-5" />,
    children: [
      {
        id: "1-1", label: "身体健康", color: "#4cd7f6",
        children: [
          { id: "1-1-1", label: "运动", color: "#4cd7f6", image: "/api/static/images/cards/1-1-1.webp", summary: "力量训练、有氧、柔韧性拉伸" },
          { id: "1-1-2", label: "饮食", color: "#4cd7f6", image: "/api/static/images/cards/1-1-2.webp", summary: "三餐记录、饮水量、营养素摄入" },
          { id: "1-1-4", label: "养生", color: "#4cd7f6", image: "/api/static/images/cards/1-1-4.webp", summary: "体检报告、病历档案、用药记录" },
        ]
      },
      {
        id: "1-2", label: "心理健康", color: "#4cd7f6",
        children: [
          { id: "1-2-1", label: "情绪", color: "#4cd7f6", image: "/api/static/images/cards/1-2-1.webp", summary: "情绪波动追踪、感恩日记" },
        ]
      }
    ]
  },
  {
    id: "2", label: "理论", color: "#10b981", image: "/api/static/images/banners/banner_2.webp",
    icon: <Brain className="w-5 h-5" />,
    children: [
      {
        id: "2-0", label: "资料", color: "#d0bcff",
        children: [
          { id: "2-0-1", label: "书单", color: "#d0bcff", image: "/api/static/images/cards/2-0-1.webp", summary: "书名+标签+介绍" },
          { id: "2-0-2", label: "网摘", color: "#d0bcff", image: "/api/static/images/cards/2-0-2.webp", summary: "可以是链接等形式" },
          { id: "2-0-3", label: "笔记", color: "#d0bcff", image: "/api/static/images/cards/2-0-3.webp", summary: "阅读与学习的记录与总结" },
        ]
      },
      {
        id: "2-1", label: "思考", color: "#d0bcff",
        children: [
          { id: "2-1-2", label: "思维导图", color: "#d0bcff", image: "/api/static/images/cards/2-1-2.webp", summary: "知识体系与框架的结构化大纲" },
          { id: "2-1-3", label: "反思", color: "#d0bcff", image: "/api/static/images/cards/2-1-3.webp", summary: "未解之谜、待研究的子课题与反思" },
        ]
      },
      {
        id: "2-2", label: "创作", color: "#d0bcff",
        children: [
          { id: "2-2-1", label: "复盘", color: "#d0bcff", image: "/api/static/images/cards/2-2-1.webp", summary: "阶段总结、认知纠偏与经验反思" },
          { id: "2-2-2", label: "专栏", color: "#d0bcff", image: "/api/static/images/cards/2-2-2.webp", summary: "生活感悟、自由创作与杂谈" },
        ]
      }
    ]
  },
  {
    id: "3", label: "实践", color: "#8b5cf6", image: "/api/static/images/banners/banner_3.webp",
    icon: <Rocket className="w-5 h-5" />,
    children: [
      {
        id: "3-0", label: "预备", color: "#34d399",
        children: [
          { id: "3-0-1", label: "灵感", color: "#34d399", image: "/api/static/images/cards/3-0-1.webp", summary: "想尝试的事情、初步的项目雏形、待办池" },
          { id: "3-0-2", label: "分析", color: "#34d399", image: "/api/static/images/cards/3-0-2.webp", summary: "链接到【2.2】，记录指导行动的底层逻辑或方法论" },
        ]
      },
      {
        id: "3-2", label: "执行", color: "#34d399",
        children: [
          { id: "3-2-1", label: "项目", color: "#34d399", image: "/api/static/images/cards/3-2-1.webp", summary: "当前正在进行、已挂起、已完成的任务卡片" },
          { id: "3-2-2", label: "记录", color: "#34d399", image: "/api/static/images/cards/3-2-2.webp", summary: "每日/每周执行记录、打卡追踪、遇到的卡点与阻碍" },
        ]
      },
      {
        id: "3-3", label: "总结", color: "#34d399",
        children: [
          { id: "3-3-1", label: "成果", color: "#34d399", image: "/api/static/images/cards/3-3-1.webp", summary: "最终交付物、作品集、达成的数据指标展示" },
          { id: "3-3-3", label: "感悟", color: "#34d399", image: "/api/static/images/cards/3-3-3.webp", summary: "与理论支持对照校验，记录踩坑经验，提取SOP" },
        ]
      }
    ]
  },
  {
    id: "4", label: "生活", color: "#f59e0b", image: "/api/static/images/banners/banner_4.webp",
    icon: <DollarSign className="w-5 h-5" />,
    children: [
      {
        id: "4-1", label: "财富", color: "#f59e0b",
        children: [
          { id: "4-1-1", label: "财富", color: "#f59e0b", image: "/api/static/images/cards/4-1-1.webp", summary: "主业薪资记录、副业探索与试错日志、被动收入管道建设" },
          { id: "4-1-2", label: "社交", color: "#f59e0b", image: "/api/static/images/cards/4-1-2.webp", summary: "新结识的有趣/有价值的人脉档案、潜在合作机会、贵人记录" },
        ]
      },
      {
        id: "4-2", label: "生活", color: "#f59e0b",
        children: [
          { id: "4-2-1", label: "爱好", color: "#f59e0b", image: "/api/static/images/cards/4-2-1.webp", summary: "无功利性的纯粹热爱：如摄影作品、烘焙配方改良记录" },
          { id: "4-2-2", label: "日记", color: "#f59e0b", image: "/api/static/images/cards/4-2-2.webp", summary: "日常生活中发生的一些值得记录的微小瞬间" },
        ]
      }
    ]
  }
];

// Helper Function: Get a flat list of tags (level 3 or 4) suitable for binding
export function getSelectableTags(): { value: string, label: string }[] {
  const options: { value: string, label: string }[] = [];

  treeData.forEach(level1 => {
    const l1Name = level1.label.split('——')[0].trim();
    level1.children?.forEach(level2 => {
      const l2Name = level2.label.trim();
      level2.children?.forEach(level3 => {
        const l3Name = level3.label.trim();
        
        // 我们将它组织为路径作为 tag: "个人成长 / 健康与精力 / 身体健康"
        // 由于项目中用到的 tag 是这种格式，我们可以构造为 "类别1 / 类别2 / 类别3"
        const tagValue = `${l1Name} / ${l2Name} / ${l3Name}`;
        options.push({ value: tagValue, label: tagValue });

        level3.children?.forEach(level4 => {
          const l4Name = level4.label.trim();
          const l4TagValue = `${tagValue} / ${l4Name}`;
          options.push({ value: l4TagValue, label: l4TagValue });
        });
      });
    });
  });

  return options;
}
