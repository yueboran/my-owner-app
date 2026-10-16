import React from 'react';

interface MarkdownViewProps {
  content: string;
  className?: string;
}

/**
 * 现代轻量 Markdown 格式化渲染组件
 * 将原始的 ###、**、列表、代码等转换为设计规范级语义标签
 */
export const MarkdownView: React.FC<MarkdownViewProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // 将文本按行分割并进行状态块解析
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      renderedElements.push(
        <ul key={`list-${listKey++}`} className="my-2 space-y-1 pl-4 list-disc marker:text-[#5146D8]">
          {currentList.map((item, idx) => (
            <li key={idx} className="text-[14px] leading-relaxed text-[#374151]">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  // 行内样式解析（**粗体**、`代码`、*斜体*）
  function renderInlineMarkdown(text: string): React.ReactNode {
    // 处理 **加粗**
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-[#171A21]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 mx-0.5 text-xs font-mono bg-slate-100 text-[#5146D8] rounded border border-slate-200"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  }

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();

    // 1. 无序列表（• 或 - 开头）
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      currentList.push(trimmed.slice(2));
      return;
    }

    // 遇到非列表行，先清空当前未渲染的列表
    flushList();

    // 2. 空行
    if (!trimmed) {
      renderedElements.push(<div key={`empty-${lineIndex}`} className="h-1.5" />);
      return;
    }

    // 3. 三级标题 ###
    if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h3
          key={`h3-${lineIndex}`}
          className="text-[15px] font-semibold text-[#171A21] mt-3 mb-1.5 tracking-tight"
        >
          {renderInlineMarkdown(trimmed.slice(4))}
        </h3>
      );
      return;
    }

    // 4. 二级标题 ##
    if (trimmed.startsWith('## ')) {
      renderedElements.push(
        <h2
          key={`h2-${lineIndex}`}
          className="text-[16px] font-semibold text-[#171A21] mt-3.5 mb-2 tracking-tight"
        >
          {renderInlineMarkdown(trimmed.slice(3))}
        </h2>
      );
      return;
    }

    // 5. 一级标题 #
    if (trimmed.startsWith('# ')) {
      renderedElements.push(
        <h1
          key={`h1-${lineIndex}`}
          className="text-[18px] font-semibold text-[#171A21] mt-4 mb-2 tracking-tight"
        >
          {renderInlineMarkdown(trimmed.slice(2))}
        </h1>
      );
      return;
    }

    // 6. 引用块 >
    if (trimmed.startsWith('> ')) {
      renderedElements.push(
        <blockquote
          key={`quote-${lineIndex}`}
          className="pl-3 py-1 my-2 border-l-2 border-[#5146D8] text-[13.5px] text-[#4B5563] bg-slate-50/60 rounded-r"
        >
          {renderInlineMarkdown(trimmed.slice(2))}
        </blockquote>
      );
      return;
    }

    // 7. 普通段落正文
    renderedElements.push(
      <p
        key={`p-${lineIndex}`}
        className="text-[14px] leading-relaxed text-[#374151] my-1 font-normal"
      >
        {renderInlineMarkdown(line)}
      </p>
    );
  });

  flushList();

  return <div className={`markdown-body select-text ${className}`}>{renderedElements}</div>;
};

export default MarkdownView;
