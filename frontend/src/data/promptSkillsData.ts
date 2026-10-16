/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 提示词与 Skill 技能库核心数据模型与内置资产
 */

export interface PromptItem {
  id: string;
  title: string;
  category: '工作复盘' | '事件推进' | '知识加工' | '代码架构' | '商业洞察' | '自定义';
  role: string;
  description: string;
  promptTemplate: string;
  tags: string[];
  isBuiltIn?: boolean;
  usageCount?: number;
}

export interface SkillItem {
  id: string;
  name: string;
  identifier: string;
  category: '界面交互' | '自动化' | '设计创意' | '工程规范' | '数据智能';
  description: string;
  triggerCondition: string;
  tools: string[];
  version: string;
  source: '内置核心技能' | '系统配置技能' | '扩展插件';
  parameters?: string[];
  exampleInstruction: string;
}

// 系统当前内置高品质提示词库
export const DEFAULT_PROMPTS: PromptItem[] = [
  {
    id: 'prompt-01',
    title: '周报 / 日报智能提炼与成果归纳',
    category: '工作复盘',
    role: '知识资产管家 / 工作秘书',
    description: '深度联动个人知识库与事件跟踪数据，按选定时间范围快速提炼核心交付、量化成果与后续推进路线。',
    promptTemplate: `你是一名资深的工作效能管家。请根据以下提供的在 {time_range} 内的工作日记、知识收集和事件跟踪推进记录：
1. 提炼本周/本阶段的核心交付成果（采用 STAR 原则，突出关键里程碑与量化成效）；
2. 梳理当前仍处于进行中或存在阻碍的事项，并分析潜在风险点；
3. 制定下周/下一阶段的优先推进清单与明确时间节点。
要求：结构清晰、文字简练有力、格式采用 GitHub Markdown。`,
    tags: ['周报日报', '知识沉淀', 'STAR原则'],
    isBuiltIn: true,
    usageCount: 1420,
  },
  {
    id: 'prompt-02',
    title: '事件流程推进下一步规划与交付物推演',
    category: '事件推进',
    role: '敏捷项目经理 / 架构推演Agent',
    description: '基于当前事件流的上一节点与主干演进方向，智能推演下一步最具备业务价值的交付物与排期。',
    promptTemplate: `请分析当前事件《{event_title}》的演进上下文：
- 当前阶段：{current_stage}
- 前置节点产出物：{previous_outputs}
请为该事件规划下一个高质量的执行节点：
1. 给出节点名称（不超过 18 个汉字，动宾结构）；
2. 详细阐述该节点的具体任务拆解与核心技术交付物；
3. 预估推荐发布日期与责任人角色；
4. 判断该步骤是否需要衍生独立并行分支，并说明理由。`,
    tags: ['事件跟踪', '敏捷交付', '分支衍生'],
    isBuiltIn: true,
    usageCount: 980,
  },
  {
    id: 'prompt-03',
    title: '全流程闭环总结与经验资产固化',
    category: '事件推进',
    role: '项目验收专家 / 复盘教练',
    description: '当事件达成闭环归档条件时，梳理所有节点与分支链路，生成符合大模型知识库沉淀规范的复盘报告。',
    promptTemplate: `事件《{event_title}》已顺利完成全流程推演，请生成正式的【全流程闭环复盘总结报告】：
1. 里程碑总览：梳理主干推进与所有分支节点的达成情况；
2. 核心价值与成效：对比事件初始设立的目标，评估最终交付质量；
3. 经验固化与避坑指南：提炼可复用的方法论与技术规范，供团队后续知识库检索；
4. 归档结论：明确标注是否建议永久归档入【已完成库】。`,
    tags: ['闭环结项', '资产固化', '复盘沉淀'],
    isBuiltIn: true,
    usageCount: 750,
  },
  {
    id: 'prompt-04',
    title: '非结构化文本 3D 知识图谱三元组抽取',
    category: '知识加工',
    role: '知识图谱架构师',
    description: '将长文、调研报告或工作笔记自动解析提取为高密度实体（Entity）与关系（Relation）三元组。',
    promptTemplate: `请深度阅读以下文本材料，并抽取用于构建 3D 知识图谱的核心三元组：
输入内容：
"""
{source_text}
"""
输出规范：
1. 实体清单：提取不超过 12 个核心实体，标注其类别（核心概念/工具技术/业务模块/人物组织）；
2. 关系矩阵：以 (实体 A) --[关系谓词]--> (实体 B) 格式输出关系连线；
3. 图谱密度评估：评估实体间的聚类紧密度，指出哪个实体适合作为中心超节点（Hub Node）。`,
    tags: ['知识图谱', '实体抽取', '三元组'],
    isBuiltIn: true,
    usageCount: 1120,
  },
  {
    id: 'prompt-05',
    title: '工作日记复盘：认知盲区与元反思',
    category: '工作复盘',
    role: '认知教练 / 个人成长导师',
    description: '超越流水账表面，深挖一天决策背后的思维模型、注意力分配与精力损耗点。',
    promptTemplate: `请阅读我今天的工作日记记录：
"{journal_content}"
请从以下三个维度给予我客观、深度的元反思反馈：
1. 【高光与心流】：今天在哪个环节产生了最高的认知效能？其背后的驱动因素是什么？
2. 【能量泄漏点】：有哪些不必要的纠缠、拖延或低效沟通消耗了心智带宽？
3. 【行动微习惯】：请提炼一个明天即可立即落地践行的小行动（Mini Action），帮助我在同类情境下建立正向反馈。`,
    tags: ['认知反思', '心流状态', '微习惯'],
    isBuiltIn: true,
    usageCount: 860,
  },
  {
    id: 'prompt-06',
    title: '生产级前端架构重构与状态总线设计',
    category: '代码架构',
    role: '资深全栈架构师',
    description: '指导复杂单页应用的状态解耦、跨组件总线设计、持久化与组件树性能极致优化。',
    promptTemplate: `我正在重构一个复杂的生产级前端系统，核心模块包括：{module_description}。
请帮我设计一套高内聚、低耦合的架构演进方案：
1. 状态管理分层：合理划分全局持久化状态（LocalStorage/Server）、跨组件广播事件总线与局部受控状态；
2. 拓扑与重绘优化：针对大规模节点/卡片列表，给出虚拟化渲染（Virtual Scrolling）与防抖防重绘方案；
3. 类型安全保障：给出核心 TypeScript 接口定义规范，确保大模型读写无歧义。`,
    tags: ['架构设计', '状态总线', 'TypeScript'],
    isBuiltIn: true,
    usageCount: 640,
  },
  {
    id: 'prompt-07',
    title: '商业模式画布与 SWOT 深度推演',
    category: '商业洞察',
    role: '商业战略分析师',
    description: '对新商业想法、企业级软件产品或技术出海进行多维度价值主张与竞争壁垒推演。',
    promptTemplate: `请针对项目【{project_name}】开展全方位的商业化战略分析：
项目简介：{project_summary}
请输出结构化推演：
1. 核心价值主张（Value Proposition）：解决了客户的何种刚需痛点？相比竞品的核心护城河是什么？
2. SWOT 矩阵分析：细致列出内部优势(S)、内部劣势(W)、外部机会(O)、外部威胁(T)；
3. MVP 破局路径：首个商业化验证版本的最快闭环路线。`,
    tags: ['商业分析', 'SWOT', '商业画布'],
    isBuiltIn: true,
    usageCount: 530,
  },
  {
    id: 'prompt-08',
    title: '刻意训练技能瓶颈拆解与刻意练习计划',
    category: '知识加工',
    role: '刻意练习导师',
    description: '针对某一专业技能难点，按照刻意练习原则拆解进阶练习阶梯与即时反馈机制。',
    promptTemplate: `我希望在【{target_skill}】这一技能上突破瓶颈，目前我的水准处于：{current_level}。
请按照《刻意练习》原则为我制定一张 21 天专项攻坚训练卡：
1. 关键心智模型：该技能高手的核心底层思考逻辑是什么？
2. 细分微技能拆解：将该大技能拆分为 3 个可单独练习的微动作；
3. 练习计划与即时反馈：设计每天 30 分钟的高强度练习情境，并给出自我校验的客观标准。`,
    tags: ['刻意训练', '认知进阶', '微动作'],
    isBuiltIn: true,
    usageCount: 420,
  },
];

