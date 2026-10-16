import React, { useState, useCallback, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Highlight } from "@tiptap/extension-highlight";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { TextAlign } from "@tiptap/extension-text-align";
import { Image as TiptapImage } from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Placeholder } from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Minus, ImageIcon, Table as TableIcon, Type, Palette,
  Sparkles, Wand2, Expand, FileText, Pencil, X
} from "lucide-react";

// ==================== 类型定义 ====================
export interface TiptapEditorRef {
  getHTML: () => string;
  getText: () => string;
  isEmpty: () => boolean;
}

interface TiptapEditorProps {
  placeholder?: string;
  initialContent?: string;
}

// ==================== 颜色预设 ====================
const TEXT_COLORS = [
  { name: "默认", value: "#dae2fd" },
  { name: "白色", value: "#ffffff" },
  { name: "琥珀", value: "#f59e0b" },
  { name: "红色", value: "#ef4444" },
  { name: "绿色", value: "#10b981" },
  { name: "蓝色", value: "#3b82f6" },
  { name: "紫色", value: "#a855f7" },
  { name: "粉色", value: "#ec4899" },
];

const HIGHLIGHT_COLORS = [
  { name: "黄色", value: "#fef08a" },
  { name: "绿色", value: "#bbf7d0" },
  { name: "蓝色", value: "#bfdbfe" },
  { name: "紫色", value: "#e9d5ff" },
  { name: "粉色", value: "#fce7f3" },
  { name: "橙色", value: "#fed7aa" },
];


// ==================== 图片上传辅助函数 ====================
const handleImageUpload = (editor: any) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async (e: any) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("file", file);
      try {
        const token = localStorage.getItem("stars:token");
        const res = await fetch("/api/upload/image", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          const url = data.data?.url || data.url;
          if (url) {
            editor.chain().focus().setImage({ src: url }).run();
          }
        } else {
          alert("图片上传失败");
        }
      } catch (err) {
        console.error("Image upload failed", err);
        alert("网络错误，图片上传失败");
      }
    }
  };
  input.click();
};

