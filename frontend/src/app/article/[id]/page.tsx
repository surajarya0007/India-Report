'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchArticleById, fetchNews, Article } from '../../../lib/api';
import { Clock, ChevronLeft, Share2, ExternalLink, BookOpen, TrendingUp } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const CAT_COLORS: Record<string, string> = {
  Tech: '#1565c0', Business: '#2e7d32', Finance: '#6a1b9a',
  Science: '#00695c', Health: '#ad1457', Entertainment: '#e65100',
  Politics: '#b71c1c', India: '#c62828', World: '#37474f', Default: '#455a64',
};
function catColor(cat?: string) { return CAT_COLORS[cat || ''] || CAT_COLORS.Default; }

// ─── Hero image placeholder ───────────────────────────────────────────────────

function ArticleHero({ article }: { article: Article }) {
  const cat = article.categories?.[0];
  const bg = catColor(cat);
  const [imgError, setImgError] = useState(false);
  const hasImage = !!article.imageUrl && !imgError;

  return (
    <div style={{
      width: '100%', height: 420,
      background: `linear-gradient(145deg, ${bg}ee 0%, ${bg}55 100%)`,
      position: 'relative', borderRadius: 4, overflow: 'hidden',
    }}>
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.imageUrl}
          alt={article.headline}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <>
          {/* Pattern overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.06) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 50%)',
          }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 120, fontWeight: 900, lineHeight: 1, fontFamily: 'Georgia, serif', userSelect: 'none' }}>IR</span>
          </div>
        </>
      )}
      {/* Category tags overlay at bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 32px', background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)' }}>
        {article.categories?.map(c => (
          <span key={c} style={{
            display: 'inline-block', background: catColor(c), color: '#fff',
            fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '3px 10px', borderRadius: 2, marginRight: 6,
          }}>{c}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Sentiment indicator ──────────────────────────────────────────────────────

function SentimentBadge({ s }: { s: string }) {
  const cfg = s === 'Positive' ? { bg: '#dcfce7', color: '#166534', dot: '#22c55e' }
    : s === 'Negative' ? { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' }
    : { bg: '#f3f4f6', color: '#374151', dot: '#9ca3af' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
      {s} Tone
    </span>
  );
}

// ─── Sidebar article card ─────────────────────────────────────────────────────

function SideCard({ article }: { article: Article }) {
  const router = useRouter();
  const [hov, setHov] = useState(false);
  const [imgError, setImgError] = useState(false);
  const cat = article.categories?.[0];
  const bg = catColor(cat);
  const hasImage = !!article.imageUrl && !imgError;
  return (
    <div
      onClick={() => router.push(`/article/${article.id}`)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: '1px solid #f2f2f2', cursor: 'pointer' }}
    >
      <div style={{ flexShrink: 0, width: 72, height: 54, borderRadius: 3, overflow: 'hidden', background: `linear-gradient(135deg, ${bg}cc, ${bg}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.imageUrl} alt={article.headline} onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 22, fontWeight: 900, fontFamily: 'Georgia, serif' }}>IR</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {cat && <span style={{ fontSize: 9, fontWeight: 800, color: bg, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{cat}</span>}
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 13, fontWeight: 700, lineHeight: 1.35, marginTop: 3,
          color: hov ? '#c62828' : '#111', transition: 'color 0.15s',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {article.headline}
        </p>
        <div style={{ fontSize: 11, color: '#bbb', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
          <Clock style={{ width: 10, height: 10 }} />
          {timeAgo(article.createdAt)}
        </div>
      </div>
    </div>
  );
}

// ─── Article body renderer ────────────────────────────────────────────────────

function ArticleBody({ text }: { text: string }) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  if (paragraphs.length <= 1) {
    // Fallback: split summary by 3-sentence chunks
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    const paras: string[][] = [];
    for (let i = 0; i < sentences.length; i += 3) {
      paras.push(sentences.slice(i, i + 3));
    }
    return (
      <div>
        {paras.map((para, i) => (
          <p key={i} style={{
            fontSize: 17, lineHeight: 1.85, color: '#222',
            marginBottom: 22,
            fontFamily: "'Source Serif 4', Georgia, serif",
          }}>
            {para.join(' ')}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div>
      {paragraphs.map((para, i) => (
        <p key={i} style={{
          fontSize: 17, lineHeight: 1.85, color: '#222',
          marginBottom: 22,
          fontFamily: "'Source Serif 4', Georgia, serif",
        }}>
          {para}
        </p>
      ))}
    </div>
  );
}

// ─── Article Detail Page ──────────────────────────────────────────────────────

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([fetchArticleById(id), fetchNews()]).then(([art, all]) => {
      setArticle(art);
      // Related: same category, excluding current article
      if (art) {
        const cats = art.categories || [];
        const rel = all.filter(a => a.id !== id && a.categories?.some(c => cats.includes(c))).slice(0, 6);
        setRelated(rel.length > 0 ? rel : all.filter(a => a.id !== id).slice(0, 6));
      }
      setLoading(false);
    });
  }, [id]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <TopBar onBack={() => router.push('/')} />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, gap: 12 }}>
          <div style={{ width: 36, height: 36, border: '3px solid #c62828', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 14, color: '#888' }}>Loading story…</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!article) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <TopBar onBack={() => router.push('/')} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
          <BookOpen style={{ width: 40, height: 40, color: '#ddd' }} />
          <p style={{ fontSize: 16, color: '#888', fontWeight: 600 }}>Article not found</p>
          <button onClick={() => router.push('/')}
            style={{ marginTop: 8, padding: '8px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 13 }}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const sentimentColor = article.sentiment === 'Positive' ? '#22c55e' : article.sentiment === 'Negative' ? '#ef4444' : '#9ca3af';

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Inter', Arial, sans-serif" }}>
      <TopBar onBack={() => router.push('/')} />

      {/* Breadcrumb */}
      <div style={{ background: '#f8f8f8', borderBottom: '1px solid #ebebeb' }}>
        <div style={{ maxWidth: 1260, margin: '0 auto', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 0 }}>News</button>
          <span>›</span>
          {article.categories?.[0] && (
            <>
              <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 0 }}>{article.categories[0]}</button>
              <span>›</span>
            </>
          )}
          <span style={{ color: '#444', fontWeight: 500 }} className="truncate">{article.headline.slice(0, 60)}…</span>
        </div>
      </div>

      {/* Main layout: article body (left+center) + sidebar (right) */}
      <div style={{ maxWidth: 1260, margin: '0 auto', padding: '32px 20px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '0 40px', alignItems: 'start' }}>

        {/* ── Article column ───────────────────────────────────────────────── */}
        <article>
          {/* Categories */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {article.categories?.map(c => (
              <span key={c} style={{ display: 'inline-block', background: catColor(c), color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 2 }}>{c}</span>
            ))}
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 36, fontWeight: 900, lineHeight: 1.2, color: '#111', marginBottom: 16 }}>
            {article.headline}
          </h1>

          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #ebebeb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>IR</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>India Reports</div>
                <div style={{ fontSize: 11, color: '#999' }}>{article.sourceName}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}>
              <Clock style={{ width: 12, height: 12 }} />
              <span>{formatDate(article.createdAt)}</span>
            </div>
            <SentimentBadge s={article.sentiment} />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                onClick={handleShare}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1px solid #ddd', borderRadius: 3, background: '#fff', cursor: 'pointer', fontSize: 12, color: '#444', transition: 'all 0.2s' }}
              >
                <Share2 style={{ width: 13, height: 13 }} />
                {copied ? 'Copied!' : 'Share'}
              </button>
              <a
                href={article.sourceUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1px solid #111', borderRadius: 3, background: '#111', color: '#fff', fontSize: 12, textDecoration: 'none' }}
              >
                <ExternalLink style={{ width: 13, height: 13 }} />
                Source
              </a>
            </div>
          </div>

          {/* Hero image */}
          <div style={{ marginBottom: 28 }}>
            <ArticleHero article={article} />
          </div>

          {/* Article body */}
          <div style={{ maxWidth: 720 }}>
            <ArticleBody text={article.content || article.summary} />

            {/* Source attribution */}
            <div style={{ marginTop: 28, padding: '14px 18px', background: '#f8f8f8', borderLeft: '3px solid #c62828', borderRadius: '0 3px 3px 0' }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Original source</div>
              <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: '#1565c0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                {article.sourceName}
                <ExternalLink style={{ width: 12, height: 12 }} />
              </a>
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{article.sourceUrl}</div>
            </div>
          </div>
        </article>

        {/* ── Right Sidebar ────────────────────────────────────────────────── */}
        <aside style={{ position: 'sticky', top: 20 }}>
          {/* Related news */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: '2px solid #111' }}>
              <TrendingUp style={{ width: 16, height: 16, color: '#c62828' }} />
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 800, color: '#111' }}>Related News</h3>
            </div>
            {related.length === 0 && <p style={{ fontSize: 12, color: '#bbb' }}>No related stories found.</p>}
            {related.map(a => <SideCard key={a.id} article={a} />)}
          </div>

          {/* AI notice */}
          <div style={{ background: '#f8f8f8', borderRadius: 4, padding: '14px 16px', border: '1px solid #ebebeb' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>AI Synthesized</div>
            <p style={{ fontSize: 12, color: '#777', lineHeight: 1.6 }}>
              This summary was generated by Gemini 1.5 Flash from the original article. Read the full story at the source.
            </p>
            <div style={{ marginTop: 10, display: 'flex', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', marginTop: 2 }} />
              <span style={{ fontSize: 11, color: '#999' }}>Pipeline active · Updated every 15 min</span>
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px; }
      `}</style>
    </div>
  );
}

// ─── Top Navigation Bar (shared) ─────────────────────────────────────────────

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1260, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#444', fontSize: 13, fontWeight: 500, padding: '6px 0' }}>
          <ChevronLeft style={{ width: 18, height: 18 }} />
          Back
        </button>

        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {['I', 'R'].map((l, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: '#111', color: '#fff', fontWeight: 900, fontSize: 15, fontFamily: 'Georgia, serif' }}>{l}</span>
            ))}
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em', color: '#111', marginLeft: 8 }}>
              INDIA REPORTS
            </span>
          </div>
        </button>

        <div style={{ width: 80 }} /> {/* spacer to center logo */}
      </div>
    </header>
  );
}