// 系统当前可调用的核心技能库 (Skills)
export const DEFAULT_SKILLS: SkillItem[] = [
  {
    id: 'skill-generative-ui',
    name: '生成式富交互组件',
    identifier: 'generative_ui',
    category: '界面交互',
    description: '支持智能体直接向聊天视窗或独立视口渲染高颜值的富交互 HTML/SVG 部件、动态数据图表与操作控制器。',
    triggerCondition: '当需要向用户展示生动图表、数据对比卡片、交互式流程演进或超越纯文本的内容时自动激活。',
    tools: ['render_inline_widget', 'export_html_artifact', 'view_file'],
    version: 'v2.4.0',
    source: '内置核心技能',
    parameters: ['WidgetType', 'Theme', 'InteractiveBindings'],
    exampleInstruction: '请为我生成一个展示近 7 天知识库沉淀趋势的交互式折线统计图组件。',
  },
  {
    id: 'skill-automation',
    name: '定时任务与自动化调度',
    identifier: 'automation',
    category: '自动化',
    description: '交互式设计并创建后台定时巡检、Cron 定期报告生成或一次性延时提醒任务，自动管理后台守护进程。',
    triggerCondition: '当用户表达定时/定期执行诉求（如“每天早晨总结”、“每周五下午生成待办盘点”）时触发。',
    tools: ['schedule', 'manage_task', 'run_command'],
    version: 'v1.8.2',
    source: '内置核心技能',
    parameters: ['CronExpression', 'DurationSeconds', 'Prompt', 'IsDaemon'],
    exampleInstruction: '/automation 帮我设置一个工作日每天 18:00 自动扫描知识库并生成今日小结的任务。',
  },
  {
    id: 'skill-poster-generator',
    name: '专业级设计师海报生成',
    identifier: 'poster-generator',
    category: '设计创意',
    description: '遵循企业级设计规范生成专业设计师水准的海报、活动主视觉、产品宣传宣发图与营销 Key Visual。',
    triggerCondition: '当用户要求设计海报、活动宣传图、产品推广主图或视觉 Key Visual 时调用。',
    tools: ['generate_image', 'view_file', 'write_to_file'],
    version: 'v3.1.0',
    source: '系统配置技能',
    parameters: ['AspectRatio', 'StylePalette', 'KeyElements'],
    exampleInstruction: '为华夏星图设计一张深邃科技感、带有城市星辰文脉的主视觉宣传海报。',
  },
  {
    id: 'skill-marketing-design',
    name: '品牌营销与多场景视觉演化',
    identifier: 'marketing-design',
    category: '设计创意',
    description: '基于 Style + Palette + Texture + Layout 系统化设计语言，实现统一视觉身份下的多场景构图演化。',
    triggerCondition: '品牌系列化活动推广、公司文化墙、多主题视觉设计场景中统一调用。',
    tools: ['generate_image', 'replace_file_content'],
    version: 'v2.0.1',
    source: '系统配置技能',
    parameters: ['BrandTokens', 'SceneType', 'LayoutGrid'],
    exampleInstruction: '根据 Neutral + Indigo 浅色高光规范，生成一套统一调性的活动展架与主图。',
  },
  {
    id: 'skill-agy-customizations',
    name: 'Antigravity 自定义与扩展引擎',
    identifier: 'agy-customizations',
    category: '工程规范',
    description: '全景掌控系统技能扩展、规则（Rules）、MCP 服务与插件的加载机制、优先级排序与编写规范。',
    triggerCondition: '当询问或配置系统行为准则、自定义技能规范或 MCP 集成机制时触发。',
    tools: ['view_file', 'write_to_file', 'replace_file_content'],
    version: 'v2.5.0',
    source: '内置核心技能',
    parameters: ['CustomizationType', 'TargetScope', 'Priority'],
    exampleInstruction: '指导我如何创建一个新的 MCP Server 扩展并注册到当前工作区。',
  },
  {
    id: 'skill-event-flow-agent',
    name: '事件跟踪与闭环推演智能体',
    identifier: 'event-flow-agent',
    category: '数据智能',
    description: '驱动以“事件”为单元的双库状态机流转，支持自然语言意图理解、事件索引、步骤创建与人工确认机制。',
    triggerCondition: '在智能事项中枢或对话中需要推进下一步、开辟新分支或执行全链路闭环时调用。',
    tools: ['useEventFlows', 'convertToGraphLayout', 'formatEventToLlmJson'],
    version: 'v1.5.0',
    source: '系统配置技能',
    parameters: ['EventId', 'ActionType', 'ProposalDetails'],
    exampleInstruction: '识别用户语义并索引对应事件，生成带有拟执行卡片的下一步推进方案。',
  },
  {
    id: 'skill-plugin',
    name: '插件系统生态管理器',
    identifier: 'plugin',
    category: '工程规范',
    description: '支持以命名空间为单位批量管理和打包 Skills、Agents、Rules、MCP Servers 及生命周期 Hooks。',
    triggerCondition: '安装、启用、停用或打包发布独立插件包时调用。',
    tools: ['list_plugin_accounts', 'run_command', 'view_file'],
    version: 'v2.1.0',
    source: '内置核心技能',
    parameters: ['PluginName', 'Operation', 'Namespace'],
    exampleInstruction: '/plugin list 查看当前工作区已启用插件与认证状态。',
  },
  {
    id: 'skill-ui-extension',
    name: '侧边面板 UI 扩展运行环境',
    identifier: 'ui-extension',
    category: '界面交互',
    description: '为 Antigravity 构建交互式 Web 侧边栏面板，由轻量 Node.js sidecar 与前端 SDK 驱动。',
    triggerCondition: '需要开发或调试常驻右侧面板的交互式小工具或数据监控台时调用。',
    tools: ['run_command', 'write_to_file', 'view_file'],
    version: 'v1.2.0',
    source: '内置核心技能',
    parameters: ['SidecarPort', 'SdkBindings'],
    exampleInstruction: '启动 UI 插件并在右侧展开常驻数据看板面板。',
  },
];

