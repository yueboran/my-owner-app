/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 提示词与 Skill 技能/工具集统一中枢视图组件 (PromptSkillsView)
 * 职责：
 * 1. 顶部单行 Tab 栏：支持「全部资源」、「提示词库」、「已装载技能」与新增的「工具集 (Tools · 支持二次开发)」
 * 2. 工具模块：展示大模型可直接调用的高价值自研/收集工具，并支持在线代码二次开发、入参 Schema 调整与沙箱模拟调试
 * 3. 提示词库：支持一键复制模版、跳转智能体对话框运行，以及创建自定义提示词
 * 4. 技能库：展示当前系统内已激活的 Agent 技能规范与触发时机
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Terminal,
  Cpu,
  Search,
  Copy,
  Check,
  Play,
  Plus,
  BookOpen,
  Layers,
  Wand2,
  X,
  Code2,
  ExternalLink,
  Tag,
  Trash2,
  Bot,
  Flame,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
  Wrench,
  Settings2,
  FileCode,
  RotateCcw,
  FileJson,
  PlayCircle,
  CheckSquare,
  Boxes,
  Code,
  Zap,
} from 'lucide-react';
import {
  DEFAULT_PROMPTS,
  DEFAULT_SKILLS,
  DEFAULT_TOOLS,
  type PromptItem,
  type SkillItem,
  type ToolItem,
} from '../../data/promptSkillsData';

const CUSTOM_PROMPTS_STORAGE_KEY = 'starmap_custom_prompts_v1';
const CUSTOM_TOOLS_STORAGE_KEY = 'starmap_custom_tools_v1';

interface PromptSkillsViewProps {
  onNavigateToChat?: (initialPrompt?: string) => void;
}

