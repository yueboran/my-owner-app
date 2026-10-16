import { useEffect, useMemo, useState } from 'react';
import { ArrowUp, FileText, Lightbulb, Link2, MessageSquareQuote, Sparkles, WandSparkles, Bot, Search, Loader2 } from 'lucide-react';
import type { CaptureKind, Classification } from '../knowledgeTypes';
import { classifyLocally } from '../data/knowledgeData';

const kinds: Array<{ value: CaptureKind; label: string; icon: typeof Lightbulb }> = [
  { value: 'idea', label: '灵感', icon: Lightbulb },
  { value: 'link', label: '链接', icon: Link2 },
  { value: 'prompt', label: '提示词', icon: WandSparkles },
  { value: 'quote', label: '摘录', icon: MessageSquareQuote },
  { value: 'note', label: '笔记', icon: FileText },
];

interface QuickCaptureProps {
  onSave: (content: string, kind: CaptureKind, classification: Classification) => Promise<void>;
}

export default function QuickCapture({ onSave }: QuickCaptureProps) {
  const [content, setContent] = useState('');
  const [kind, setKind] = useState<CaptureKind>('idea');
  const [saving, setSaving] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const inferred = useMemo(() => content.trim() ? classifyLocally(content) : null, [content]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('quick-capture')?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const submit = async () => {
    if (!content.trim() || saving || aiProcessing) return;
    setSaving(true);
    try {
      await onSave(content.trim(), kind === 'idea' && inferred ? inferred.kind : kind, inferred ?? classifyLocally(content));
      setContent('');
      setKind('idea');
    } finally {
      setSaving(false);
    }
  };

  const handleAIFormat = async () => {
    if (!content.trim() || aiProcessing) return;
    setAiProcessing(true);
    try {
      const response = await fetch(`${(import.meta as any).env?.VITE_API_BASE_URL ?? '/api'}/knowledge/format`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (response.ok) {
        const data = await response.json();
        setContent(data.data.content);
      } else {
        // Fallback simulate AI formatting
        setContent(`【AI整理视角】\n${content}\n\n[摘要核心]: 待补充...`);
      }
    } catch {
        setContent(`【AI整理】\n- ${content.replace(/\n/g, '\n- ')}\n\n(离线模式: 简单的格式化处理)`);
    } finally {
      setAiProcessing(false);
    }
  };

  const handleWebSearch = async () => {
    if (!content.trim() || aiProcessing) return;
    setAiProcessing(true);
    try {
      const response = await fetch(`${(import.meta as any).env?.VITE_API_BASE_URL ?? '/api'}/knowledge/search`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: content })
      });
      if (response.ok) {
        const data = await response.json();
        setContent(`${content}\n\n[🔍 搜索补充]\n${data.data.results}`);
      } else {
        setContent(`${content}\n\n[🔍 联网搜索]: 未能获取更多信息...`);
      }
    } catch {
        setContent(`${content}\n\n[🔍 联网搜索]: 离线状态，无法搜索`);
    } finally {
      setAiProcessing(false);
    }
  };

  return (
    <section className="capture-orbit" aria-labelledby="capture-title">
      <div className="capture-head">
        <div>
          <p className="eyebrow"><Sparkles size={14} /> 瞬时捕捉 & AI 增强</p>
          <h1 id="capture-title">此刻，什么值得留下？</h1>
        </div>
        <kbd>⌘ K</kbd>
      </div>
      <div className="capture-input-wrap">
        <textarea
          id="quick-capture"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void submit();
          }}
          placeholder="粘贴链接、记下一句话，或让AI帮你自动整理格式与搜索扩充..."
          rows={5}
          aria-label="快速记录内容"
          disabled={aiProcessing || saving}
        />
        <div className="capture-actions">
          <button className="action-btn ai-format" onClick={handleAIFormat} disabled={!content.trim() || aiProcessing} title="使用 AI 结构化整理">
             {aiProcessing ? <Loader2 size={16} className="spin" /> : <Bot size={16} />} 
             <span>AI 整理</span>
          </button>
          <button className="action-btn web-search" onClick={handleWebSearch} disabled={!content.trim() || aiProcessing} title="根据输入搜索网页补充上下文">
             {aiProcessing ? <Loader2 size={16} className="spin" /> : <Search size={16} />} 
             <span>联网搜索</span>
          </button>
        </div>
        <button className="capture-submit" onClick={() => void submit()} disabled={!content.trim() || saving || aiProcessing} aria-label="保存灵感">
          {saving ? <Loader2 size={20} className="spin" /> : <ArrowUp size={20} />}
        </button>
      </div>
      <div className="capture-footer">
        <div className="kind-picker" aria-label="记录类型">
          {kinds.map(({ value, label, icon: Icon }) => (
            <button key={value} className={kind === value ? 'active' : ''} onClick={() => setKind(value)}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
        {inferred && (
          <div className="inference" title={inferred.reason}>
            <span className="pulse-dot" /> 自动归入 <strong>{inferred.category}</strong>
            <span>{Math.round(inferred.confidence * 100)}%</span>
          </div>
        )}
      </div>
    </section>
  );
}