// ==================== 斜杠命令定义 ====================
interface SlashCommand {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: (editor: any) => void;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { title: "正文", description: "普通段落文本", icon: <Type className="w-4 h-4" />,
    action: (e: any) => e.chain().focus().setParagraph().run() },
  { title: "一级标题", description: "大标题", icon: <Heading1 className="w-4 h-4" />,
    action: (e: any) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { title: "二级标题", description: "中标题", icon: <Heading2 className="w-4 h-4" />,
    action: (e: any) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { title: "三级标题", description: "小标题", icon: <Heading3 className="w-4 h-4" />,
    action: (e: any) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { title: "无序列表", description: "项目符号列表", icon: <List className="w-4 h-4" />,
    action: (e: any) => e.chain().focus().toggleBulletList().run() },
  { title: "有序列表", description: "编号列表", icon: <ListOrdered className="w-4 h-4" />,
    action: (e: any) => e.chain().focus().toggleOrderedList().run() },
  { title: "待办事项", description: "可勾选的任务列表", icon: <CheckSquare className="w-4 h-4" />,
    action: (e: any) => e.chain().focus().toggleTaskList().run() },
  { title: "引用", description: "引用块", icon: <Quote className="w-4 h-4" />,
    action: (e: any) => e.chain().focus().toggleBlockquote().run() },
  { title: "分割线", description: "水平分割线", icon: <Minus className="w-4 h-4" />,
    action: (e: any) => e.chain().focus().setHorizontalRule().run() },
  { title: "表格", description: "插入3×3表格", icon: <TableIcon className="w-4 h-4" />,
    action: (e: any) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: "图片", description: "上传本地图片", icon: <ImageIcon className="w-4 h-4" />, action: (e: any) => handleImageUpload(e) },
];

// ==================== 斜杠命令菜单组件 ====================
function SlashCommandMenu({ editor, query, onClose }: { editor: any; query: string; onClose: () => void }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = SLASH_COMMANDS.filter(
    (cmd) => cmd.title.includes(query) || cmd.description.includes(query)
  );

  const handleSelect = useCallback((cmd: SlashCommand) => {
    // 删除输入的 "/" 和搜索文本
    const { from } = editor.state.selection;
    const deleteFrom = from - query.length - 1;
    editor.chain().focus().deleteRange({ from: deleteFrom, to: from }).run();
    cmd.action(editor);
    onClose();
  }, [editor, query, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) handleSelect(filtered[selectedIndex]);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filtered, selectedIndex, handleSelect, onClose]);

  if (filtered.length === 0) {
    return (
      <div className="slash-menu">
        <div className="slash-menu-empty">没有匹配的命令</div>
      </div>
    );
  }

  return (
    <div className="slash-menu">
      <div className="slash-menu-header">命令菜单</div>
      {filtered.map((cmd, idx) => (
        <button
          key={cmd.title}
          className={`slash-menu-item ${idx === selectedIndex ? "active" : ""}`}
          onClick={() => handleSelect(cmd)}
          onMouseEnter={() => setSelectedIndex(idx)}
        >
          <div className="slash-menu-icon">{cmd.icon}</div>
          <div className="slash-menu-text">
            <span className="slash-menu-title">{cmd.title}</span>
            <span className="slash-menu-desc">{cmd.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ==================== 气泡菜单组件（手动实现）====================
function CustomBubbleMenu({ editor }: { editor: any }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const updateMenu = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty || from === to) {
        setVisible(false);
        return;
      }

      // 获取选中文字的坐标
      const coords = editor.view.coordsAtPos(from);
      const editorElement = editor.view.dom.closest('.tiptap-editor-wrapper');
      if (!editorElement) return;

      const editorRect = editorElement.getBoundingClientRect();
      setPos({
        top: coords.top - editorRect.top - 48,
        left: Math.max(0, coords.left - editorRect.left),
      });
      setVisible(true);
      setShowColorPicker(false);
      setShowHighlightPicker(false);
      setShowAiMenu(false);
    };

    editor.on("selectionUpdate", updateMenu);
    editor.on("blur", () => {
      // 延迟隐藏，给菜单按钮点击留时间
      setTimeout(() => setVisible(false), 200);
    });

    return () => {
      editor.off("selectionUpdate", updateMenu);
    };
  }, [editor]);

  // AI Mock 操作
  const handleAiAction = (action: string) => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    if (!selectedText) return;

    let result = selectedText;
    switch (action) {
      case "polish": result = `${selectedText}（已润色）`; break;
      case "expand": result = `${selectedText}。更深入地说，这一点在实践中具有重要的指导意义，值得进一步思考。`; break;
      case "summarize": result = `【摘要】${selectedText.slice(0, 30)}...`; break;
      case "rewrite": result = `${selectedText}（已改写）`; break;
    }
    editor.chain().focus().deleteRange({ from, to }).insertContent(result).run();
    setShowAiMenu(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div ref={menuRef} className="bubble-menu" style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 50 }}>
      <button onClick={() => editor.chain().focus().toggleBold().run()}
        className={`bm-btn ${editor.isActive("bold") ? "active" : ""}`} title="粗体">
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`bm-btn ${editor.isActive("italic") ? "active" : ""}`} title="斜体">
        <Italic className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`bm-btn ${editor.isActive("underline") ? "active" : ""}`} title="下划线">
        <UnderlineIcon className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`bm-btn ${editor.isActive("strike") ? "active" : ""}`} title="删除线">
        <Strikethrough className="w-3.5 h-3.5" />
      </button>

      <div className="bm-divider" />