export const PromptSkillsView: React.FC<PromptSkillsViewProps> = ({ onNavigateToChat }) => {
  // 核心激活的主 Tab：'prompts' | 'skills' | 'tools'
  const [activeTab, setActiveTab] = useState<'prompts' | 'skills' | 'tools'>('prompts');

  // 搜索关键字与分类筛选
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');

  // 用户自定义提示词列表 (持久化存储)
  const [customPrompts, setCustomPrompts] = useState<PromptItem[]>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_PROMPTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 工具集状态（内置工具 + 用户已修改/新增的工具，本地持久化）
  const [toolsList, setToolsList] = useState<ToolItem[]>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_TOOLS_STORAGE_KEY);
      if (stored) {
        const savedTools: ToolItem[] = JSON.parse(stored);
        // 合并：以 savedTools 为主，若有默认工具未在 savedTools 中则补充
        const savedMap = new Map(savedTools.map((t) => [t.id, t]));
        const merged = savedTools.slice();
        DEFAULT_TOOLS.forEach((def) => {
          if (!savedMap.has(def.id)) {
            merged.push(def);
          }
        });
        return merged;
      }
      return DEFAULT_TOOLS;
    } catch {
      return DEFAULT_TOOLS;
    }
  });

  // Toast 轻提示
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 复制状态缓存
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 查看 Skill 详细规格的弹窗
  const [activeSkillModal, setActiveSkillModal] = useState<SkillItem | null>(null);

  // 新建自定义提示词模态框
  const [isCreatePromptModalOpen, setIsCreatePromptModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<PromptItem['category']>('工作复盘');
  const [newRole, setNewRole] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newContent, setNewContent] = useState('');

  // 二次开发 / 新建工具模态框状态
  const [isToolEditorOpen, setIsToolEditorOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolItem | null>(null);
  const [toolModalSubTab, setToolModalSubTab] = useState<'code' | 'schema' | 'sandbox'>('code');

  // 编辑工具表单字段
  const [formToolName, setFormToolName] = useState('');
  const [formToolIdentifier, setFormToolIdentifier] = useState('');
  const [formToolCategory, setFormToolCategory] = useState<ToolItem['category']>('脚本运算');
  const [formToolLanguage, setFormToolLanguage] = useState<ToolItem['language']>('python');
  const [formToolDescription, setFormToolDescription] = useState('');
  const [formToolSchema, setFormToolSchema] = useState('');
  const [formToolSourceCode, setFormToolSourceCode] = useState('');
  const [formToolVersion, setFormToolVersion] = useState('v1.0.0');

  // 在线调试模拟状态
  const [sandboxInputArgs, setSandboxInputArgs] = useState('{\n  "code": "print(2 ** 10)"\n}');
  const [sandboxRunning, setSandboxRunning] = useState(false);
  const [sandboxOutput, setSandboxOutput] = useState<any | null>(null);

  // 复制文本至剪贴板
  const handleCopyText = (text: string, id: string, tip: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      showToast(tip);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // 持久化用户自定义提示词
  const handleSaveCustomPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newPrompt: PromptItem = {
      id: `prompt-custom-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      role: newRole.trim() || '自定义智能助手',
      description: newDesc.trim() || '用户自定义专享提示词',
      promptTemplate: newContent.trim(),
      tags: ['用户自定义'],
      isBuiltIn: false,
      usageCount: 1,
    };

    const updated = [newPrompt, ...customPrompts];
    setCustomPrompts(updated);
    try {
      localStorage.setItem(CUSTOM_PROMPTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    setNewTitle('');
    setNewRole('');
    setNewDesc('');
    setNewContent('');
    setIsCreatePromptModalOpen(false);
    showToast(`已成功创建自定义提示词《${newPrompt.title}》！`);
  };

  // 删除自定义提示词
  const handleDeleteCustomPrompt = (id: string, title: string) => {
    if (confirm(`确定要删除提示词《${title}》吗？`)) {
      const updated = customPrompts.filter((p) => p.id !== id);
      setCustomPrompts(updated);
      try {
        localStorage.setItem(CUSTOM_PROMPTS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      showToast('已删除提示词');
    }
  };

  // 打开工具二次开发编辑器
  const handleOpenToolEditor = (tool?: ToolItem) => {
    if (tool) {
      setEditingTool(tool);
      setFormToolName(tool.name);
      setFormToolIdentifier(tool.identifier);
      setFormToolCategory(tool.category);
      setFormToolLanguage(tool.language);
      setFormToolDescription(tool.description);
      setFormToolSchema(tool.parametersSchema);
      setFormToolSourceCode(tool.sourceCode);
      setFormToolVersion(tool.version);

      // 根据工具初始化示例测试入参
      if (tool.identifier === 'run_python_interpreter') {
        setSandboxInputArgs(JSON.stringify({ code: "import math\nresult = [math.sqrt(i) for i in [4, 9, 16, 25]]\nprint('计算完成:', result)", timeout_seconds: 5 }, null, 2));
      } else if (tool.identifier === 'fetch_and_clean_webpage') {
        setSandboxInputArgs(JSON.stringify({ url: "https://news.ycombinator.com", max_length: 2000 }, null, 2));
      } else if (tool.identifier === 'json_schema_validator') {
        setSandboxInputArgs(JSON.stringify({ raw_text: "```json\n{\"title\": \"示例任务\", \"status\": \"done\"}\n```", required_keys: ["title", "status"] }, null, 2));
      } else if (tool.identifier === 'csv_to_markdown_converter') {
        setSandboxInputArgs(JSON.stringify({ csv_data: "姓名,角色,当前阶段\n张三,架构师,需求评审\n李四,算法工程师,模型调优", delimiter: "," }, null, 2));
      } else if (tool.identifier === 'cron_expression_evaluator') {
        setSandboxInputArgs(JSON.stringify({ cron_expr: "*/10 * * * *", iterations: 3 }, null, 2));
      } else {
        setSandboxInputArgs('{\n  "query": "测试输入"\n}');
      }
    } else {
      // 新建空白工具
      setEditingTool(null);
      setFormToolName('');
      setFormToolIdentifier('');
      setFormToolCategory('脚本运算');
      setFormToolLanguage('python');
      setFormToolDescription('');
      setFormToolSchema(JSON.stringify({ type: 'object', properties: { input: { type: 'string', description: '输入文本' } }, required: ['input'] }, null, 2));
      setFormToolSourceCode(`def custom_tool(input: str) -> dict:\n    """\n    自定义业务工具核心入口\n    """\n    return {\n        "status": "success",\n        "message": f"处理完成: {input}"\n    }\n`);
      setFormToolVersion('v1.0.0');
      setSandboxInputArgs(JSON.stringify({ input: "Hello World" }, null, 2));
    }
    setToolModalSubTab('code');
    setSandboxOutput(null);
    setIsToolEditorOpen(true);
  };

  // 保存工具二次开发结果
  const handleSaveTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formToolName.trim() || !formToolIdentifier.trim()) {
      alert('请填写工具名称与函数唯一标识符');
      return;
    }

    // 校验 JSON Schema 是否合法
    try {
      JSON.parse(formToolSchema);
    } catch (err: any) {
      alert('参数 JSON Schema 格式不合法，请检查 JSON 语法：' + err.message);
      setToolModalSubTab('schema');
      return;
    }

    const isNew = !editingTool;
    const nowStr = new Date().toISOString().split('T')[0];

    const updatedItem: ToolItem = {
      id: editingTool ? editingTool.id : `tool-custom-${Date.now()}`,
      name: formToolName.trim(),
      identifier: formToolIdentifier.trim().replace(/[^a-zA-Z0-9_]/g, '_'),
      category: formToolCategory,
      language: formToolLanguage,
      description: formToolDescription.trim(),
      parametersSchema: formToolSchema.trim(),
      sourceCode: formToolSourceCode.trim(),
      author: editingTool ? editingTool.author : '开发者专享',
      version: formToolVersion.trim() || 'v1.0.0',
      isCustom: true,
      updatedAt: nowStr,
    };

    let updatedList: ToolItem[];
    if (isNew) {
      updatedList = [updatedItem, ...toolsList];
    } else {
      updatedList = toolsList.map((t) => (t.id === updatedItem.id ? updatedItem : t));
    }

    setToolsList(updatedList);
    try {
      localStorage.setItem(CUSTOM_TOOLS_STORAGE_KEY, JSON.stringify(updatedList));
    } catch (e) {}

    setIsToolEditorOpen(false);
    showToast(isNew ? `已创建并装载工具《${updatedItem.name}》！` : `工具《${updatedItem.name}》二次开发代码已保存并生效！`);
  };

  // 重置内置工具为系统初始代码
  const handleResetTool = (toolId: string) => {
    const defaultOne = DEFAULT_TOOLS.find((t) => t.id === toolId);
    if (!defaultOne) return;
    if (confirm(`确定要将工具《${defaultOne.name}》还原为系统预置版本吗？您的二次开发修改将被重置。`)) {
      const updatedList = toolsList.map((t) => (t.id === toolId ? defaultOne : t));
      setToolsList(updatedList);
      try {
        localStorage.setItem(CUSTOM_TOOLS_STORAGE_KEY, JSON.stringify(updatedList));
      } catch (e) {}
      setIsToolEditorOpen(false);
      showToast(`已还原《${defaultOne.name}》为初始预置版本`);
    }
  };

  // 删除自定义工具
  const handleDeleteTool = (toolId: string, toolName: string) => {
    if (confirm(`确定要删除工具《${toolName}》吗？`)) {
      const updated = toolsList.filter((t) => t.id !== toolId);
      setToolsList(updated);
      try {
        localStorage.setItem(CUSTOM_TOOLS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      showToast(`已删除工具《${toolName}》`);
    }
  };

  // 模拟沙箱调试运行
  const handleRunSandboxTest = () => {
    let parsedArgs: any = {};
    try {
      parsedArgs = JSON.parse(sandboxInputArgs);
    } catch (err: any) {
      alert('测试入参必须是合法 JSON 格式！' + err.message);
      return;
    }

    setSandboxRunning(true);
    setSandboxOutput(null);

    setTimeout(() => {
      setSandboxRunning(false);
      // 简单根据工具与入参生成真实感仿真响应
      const id = formToolIdentifier;
      if (id === 'run_python_interpreter') {
        const codeText = parsedArgs.code || '';
        setSandboxOutput({
          status: 'success',
          execution_time_ms: 38,
          sandbox_engine: 'Python 3.11 Isolated Subprocess (UV)',
          stdout: codeText.includes('print') ? '执行输出: [2.0, 3.0, 4.0, 5.0]' : '',
          return_value: {
            result: '代码安全沙箱运行完成，内存占用 14.2 MB',
            variables_captured: { result: '[2.0, 3.0, 4.0, 5.0]' },
          },
        });
      } else if (id === 'fetch_and_clean_webpage') {
        setSandboxOutput({
          status: 'success',
          execution_time_ms: 124,
          url: parsedArgs.url || 'https://news.ycombinator.com',
          markdown_content: '### Hacker News Top Stories\n1. Show HN: Antigravity Code Agent\n2. Open-source LLM Reasoning Benchmarks (Score: 320)\n3. Python 3.14 Free-threading Speedup',
          truncated: false,
          char_count: 148,
        });
      } else if (id === 'json_schema_validator') {
        setSandboxOutput({
          status: 'success',
          execution_time_ms: 12,
          valid: true,
          repaired: true,
          cleaned_data: { title: '示例任务', status: 'done' },
          missing_keys: [],
        });
      } else if (id === 'csv_to_markdown_converter') {
        setSandboxOutput({
          status: 'success',
          execution_time_ms: 15,
          markdown_table: '| 姓名 | 角色 | 当前阶段 |\n| --- | --- | --- |\n| 张三 | 架构师 | 需求评审 |\n| 李四 | 算法工程师 | 模型调优 |',
        });
      } else if (id === 'cron_expression_evaluator') {
        setSandboxOutput({
          status: 'success',
          execution_time_ms: 8,
          expression: parsedArgs.cron_expr || '*/10 * * * *',
          human_readable: '每隔 10 分钟自动调度执行一次',
          next_runs_estimate: [
            new Date(Date.now() + 600000).toLocaleString(),
            new Date(Date.now() + 1200000).toLocaleString(),
            new Date(Date.now() + 1800000).toLocaleString(),
          ],
        });
      } else {
        setSandboxOutput({
          status: 'success',
          execution_time_ms: 22,
          echo_input: parsedArgs,
          response: `自定义工具 [${id}] 执行成功，返回模拟响应。`,
        });
      }
    }, 450);
  };

  // 综合提示词列表（内置 + 自定义）
  const allPrompts = useMemo(() => {
    return [...customPrompts, ...DEFAULT_PROMPTS];
  }, [customPrompts]);

  // 根据当前激活的 3 个 Tab 智能提供专属分类选项
  const categoryOptions = useMemo(() => {
    if (activeTab === 'tools') {
      return ['全部', '脚本运算', '网络检索', '结构校验', '数据处理', '图表生成'];
    }
    if (activeTab === 'skills') {
      return ['全部', '界面交互', '自动化', '设计创意', '工程规范', '数据智能'];
    }
    return ['全部', '工作复盘', '事件推进', '知识加工', '代码架构', '商业洞察'];
  }, [activeTab]);

  // 重置选中的分类当不在可用分类时
  useEffect(() => {
    if (!categoryOptions.includes(selectedCategory)) {
      setSelectedCategory('全部');
    }
  }, [activeTab, categoryOptions, selectedCategory]);

  // 筛选后的提示词列表
  const filteredPrompts = useMemo(() => {
    return allPrompts.filter((p) => {
      const matchSearch =
        !searchKeyword.trim() ||
        p.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        p.description.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        p.promptTemplate.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(searchKeyword.toLowerCase()));

      const matchCat = selectedCategory === '全部' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [allPrompts, searchKeyword, selectedCategory]);

  // 筛选后的 Skills 列表
  const filteredSkills = useMemo(() => {
    return DEFAULT_SKILLS.filter((s) => {
      const matchSearch =
        !searchKeyword.trim() ||
        s.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        s.identifier.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        s.description.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        s.tools.some((t) => t.toLowerCase().includes(searchKeyword.toLowerCase()));

      const matchCat = selectedCategory === '全部' || s.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [searchKeyword, selectedCategory]);

  // 筛选后的 Tools 列表
  const filteredTools = useMemo(() => {
    return toolsList.filter((t) => {
      const matchSearch =
        !searchKeyword.trim() ||
        t.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        t.identifier.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        t.description.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        t.sourceCode.toLowerCase().includes(searchKeyword.toLowerCase());

      const matchCat = selectedCategory === '全部' || t.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [toolsList, searchKeyword, selectedCategory]);

  // 语言图标与背景徽章辅助函数
  const getLanguageBadge = (lang: ToolItem['language']) => {
    switch (lang) {
      case 'python':
        return {
          label: 'Python',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
        };
      case 'typescript':
        return {
          label: 'TypeScript',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
        };
      case 'javascript':
        return {
          label: 'JavaScript',
          bg: 'bg-yellow-50 text-yellow-700 border-yellow-200',
          dot: 'bg-yellow-500',
        };
      default:
        return {
          label: 'Code',
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  return (
    <div className="w-full h-full min-h-[calc(100vh-56px)] flex flex-col bg-[#F7F8FA] p-4 sm:p-5 space-y-3.5">
      {/* Toast 提示浮窗 */}
      {toastMessage && (
        <div className="fixed top-5 right-8 z-50 px-4 py-2 rounded-xl bg-slate-900/95 text-white text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 顶部单行 Tab 栏导航与操作区 (无冗余大标题，极致整洁) */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* 左侧资源分类 Tab 切换按钮（仅保留3个Tab：提示词库、已装载技能、工具集） */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('prompts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'prompts'
                ? 'bg-white text-[#5146D8] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wand2 size={13} />
            <span>提示词库 (Prompts)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-50 text-[#5146D8] text-[10px] font-bold">
              {allPrompts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('skills')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'skills'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu size={13} className={activeTab === 'skills' ? 'text-emerald-600' : ''} />
            <span>已装载技能 (Skills)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
              {DEFAULT_SKILLS.length}
            </span>
          </button>

          {/* 新增工具 Tab 按钮 */}
          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'tools'
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench size={13} className={activeTab === 'tools' ? 'text-indigo-600' : ''} />
            <span>工具集 (Tools · 二次开发)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
              {toolsList.length}
            </span>
          </button>
        </div>

        {/* 右侧快捷新建操作 */}
        <div className="flex items-center gap-2">
          {activeTab === 'tools' ? (
            <button
              type="button"
              onClick={() => handleOpenToolEditor()}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>+ 新建开发工具</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreatePromptModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#5146D8] hover:bg-[#4338CA] text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>+ 新建自定义提示词</span>
            </button>
          )}
        </div>
      </div>

      {/* 搜索与多维分类筛选栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-3.5 py-2.5 rounded-xl border border-[#E5E7EB]">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:border-[#5146D8] transition-colors">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder={
              activeTab === 'tools'
                ? '搜索工具名称、标识符 (@identifier)、代码或说明...'
                : '搜索标题、角色、技能标识或内容...'
            }
            className="w-full text-xs bg-transparent outline-none placeholder:text-slate-400 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          <span className="text-slate-400 font-medium">分类过滤:</span>
          {categoryOptions.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-xs ${
                selectedCategory === cat
                  ? 'bg-[#5146D8] text-white font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 主体卡片栅格展示区 */}
      <div className="space-y-6">
        {/* ========================================================= */}
        {/* 1. 工具集 (Tools · 支持二次开发) 卡片区块 (activeTab 为 tools) */}
        {/* ========================================================= */}
        {activeTab === 'tools' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Wrench size={14} className="text-indigo-600" />
                <span>可被大模型调用并支持二次开发的工具库 (Tools · {filteredTools.length})</span>
              </span>
              <span className="text-[11px] text-slate-500">
                可复制标准 Function Calling Schema 注入对话，或在线编辑源码调试
              </span>
            </div>

            {filteredTools.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                未找到匹配的工具
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTools.map((tool) => {
                  const langBadge = getLanguageBadge(tool.language);
                  const isModified = tool.isCustom && DEFAULT_TOOLS.some((d) => d.id === tool.id);

                  return (
                    <div
                      key={tool.id}
                      className="bg-white p-4.5 rounded-2xl border border-[#E5E7EB] hover:border-indigo-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                    >
                      <div>
                        {/* 顶部标题与语言/分类徽章 */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="text-sm font-bold text-slate-900 truncate">
                                {tool.name}
                              </h3>
                              {isModified && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                                  已修改
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-indigo-600 font-semibold block mt-0.5">
                              @{tool.identifier}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${langBadge.bg}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${langBadge.dot}`} />
                              <span>{langBadge.label}</span>
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                              {tool.category}
                            </span>
                          </div>
                        </div>

                        {/* 工具 Docstring 提示词说明 */}
                        <p className="text-xs text-slate-600 mt-2.5 leading-relaxed line-clamp-2">
                          {tool.description}
                        </p>

                        {/* 入参 Schema 预览框 */}
                        <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <FileJson size={11} className="text-indigo-500" />
                              <span>参数规范 (Schema 摘要)</span>
                            </span>
                            <span className="font-mono">{tool.version}</span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-700 line-clamp-2 bg-white/70 p-1.5 rounded border border-slate-100">
                            {tool.parametersSchema}
                          </div>
                        </div>
                      </div>

                      {/* 底部功能栏 */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          {tool.isCustom && !DEFAULT_TOOLS.some((d) => d.id === tool.id) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTool(tool.id, tool.name)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="删除自定义工具"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {tool.author} · {tool.updatedAt || '预置'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* 复制标准 Function Schema */}
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyText(
                                JSON.stringify(
                                  {
                                    name: tool.identifier,
                                    description: tool.description,
                                    parameters: JSON.parse(tool.parametersSchema || '{}'),
                                  },
                                  null,
                                  2
                                ),
                                tool.id,
                                `已复制工具《${tool.name}》的 Function Calling Schema！`
                              )
                            }
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                            title="复制供大模型使用的 OpenAI / Claude 兼容工具定义"
                          >
                            {copiedId === tool.id ? (
                              <>
                                <Check size={11} className="text-emerald-600" />
                                <span className="text-emerald-600">已复制</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span>复制 Schema</span>
                              </>
                            )}
                          </button>

                          {/* 核心按钮：二次开发 / 调试 */}
                          <button
                            type="button"
                            onClick={() => handleOpenToolEditor(tool)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#5146D8] font-semibold flex items-center gap-1 cursor-pointer transition-colors text-[11px] border border-indigo-200 shadow-2xs"
                          >
                            <Code2 size={12} />
                            <span>二次开发 / 调试</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. Skill 技能卡片区块 (activeTab 为 skills) */}
        {/* ========================================================= */}
        {activeTab === 'skills' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Cpu size={14} className="text-emerald-600" />
                <span>当前环境已加载的核心技能 (Skills · {filteredSkills.length})</span>
              </span>
              <span className="text-[11px] text-slate-400">大模型可通过自然语言或 @skill 自动调度</span>
            </div>

            {filteredSkills.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                未找到匹配的 Skill 技能
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="bg-white p-4.5 rounded-2xl border border-[#E5E7EB] hover:border-emerald-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{skill.name}</h3>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                              {skill.version}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">
                            @{skill.identifier}
                          </span>
                        </div>

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                          {skill.category}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-2.5 leading-relaxed line-clamp-2">
                        {skill.description}
                      </p>

                      <div className="mt-3 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-500 space-y-1">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Terminal size={11} className="text-emerald-600" />
                          <span>触发时机：</span>
                        </div>
                        <p className="line-clamp-2 leading-snug">{skill.triggerCondition}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveSkillModal(skill)}
                        className="text-slate-500 hover:text-emerald-700 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink size={12} />
                        <span>查看规范详情</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(
                            skill.exampleInstruction,
                            skill.id,
                            `已复制技能《${skill.name}》的触发指令！`
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                      >
                        {copiedId === skill.id ? (
                          <>
                            <Check size={12} className="text-emerald-600" />
                            <span>已复制</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>复制指令</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. Prompts 提示词卡片区块 (activeTab 为 prompts) */}
        {/* ========================================================= */}
        {activeTab === 'prompts' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Wand2 size={14} className="text-[#5146D8]" />
                <span>高品质业务提示词资产库 (Prompts · {filteredPrompts.length})</span>
              </span>
              <span className="text-[11px] text-slate-400">支持一键复制或直接在智能体中运行体验</span>
            </div>

            {filteredPrompts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                未找到匹配的提示词模版
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="bg-white p-4.5 rounded-2xl border border-[#E5E7EB] hover:border-indigo-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {prompt.title}
                          </h3>
                          <span className="text-[11px] text-[#5146D8] font-medium block mt-0.5">
                            角色：{prompt.role}
                          </span>
                        </div>

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0 font-medium">
                          {prompt.category}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-2">
                        {prompt.description}
                      </p>

                      {/* Prompt 模版预览框 */}
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 font-mono text-[11px] text-slate-700 line-clamp-4 whitespace-pre-wrap leading-relaxed select-all">
                        {prompt.promptTemplate}
                      </div>

                      {/* 标签 */}
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        {prompt.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-medium"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {!prompt.isBuiltIn && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomPrompt(prompt.id, prompt.title)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="删除自定义提示词"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        <span className="text-[10px] text-slate-400">
                          引用 {prompt.usageCount || 100}+ 次
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              prompt.promptTemplate,
                              prompt.id,
                              `已复制提示词《${prompt.title}》！`
                            )
                          }
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                        >
                          {copiedId === prompt.id ? (
                            <>
                              <Check size={12} className="text-emerald-600" />
                              <span className="text-emerald-600">已复制</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>复制</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToChat) {
                              onNavigateToChat(prompt.promptTemplate);
                            } else {
                              handleCopyText(
                                prompt.promptTemplate,
                                prompt.id,
                                '已复制！请前往对话智能体粘贴体验。'
                              );
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#5146D8] hover:bg-[#4338CA] text-white font-medium flex items-center gap-1 cursor-pointer transition-colors text-[11px] shadow-2xs"
                        >
                          <Play size={11} fill="currentColor" />
                          <span>在对话中运行</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 工具二次开发与在线沙箱调试工作台弹窗 (ToolEditorModal) */}
      {/* ========================================================= */}
      {isToolEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-3xl max-h-[92vh] flex flex-col space-y-4 animate-in zoom-in-95 duration-150 text-left overflow-hidden">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Code2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingTool ? `二次开发工具：《${editingTool.name}》` : '新建自定义大模型扩展工具'}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">
                    支持实时修改源码、重构入参 Schema 并进行沙箱模拟调试
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsToolEditorOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* 表单与编辑主体区域 (带纵向滚动) */}
            <form onSubmit={handleSaveTool} className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
              {/* 基础元数据配置 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    工具名称 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formToolName}
                    onChange={(e) => setFormToolName(e.target.value)}
                    placeholder="如：Python 沙箱代码执行器"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    函数标识符 (Function Calling ID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formToolIdentifier}
                    onChange={(e) => setFormToolIdentifier(e.target.value)}
                    placeholder="如：run_python_interpreter"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-indigo-700 text-xs font-semibold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">实现语言</label>
                    <select
                      value={formToolLanguage}
                      onChange={(e) => setFormToolLanguage(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 text-xs"
                    >
                      <option value="python">Python 3</option>
                      <option value="typescript">TypeScript</option>
                      <option value="javascript">JavaScript</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">业务分类</label>
                    <select
                      value={formToolCategory}
                      onChange={(e) => setFormToolCategory(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 text-xs"
                    >
                      <option value="脚本运算">脚本运算</option>
                      <option value="网络检索">网络检索</option>
                      <option value="结构校验">结构校验</option>
                      <option value="数据处理">数据处理</option>
                      <option value="图表生成">图表生成</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 工具 Docstring 提示词 (决定大模型何时调用该工具) */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  大模型调用描述 (Docstring / Description){' '}
                  <span className="text-slate-400 font-normal">（大模型理解该工具核心用途的关键提示词）</span>
                </label>
                <textarea
                  value={formToolDescription}
                  onChange={(e) => setFormToolDescription(e.target.value)}
                  placeholder="详细说明该工具的适用范围、入参含义与注意事项..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 text-xs resize-none leading-relaxed"
                  required
                />
              </div>

              {/* 工作台子 Tab 切换：源码编辑 / Schema 规范 / 沙箱调试 */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="bg-slate-100/80 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setToolModalSubTab('code')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        toolModalSubTab === 'code'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileCode size={13} />
                      <span>源码实现 ({formToolLanguage})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setToolModalSubTab('schema')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        toolModalSubTab === 'schema'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileJson size={13} />
                      <span>入参 JSON Schema</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setToolModalSubTab('sandbox')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        toolModalSubTab === 'sandbox'
                          ? 'bg-white text-emerald-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <PlayCircle size={13} className="text-emerald-600" />
                      <span>在线调试与模拟 (Sandbox)</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400">
                    {toolModalSubTab === 'code' && '支持实时二次开发与定制函数算法'}
                    {toolModalSubTab === 'schema' && '严格满足 OpenAPI 3.0 / JSON Schema 标准'}
                    {toolModalSubTab === 'sandbox' && '模拟大模型 Function Calling 输入与响应'}
                  </span>
                </div>

                <div className="p-3">
                  {/* Tab 1: 源码编辑器 */}
                  {toolModalSubTab === 'code' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>代码编辑区（支持直接修改函数体与依赖库）：</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {formToolSourceCode.split('\n').length} 行代码
                        </span>
                      </div>
                      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100">
                        <textarea
                          value={formToolSourceCode}
                          onChange={(e) => setFormToolSourceCode(e.target.value)}
                          rows={13}
                          spellCheck={false}
                          className="w-full p-3 font-mono text-xs bg-transparent text-emerald-400 focus:outline-none resize-none leading-relaxed selection:bg-indigo-700"
                        />
                      </div>
                    </div>
                  )}

                  {/* Tab 2: JSON Schema 编辑器 */}
                  {toolModalSubTab === 'schema' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Function Calling 参数定义规范 (JSON Schema)：</span>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const parsed = JSON.parse(formToolSchema);
                              setFormToolSchema(JSON.stringify(parsed, null, 2));
                              showToast('JSON 格式化成功');
                            } catch (e: any) {
                              alert('JSON 格式错误: ' + e.message);
                            }
                          }}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                        >
                          格式化 JSON
                        </button>
                      </div>
                      <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-900 text-slate-100">
                        <textarea
                          value={formToolSchema}
                          onChange={(e) => setFormToolSchema(e.target.value)}
                          rows={13}
                          spellCheck={false}
                          className="w-full p-3 font-mono text-xs bg-transparent text-amber-300 focus:outline-none resize-none leading-relaxed selection:bg-indigo-700"
                        />
                      </div>
                    </div>
                  )}

                  {/* Tab 3: 沙箱在线调试 */}
                  {toolModalSubTab === 'sandbox' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                            <span>模拟大模型输入参数 (JSON)：</span>
                          </div>
                          <textarea
                            value={sandboxInputArgs}
                            onChange={(e) => setSandboxInputArgs(e.target.value)}
                            rows={8}
                            spellCheck={false}
                            className="w-full p-2.5 font-mono text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 resize-none leading-relaxed"
                          />
                          <button
                            type="button"
                            onClick={handleRunSandboxTest}
                            disabled={sandboxRunning}
                            className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {sandboxRunning ? (
                              <>
                                <Zap size={13} className="animate-spin text-amber-300" />
                                <span>沙箱执行中...</span>
                              </>
                            ) : (
                              <>
                                <Play size={13} fill="currentColor" />
                                <span>⚡ 运行模拟测试与沙箱执行</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                            <span>沙箱执行结果反馈与日志：</span>
                            {sandboxOutput && (
                              <span className="text-[10px] text-emerald-600 font-mono">
                                耗时: {sandboxOutput.execution_time_ms}ms
                              </span>
                            )}
                          </div>
                          <div className="h-[210px] p-2.5 font-mono text-xs border border-slate-800 rounded-xl bg-slate-950 text-emerald-400 overflow-y-auto leading-relaxed select-all">
                            {sandboxOutput ? (
                              <pre className="whitespace-pre-wrap">{JSON.stringify(sandboxOutput, null, 2)}</pre>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-[11px]">
                                <Terminal size={20} className="mb-1 text-slate-600" />
                                <span>点击左侧「运行测试」按钮查看执行输出</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 弹窗底部操作按钮 */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  {editingTool && DEFAULT_TOOLS.some((d) => d.id === editingTool.id) && (
                    <button
                      type="button"
                      onClick={() => handleResetTool(editingTool.id)}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>还原为预置初始代码</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsToolEditorOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 font-medium text-xs transition-colors cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-[#5146D8] to-indigo-600 hover:from-[#4338CA] hover:to-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Check size={13} />
                    <span>保存更新并应用</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 查看 Skill 规格详情模态弹窗 */}
      {/* ========================================================= */}
      {activeSkillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg space-y-4 animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Cpu size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{activeSkillModal.name}</h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    @{activeSkillModal.identifier} · {activeSkillModal.version}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSkillModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-800">技能说明：</span>
                <p className="mt-1 leading-relaxed text-slate-600">{activeSkillModal.description}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-800">适用触发条件：</span>
                <p className="mt-1 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 leading-relaxed">
                  {activeSkillModal.triggerCondition}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-800">底层工具调用集：</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {activeSkillModal.tools.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-mono text-[11px] border border-emerald-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-800">示例唤起指令：</span>
                <div className="mt-1 p-2.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] leading-relaxed">
                  {activeSkillModal.exampleInstruction}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveSkillModal(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 font-medium text-xs transition-colors cursor-pointer"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCopyText(
                    activeSkillModal.exampleInstruction,
                    activeSkillModal.id,
                    '已复制触发示例指令！'
                  );
                  setActiveSkillModal(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Copy size={13} />
                <span>复制触发指令</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 新建自定义提示词模态弹窗 */}
      {/* ========================================================= */}
      {isCreatePromptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg space-y-4 animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus size={16} className="text-[#5146D8]" />
                <span>新建自定义业务提示词</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCreatePromptModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomPrompt} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  提示词标题 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如：市场竞品功能对比分析模版"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">业务分类</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 text-xs"
                  >
                    <option value="工作复盘">工作复盘</option>
                    <option value="事件推进">事件推进</option>
                    <option value="知识加工">知识加工</option>
                    <option value="代码架构">代码架构</option>
                    <option value="商业洞察">商业洞察</option>
                    <option value="自定义">自定义</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">适用 Agent 角色</label>
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="例如：资深竞品调研专家"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">简要描述</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="用一句话说明该提示词的核心应用场景"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Prompt 核心模版内容 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="输入详细的系统级提示词，支持使用 {variable} 占位符..."
                  rows={6}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 text-xs font-mono resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatePromptModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 font-medium text-xs transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5146D8] hover:bg-[#4338CA] text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Check size={13} />
                  <span>保存并沉淀到提示词库</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
