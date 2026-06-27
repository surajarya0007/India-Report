'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Loader2, MessageSquare, Search } from 'lucide-react';
import { chatWithRag, type RagSearchResult } from '../../lib/api';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  sources?: RagSearchResult[];
  suggestions?: string[];
}

const initialMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Ask me about anything covered by India Reports and I will answer using our internal articles only.',
};

export default function ChatClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const history = useMemo(
    () => messages.map((message) => ({ role: message.role, content: message.content })),
    [messages]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const submitQuery = async (text?: string) => {
    const prompt = (text ?? query).trim();
    if (!prompt || loading) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: prompt,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    const response = await chatWithRag({
      query: prompt,
      history,
      limit: 6,
    });

    const assistantMessage: ChatMessage = {
      id: `${Date.now()}-assistant`,
      role: 'assistant',
      content: response?.answer || 'I could not generate an answer right now.',
      suggestions: response?.suggestions || [],
      sources: response?.sources || [],
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setLoading(false);
  };

  return (
    <div className="ir-container" style={{ padding: '28px var(--container-padding) 40px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24, alignItems: 'start' }}>
        <section style={{ minHeight: '72vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-primary)', borderRadius: 8, background: 'var(--bg-primary)' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <MessageSquare style={{ width: 18, height: 18, color: 'var(--ir-crimson)' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-serif)', color: 'var(--color-ink)' }}>India Reports Chat</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-ink-muted)' }}>Closed-domain answers from our article archive.</p>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '90%',
                  borderRadius: 14,
                  padding: '12px 14px',
                  background: message.role === 'user' ? 'var(--ir-crimson)' : 'var(--bg-secondary)',
                  color: message.role === 'user' ? '#fff' : 'var(--color-ink)',
                  border: message.role === 'user' ? 'none' : '1px solid var(--border-primary)',
                  boxShadow: message.role === 'assistant' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontSize: 14 }}>{message.content}</div>

                {message.suggestions && message.suggestions.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {message.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => void submitQuery(suggestion)}
                        style={{
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: 999,
                          padding: '6px 10px',
                          fontSize: 12,
                          color: 'var(--color-ink)',
                          cursor: 'pointer',
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {message.sources && message.sources.length > 0 && (
                  <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                    {message.sources.slice(0, 4).map((source) => (
                      <a
                        key={`${message.id}-${source.articleId}-${source.chunkType}-${source.chunkPosition}`}
                        href={source.articleUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          textDecoration: 'none',
                          border: '1px solid var(--border-primary)',
                          background: 'var(--bg-primary)',
                          borderRadius: 8,
                          padding: '10px 12px',
                          color: 'var(--color-ink)',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{source.headline}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-ink-muted)', lineHeight: 1.4 }}>
                            {source.chunkContent.slice(0, 140)}
                          </div>
                        </div>
                        <ArrowUpRight style={{ width: 16, height: 16, flexShrink: 0, color: 'var(--color-ink-muted)' }} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite', color: 'var(--ir-crimson)' }} />
                <span style={{ fontSize: 13, color: 'var(--color-ink-muted)' }}>Looking through India Reports...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitQuery();
            }}
            style={{ borderTop: '1px solid var(--border-primary)', padding: 16, display: 'flex', gap: 10, alignItems: 'center' }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--color-ink-muted)' }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about a topic, person, company, or event..."
                className="ir-input"
                style={{ width: '100%', padding: '12px 14px 12px 38px', borderRadius: 999 }}
              />
            </div>
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="ir-btn-primary"
              style={{ width: 'auto', padding: '12px 18px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            >
              {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <MessageSquare style={{ width: 16, height: 16 }} />}
              Ask
            </button>
          </form>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 18, border: '1px solid var(--border-primary)', borderRadius: 8, background: 'var(--bg-secondary)' }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-ink)' }}>How it works</h2>
            <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7, color: 'var(--color-ink-muted)' }}>
              We search the unified vector index built from article headlines, summaries, and paragraphs. The answer stays inside India Reports content and points back to the matching story pages.
            </p>
          </div>

          <div style={{ padding: 18, border: '1px solid var(--border-primary)', borderRadius: 8, background: 'var(--bg-primary)' }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-ink)' }}>Example prompts</h2>
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              {[
                'What is the latest in India tech news?',
                'Summarize the most important health stories this week.',
                'Find articles about elections and policy changes.',
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => void submitQuery(sample)}
                  style={{
                    textAlign: 'left',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 8,
                    background: 'var(--bg-secondary)',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    color: 'var(--color-ink)',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