      {/* 高亮 */}
      <div className="relative">
        <button onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); setShowAiMenu(false); }}
          className={`bm-btn ${editor.isActive("highlight") ? "active" : ""}`} title="高亮">
          <Highlighter className="w-3.5 h-3.5" />
        </button>
        {showHighlightPicker && (
          <div className="color-picker-popup">
            {HIGHLIGHT_COLORS.map((c) => (
              <button key={c.value} title={c.name}
                onClick={() => { editor.chain().focus().toggleHighlight({ color: c.value }).run(); setShowHighlightPicker(false); }}
                className="color-dot" style={{ backgroundColor: c.value }} />
            ))}
            <button onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false); }}
              className="color-dot-clear" title="清除"><X className="w-3 h-3" /></button>
          </div>
        )}
      </div>

      {/* 文字颜色 */}
      <div className="relative">
        <button onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); setShowAiMenu(false); }}
          className="bm-btn" title="文字颜色">
          <Palette className="w-3.5 h-3.5" />
        </button>
        {showColorPicker && (
          <div className="color-picker-popup">
            {TEXT_COLORS.map((c) => (
              <button key={c.value} title={c.name}
                onClick={() => { editor.chain().focus().setColor(c.value).run(); setShowColorPicker(false); }}
                className="color-dot" style={{ backgroundColor: c.value }} />
            ))}
            <button onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }}
              className="color-dot-clear" title="重置"><X className="w-3 h-3" /></button>
          </div>
        )}
      </div>

      <div className="bm-divider" />

      {/* AI 操作 */}
      <div className="relative">
        <button onClick={() => { setShowAiMenu(!showAiMenu); setShowColorPicker(false); setShowHighlightPicker(false); }}
          className="bm-btn bm-ai-btn" title="AI 助手">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[11px] ml-1">AI</span>
        </button>
        {showAiMenu && (
          <div className="ai-menu-popup">
            <button onClick={() => handleAiAction("polish")} className="ai-menu-item">
              <Wand2 className="w-3.5 h-3.5" /><span>AI 润色</span>
            </button>
            <button onClick={() => handleAiAction("expand")} className="ai-menu-item">
              <Expand className="w-3.5 h-3.5" /><span>AI 扩写</span>
            </button>
            <button onClick={() => handleAiAction("summarize")} className="ai-menu-item">
              <FileText className="w-3.5 h-3.5" /><span>AI 总结</span>
            </button>
            <button onClick={() => handleAiAction("rewrite")} className="ai-menu-item">
              <Pencil className="w-3.5 h-3.5" /><span>AI 改写</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 主编辑器组件 ====================
const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(
  ({ placeholder = "开始记录你的想法... 输入 / 唤起命令菜单", initialContent = "" }, ref) => {
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });
    const [slashQuery, setSlashQuery] = useState("");
    const editorContainerRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Underline,
        Highlight.configure({ multicolor: true }),
        Color,
        TextStyle,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        TiptapImage.configure({ inline: false, allowBase64: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader,
        TaskList,
        TaskItem.configure({ nested: true }),
        Placeholder.configure({ placeholder }),
      ],
      content: initialContent,
      editorProps: {
        attributes: {
          class: "tiptap-prosemirror",
        },
        handleKeyDown: (_view, event) => {
          if (event.key === "/" && !showSlashMenu) {
            setTimeout(() => {
              const coords = _view.coordsAtPos(_view.state.selection.from);
              const container = editorContainerRef.current;
              if (container) {
                const rect = container.getBoundingClientRect();
                setSlashMenuPos({
                  top: coords.bottom - rect.top + 4,
                  left: coords.left - rect.left,
                });
              }
              setSlashQuery("");
              setShowSlashMenu(true);
            }, 10);
            return false;
          }
          return false;
        },
      },
      onUpdate: ({ editor: e }) => {
        if (showSlashMenu) {
          const { from } = e.state.selection;
          const textBefore = e.state.doc.textBetween(Math.max(0, from - 20), from);
          const slashIdx = textBefore.lastIndexOf("/");
          if (slashIdx === -1) {
            setShowSlashMenu(false);
          } else {
            setSlashQuery(textBefore.slice(slashIdx + 1));
          }
        }
      },
    });

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || "",
      getText: () => editor?.getText() || "",
      isEmpty: () => !editor?.getText().trim() && !editor?.getHTML().includes("<img"),
    }));

    if (!editor) return null;

    return (
      <div ref={editorContainerRef} className="tiptap-editor-wrapper">
        {/* 气泡菜单 — 选中文字时弹出 */}
        <CustomBubbleMenu editor={editor} />

        {/* 编辑区 */}
        <div className="tiptap-content-area">
          <EditorContent editor={editor} />
        </div>

        {/* 斜杠命令菜单 */}
        {showSlashMenu && (
          <div style={{ position: "absolute", top: slashMenuPos.top, left: slashMenuPos.left, zIndex: 50 }}>
            <SlashCommandMenu editor={editor} query={slashQuery} onClose={() => setShowSlashMenu(false)} />
          </div>
        )}

        {/* 底部固定工具栏 */}
        <div className="tiptap-toolbar">
          <button onClick={() => editor.chain().focus().toggleBold().run()}
            className={`tb-btn ${editor.isActive("bold") ? "active" : ""}`} title="粗体">
            <Bold className="w-4 h-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`tb-btn ${editor.isActive("italic") ? "active" : ""}`} title="斜体">
            <Italic className="w-4 h-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`tb-btn ${editor.isActive("underline") ? "active" : ""}`} title="下划线">
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <div className="tb-divider" />

          <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`tb-btn ${editor.isActive("heading", { level: 2 }) ? "active" : ""}`} title="标题">
            <Heading2 className="w-4 h-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`tb-btn ${editor.isActive("bulletList") ? "active" : ""}`} title="无序列表">
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`tb-btn ${editor.isActive("taskList") ? "active" : ""}`} title="待办事项">
            <CheckSquare className="w-4 h-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`tb-btn ${editor.isActive("blockquote") ? "active" : ""}`} title="引用">
            <Quote className="w-4 h-4" />
          </button>

          <div className="tb-divider" />

          <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="tb-btn" title="插入表格">
            <TableIcon className="w-4 h-4" />
          </button>
          <button onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="tb-btn" title="分割线">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={() => handleImageUpload(editor)} className="tb-btn" title="插入图片">
            <ImageIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }
);

TiptapEditor.displayName = "TiptapEditor";
export default TiptapEditor;
