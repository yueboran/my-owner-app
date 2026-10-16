import React, { useState } from 'react';
import { Bot, RefreshCcw, Sparkles, FileText, CheckCircle2, AlertCircle, ArrowRight, Lightbulb, Compass, Zap } from 'lucide-react';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? '/api';

export default function AnalysisView() {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/analysis/run`, {
        method: 'POST',
      });
      const result = await response.json();
      if (response.ok) {
        setReport(result.data?.report || '没有返回报告。');
      } else {
        setError(result.message || '生成报告时发生错误');
      }
    } catch (err: any) {
      setError(err.message || '网络连接错误，请检查后端服务是否启动');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="analysis-view" style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', padding: '8px 0 60px' }}>
      {/* 头部标题与操作区 */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '28px',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--day-line, #d9e3e6)'
      }}>
        <div>
          <p className="eyebrow" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            color: 'var(--accent, #147a70)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            margin: '0 0 8px'
          }}>
            <Bot size={15} /> OPENCODE AI 智能体
          </p>
          <h1 style={{
            margin: 0,
            fontSize: 'clamp(24px, 2.5vw, 30px)',
            fontWeight: 650,
            color: 'var(--text, #17242d)',
            letterSpacing: '-0.02em'
          }}>
            项目知识图谱与全局洞察
          </h1>
          <p style={{
            margin: '8px 0 0',
            color: 'var(--text-muted, #526672)',
            fontSize: '13px',
            lineHeight: 1.6,
            maxWidth: '680px'
          }}>
            自动读取当前知识图谱实体、结合历史分析报告与代码库上下文，由 OpenCode 智能体生成结构化深度洞察。
          </p>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 22px',
            borderRadius: '10px',
            border: '1px solid var(--accent, #147a70)',
            background: loading ? '#0e655d' : 'var(--accent, #147a70)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '13px',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(20, 122, 112, 0.25)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!loading) (e.currentTarget as HTMLElement).style.background = 'var(--accent-strong, #0e655d)';
          }}
          onMouseLeave={(e) => {
            if (!loading) (e.currentTarget as HTMLElement).style.background = 'var(--accent, #147a70)';
          }}
        >
          {loading ? (
            <RefreshCcw size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          <span>{loading ? '智能体深度分析中...' : '生成洞察报告'}</span>
        </button>
      </div>

      {/* 快捷指标栏 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'var(--surface, #ffffff)',
          border: '1px solid var(--day-line, #d9e3e6)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(31, 54, 65, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '9px',
            background: 'rgba(20, 122, 112, 0.1)',
            color: 'var(--accent, #147a70)',
            display: 'grid',
            placeItems: 'center'
          }}>
            <Compass size={19} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-quiet, #748690)', fontWeight: 500 }}>分析模式</div>
            <div style={{ fontSize: '13px', color: 'var(--text, #17242d)', fontWeight: 650, marginTop: '2px' }}>全库图谱 + 历史洞察</div>
          </div>
        </div>

        <div style={{
          background: 'var(--surface, #ffffff)',
          border: '1px solid var(--day-line, #d9e3e6)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(31, 54, 65, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '9px',
            background: 'rgba(243, 182, 101, 0.15)',
            color: '#a45e18',
            display: 'grid',
            placeItems: 'center'
          }}>
            <Zap size={19} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-quiet, #748690)', fontWeight: 500 }}>模型配置</div>
            <div style={{ fontSize: '13px', color: 'var(--text, #17242d)', fontWeight: 650, marginTop: '2px' }}>.env 动态指定</div>
          </div>
        </div>

        <div style={{
          background: 'var(--surface, #ffffff)',
          border: '1px solid var(--day-line, #d9e3e6)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(31, 54, 65, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '9px',
            background: 'rgba(73, 109, 166, 0.12)',
            color: '#496da6',
            display: 'grid',
            placeItems: 'center'
          }}>
            <Lightbulb size={19} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-quiet, #748690)', fontWeight: 500 }}>目标产出</div>
            <div style={{ fontSize: '13px', color: 'var(--text, #17242d)', fontWeight: 650, marginTop: '2px' }}>结构化决策路标</div>
          </div>
        </div>
      </div>

      {/* 报告主容器 */}
      <div style={{
        background: 'var(--surface, #ffffff)',
        border: '1px solid var(--day-line, #d9e3e6)',
        borderRadius: '16px',
        padding: '32px clamp(20px, 4vw, 40px)',
        minHeight: '440px',
        boxShadow: 'var(--day-shadow, 0 14px 38px rgba(31, 54, 65, 0.08))',
        position: 'relative'
      }}>
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '24px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div>{error}</div>
          </div>
        )}

        {/* 初始空状态 */}
        {!report && !loading && !error && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '320px',
            textAlign: 'center',
            color: 'var(--text-quiet, #748690)',
            padding: '40px 20px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--surface-soft, #eaf1f2)',
              color: 'var(--accent, #147a70)',
              display: 'grid',
              placeItems: 'center',
              marginBottom: '16px'
            }}>
              <Bot size={32} />
            </div>
            <h3 style={{
              margin: '0 0 8px',
              color: 'var(--text, #17242d)',
              fontSize: '17px',
              fontWeight: 650
            }}>
              还没有生成报告
            </h3>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: 'var(--text-muted, #526672)',
              maxWidth: '420px',
              lineHeight: 1.6
            }}>
              点击右上角「生成洞察报告」按钮，OpenCode 智能体将读取当前知识图谱并结合上次分析生成全景研判。
            </p>
          </div>
        )}

        {/* 加载中状态 */}
        {loading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '340px',
            textAlign: 'center',
            color: 'var(--text-muted, #526672)',
            padding: '40px 20px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '3px solid #d9e3e6',
              borderTopColor: 'var(--accent, #147a70)',
              animation: 'spin 1s linear infinite',
              marginBottom: '20px'
            }} />
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <h4 style={{
              margin: '0 0 6px',
              fontSize: '16px',
              color: 'var(--text, #17242d)',
              fontWeight: 600
            }}>
              OpenCode 智能体正在解析知识库...
            </h4>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: 'var(--text-quiet, #748690)'
            }}>
              正在提取知识实体、融合 findings.md 与进度信息并请求所选模型
            </p>
          </div>
        )}

        {/* 报告渲染 */}
        {report && !loading && (
          <div className="report-markdown-body" style={{
            color: 'var(--text, #17242d)',
            fontSize: '14px',
            lineHeight: 1.8
          }}>
            {report.split('\n').map((line, idx) => {
              const trimmed = line.trim();

              if (trimmed.startsWith('### ')) {
                return (
                  <h3 key={idx} style={{
                    fontSize: '17px',
                    fontWeight: 650,
                    color: 'var(--text, #17242d)',
                    margin: '28px 0 12px',
                    paddingBottom: '6px',
                    borderBottom: '1px solid var(--day-line, #d9e3e6)'
                  }}>
                    {trimmed.replace('### ', '')}
                  </h3>
                );
              }

              if (trimmed.startsWith('## ')) {
                return (
                  <h2 key={idx} style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'var(--accent, #147a70)',
                    margin: '36px 0 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ width: '4px', height: '18px', background: 'var(--accent, #147a70)', borderRadius: '2px', display: 'inline-block' }} />
                    {trimmed.replace('## ', '')}
                  </h2>
                );
              }

              if (trimmed.startsWith('# ')) {
                return (
                  <h1 key={idx} style={{
                    fontSize: '24px',
                    fontWeight: 750,
                    color: 'var(--text, #17242d)',
                    margin: '16px 0 20px'
                  }}>
                    {trimmed.replace('# ', '')}
                  </h1>
                );
              }

              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const content = trimmed.substring(2);
                return (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    margin: '6px 0',
                    paddingLeft: '6px',
                    color: 'var(--text, #17242d)'
                  }}>
                    <span style={{ color: 'var(--accent, #147a70)', fontWeight: 'bold', marginTop: '-1px' }}>•</span>
                    <span style={{ flex: 1 }}>{renderFormattedText(content)}</span>
                  </div>
                );
              }

              if (trimmed.match(/^\d+\.\s/)) {
                const num = trimmed.match(/^(\d+)\.\s/)?.[1];
                const content = trimmed.replace(/^\d+\.\s/, '');
                return (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    margin: '8px 0',
                    paddingLeft: '6px',
                    color: 'var(--text, #17242d)'
                  }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'var(--accent-soft, rgba(20, 122, 112, 0.1))',
                      color: 'var(--accent, #147a70)',
                      fontSize: '11px',
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: '3px'
                    }}>
                      {num}
                    </span>
                    <span style={{ flex: 1 }}>{renderFormattedText(content)}</span>
                  </div>
                );
              }

              if (trimmed.startsWith('> ')) {
                return (
                  <blockquote key={idx} style={{
                    margin: '16px 0',
                    padding: '12px 18px',
                    borderLeft: '4px solid var(--accent, #147a70)',
                    background: 'var(--accent-soft, rgba(20, 122, 112, 0.08))',
                    borderRadius: '0 8px 8px 0',
                    color: 'var(--text, #17242d)',
                    fontSize: '13.5px',
                    fontStyle: 'normal'
                  }}>
                    {renderFormattedText(trimmed.substring(2))}
                  </blockquote>
                );
              }

              if (trimmed === '') {
                return <div key={idx} style={{ height: '10px' }} />;
              }

              return (
                <p key={idx} style={{
                  margin: '0 0 10px',
                  color: 'var(--text, #17242d)',
                  lineHeight: 1.75
                }}>
                  {renderFormattedText(line)}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function renderFormattedText(text: string) {
  // 处理加粗文本 **粗体**
  const parts = text.split(/(\*\*.*?\*\*)/);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} style={{
          color: 'var(--text, #17242d)',
          fontWeight: 700
        }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