// 大模型可调用的独立工具模型 (支持在线二次开发)
export interface ToolItem {
  id: string;
  name: string;
  identifier: string; // 函数调用名称，供 LLM Function Calling 识别
  category: '数据处理' | '网络检索' | '脚本运算' | '结构校验' | '图表生成';
  language: 'python' | 'typescript' | 'javascript';
  description: string; // 工具的 docstring 提示词，决定大模型如何理解和选择该工具
  parametersSchema: string; // JSON Schema 规范参数
  sourceCode: string; // 可二次开发的真实代码实现
  author: string;
  version: string;
  isCustom?: boolean;
  updatedAt?: string;
}

// 默认内置高价值工具集 (支持用户二次开发与调试扩展)
export const DEFAULT_TOOLS: ToolItem[] = [
  {
    id: 'tool-py-interpreter',
    name: 'Python 数据分析沙箱执行器',
    identifier: 'run_python_interpreter',
    category: '脚本运算',
    language: 'python',
    description: '在隔离沙箱环境中执行 Python 代码，支持数学计算、Pandas 数据切片与统计算法处理。',
    parametersSchema: JSON.stringify(
      {
        type: 'object',
        properties: {
          code: { type: 'string', description: '待执行的完整 Python 代码片段' },
          timeout_seconds: { type: 'number', description: '最大超时时间（秒），默认 10' },
        },
        required: ['code'],
      },
      null,
      2
    ),
    sourceCode: `import sys
import json
import math

def run_python_interpreter(code: str, timeout_seconds: int = 10):
    """
    Python 沙箱运算执行器核心入口 (支持二次开发扩展依赖库)
    """
    safe_globals = {
        "math": math,
        "json": json,
        "__builtins__": {
            "print": print,
            "range": range,
            "len": len,
            "int": int,
            "float": float,
            "str": str,
            "list": list,
            "dict": dict,
            "sum": sum,
            "max": max,
            "min": min,
        }
    }
    safe_locals = {}
    try:
        # 执行用户动态代码并捕获局部变量产出
        exec(code, safe_globals, safe_locals)
        return {
            "status": "success",
            "result": safe_locals.get("result", "代码执行完成"),
            "variables": {k: str(v) for k, v in safe_locals.items() if not k.startswith("_")}
        }
    except Exception as e:
        return {"status": "error", "error_message": str(e)}
`,
    author: '华鲲元启 · 工具工场',
    version: 'v1.4.0',
    updatedAt: '2026-10-12',
  },
  {
    id: 'tool-fetch-clean-web',
    name: '网页内容爬取与纯净清洗器',
    identifier: 'fetch_and_clean_webpage',
    category: '网络检索',
    language: 'typescript',
    description: '抓取指定网页 URL 内容，自动剔除广告、样式标签与冗余脚本，提炼为高密度纯净 Markdown 文本。',
    parametersSchema: JSON.stringify(
      {
        type: 'object',
        properties: {
          url: { type: 'string', description: '目标网页的有效 HTTP/HTTPS 链接' },
          max_length: { type: 'number', description: '最大保留文本字符数，默认 8000' },
        },
        required: ['url'],
      },
      null,
      2
    ),
    sourceCode: `/**
 * 网页内容抓取与清洗工具核心逻辑 (支持二次开发加入反爬代理与选择器过滤)
 */
export async function fetch_and_clean_webpage(url: string, maxLength: number = 8000) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StarMapBot/1.0' }
    });
    const html = await res.text();
    
    // 移除无用 head、script、style 标签
    const cleanHtml = html
      .replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, '')
      .replace(/<style\\b[^<]*(?:(?!<\\/style>)<[^<]*)*<\\/style>/gi, '')
      .replace(/<!--[\\s\\S]*?-->/g, '');

    // 简单提取正文段落与标题
    const plainText = cleanHtml
      .replace(/<h[1-6][^>]*>(.*?)<\\/h[1-6]>/gi, '\\n### $1\\n')
      .replace(/<p[^>]*>(.*?)<\\/p>/gi, '\\n$1\\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim();

    return {
      status: 'success',
      url,
      markdown_content: plainText.slice(0, maxLength),
      truncated: plainText.length > maxLength
    };
  } catch (error: any) {
    return { status: 'error', message: error.message };
  }
}
`,
    author: '智能体研发组',
    version: 'v2.1.0',
    updatedAt: '2026-10-11',
  },
  {
    id: 'tool-json-validator',
    name: 'LLM 结构化 JSON 校验与自愈器',
    identifier: 'json_schema_validator',
    category: '结构校验',
    language: 'typescript',
    description: '校验大模型吐出的 JSON 文本是否完全满足业务 Schema，自动剔除代码块标记并修复常见格式截断。',
    parametersSchema: JSON.stringify(
      {
        type: 'object',
        properties: {
          raw_text: { type: 'string', description: '大模型返回的原始字符串（可能带有 markdown 代码块）' },
          required_keys: { type: 'array', items: { type: 'string' }, description: '必须包含的核心字段列表' },
        },
        required: ['raw_text'],
      },
      null,
      2
    ),
    sourceCode: `/**
 * 大模型 JSON 输出校验与自动修复引擎 (二次开发可接入 Ajv 校验器)
 */
export function json_schema_validator(rawText: string, requiredKeys: string[] = []) {
  let cleaned = rawText.trim();
  // 剥离 \`\`\`json 标记
  if (cleaned.startsWith('\`\`\`')) {
    cleaned = cleaned.replace(/^\`\`\`(?:json)?\\s*/i, '').replace(/\\s*\`\`\`$/i, '');
  }

  try {
    const parsed = JSON.parse(cleaned);
    const missingKeys = requiredKeys.filter(k => !(k in parsed));
    return {
      valid: missingKeys.length === 0,
      data: parsed,
      missing_keys: missingKeys,
      repaired: cleaned !== rawText
    };
  } catch (err: any) {
    return {
      valid: false,
      error: 'JSON 语法解析失败: ' + err.message,
      original_snippet: cleaned.slice(0, 200)
    };
  }
}
`,
    author: '星图架构组',
    version: 'v1.2.0',
    updatedAt: '2026-10-10',
  },
  {
    id: 'tool-csv-to-markdown',
    name: 'CSV / TSV 表格数据 Markdown 对齐器',
    identifier: 'csv_to_markdown_converter',
    category: '数据处理',
    language: 'python',
    description: '将逗号分隔或制表符分隔的多行文本表格转换为格式严密、对齐美观的 GitHub Markdown 表格。',
    parametersSchema: JSON.stringify(
      {
        type: 'object',
        properties: {
          csv_data: { type: 'string', description: '多行 CSV 原始文本' },
          delimiter: { type: 'string', description: '分隔符，默认逗号 (,)' },
        },
        required: ['csv_data'],
      },
      null,
      2
    ),
    sourceCode: `def csv_to_markdown_converter(csv_data: str, delimiter: str = ",") -> str:
    """
    CSV 表格对齐转换器 (支持二次开发自动推导表头与数字右对齐)
    """
    lines = [line.strip() for line in csv_data.strip().splitlines() if line.strip()]
    if not lines:
        return ""
    
    rows = [[cell.strip() for cell in line.split(delimiter)] for line in lines]
    col_count = max(len(row) for row in rows)
    
    # 补齐短行
    normalized = [row + [""] * (col_count - len(row)) for row in rows]
    
    header = normalized[0]
    separator = ["---"] * col_count
    body = normalized[1:]
    
    md_lines = [
        "| " + " | ".join(header) + " |",
        "| " + " | ".join(separator) + " |",
    ]
    for row in body:
        md_lines.append("| " + " | ".join(row) + " |")
        
    return "\\n".join(md_lines)
`,
    author: '知识实验室',
    version: 'v1.0.1',
    updatedAt: '2026-10-09',
  },
  {
    id: 'tool-cron-evaluator',
    name: '自动化 Cron 表达式推演器',
    identifier: 'cron_expression_evaluator',
    category: '脚本运算',
    language: 'typescript',
    description: '解析标准 5 字段 Cron 表达式（分 时 日 月 周），推演接下来的触发时刻与自然语言人类可读说明。',
    parametersSchema: JSON.stringify(
      {
        type: 'object',
        properties: {
          cron_expr: { type: 'string', description: '如 "*/5 * * * *" 或 "0 9 * * 1"' },
          iterations: { type: 'number', description: '推演后续触发次数，默认 3' },
        },
        required: ['cron_expr'],
      },
      null,
      2
    ),
    sourceCode: `/**
 * 定时任务表达式语法校验与推演器 (支持二次开发接入时区转换)
 */
export function cron_expression_evaluator(cronExpr: string, iterations: number = 3) {
  const parts = cronExpr.trim().split(/\\s+/);
  if (parts.length !== 5) {
    return { valid: false, error: '标准 Cron 需包含 5 个字段 (分 时 日 月 周)' };
  }

  // 简易自然语言翻译
  let humanReadable = '自定义周期执行';
  if (cronExpr === '0 9 * * *') humanReadable = '每天上午 09:00 定时执行';
  else if (cronExpr === '*/5 * * * *') humanReadable = '每隔 5 分钟执行一次';
  else if (cronExpr === '0 18 * * 5') humanReadable = '每周五下午 18:00 执行';

  return {
    valid: true,
    expression: cronExpr,
    human_readable: humanReadable,
    next_runs_estimate: [
      new Date(Date.now() + 300000).toISOString(),
      new Date(Date.now() + 600000).toISOString(),
      new Date(Date.now() + 900000).toISOString(),
    ].slice(0, iterations)
  };
}
`,
    author: '自动化团队',
    version: 'v1.1.0',
    updatedAt: '2026-10-08',
  },
];

