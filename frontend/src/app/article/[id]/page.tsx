'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchArticleById, fetchNews, Article, enrichArticleById } from '../../../lib/api';
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

function AISummaryLoader() {
  return (
    <div style={{
      padding: '24px 28px',
      background: 'linear-gradient(135deg, #fbfbfb 0%, #f7f7f7 100%)',
      borderRadius: 8,
      border: '1px solid #ebebeb',
      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
      position: 'relative',
      overflow: 'hidden',
      margin: '10px 0 30px',
    }}>
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, #c62828 0%, #1565c0 50%, #c62828 100%)',
        backgroundSize: '200% auto',
        animation: 'shimmer 1.8s linear infinite',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#c62828' }}>
            <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" fill="currentColor" />
          </svg>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c62828' }}>
          AI Enrichment in Progress
        </span>
      </div>
      <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6, margin: 0, fontWeight: 500, fontFamily: 'inherit' }}>
        Gemini is scraping the source text and synthesizing a structured journalistic report. The full article content will appear here in a few seconds...
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
        <div className="pulse-line" style={{ height: 12, background: '#e0e0e0', borderRadius: 4, width: '100%' }} />
        <div className="pulse-line" style={{ height: 12, background: '#e0e0e0', borderRadius: 4, width: '92%' }} />
        <div className="pulse-line" style={{ height: 12, background: '#e0e0e0', borderRadius: 4, width: '75%' }} />
      </div>
    </div>
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

// ─── Skeleton Loaders ──────────────────────────────────────────────────────────

function ArticleSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', padding: '10px 0' }}>
      <div className="skeleton-line" style={{ width: '100%', height: 16 }} />
      <div className="skeleton-line" style={{ width: '98%', height: 16 }} />
      <div className="skeleton-line" style={{ width: '95%', height: 16 }} />
      <div className="skeleton-line" style={{ width: '92%', height: 16 }} />
      <div className="skeleton-line" style={{ width: '89%', height: 16, marginBottom: 12 }} />
      
      <div className="skeleton-line" style={{ width: '100%', height: 16 }} />
      <div className="skeleton-line" style={{ width: '96%', height: 16 }} />
      <div className="skeleton-line" style={{ width: '94%', height: 16 }} />
      <div className="skeleton-line" style={{ width: '70%', height: 16 }} />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', Arial, sans-serif" }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1260, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 56 }}>
          <div className="skeleton-line" style={{ width: 80, height: 24 }} />
        </div>
      </header>
      <div style={{ maxWidth: 1260, margin: '0 auto', width: '100%', padding: '32px 20px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '0 40px' }}>
        <div>
          <div className="skeleton-line" style={{ width: 120, height: 18, marginBottom: 16 }} />
          <div className="skeleton-line" style={{ width: '90%', height: 38, marginBottom: 24 }} />
          <div className="skeleton-line" style={{ width: '100%', height: 420, borderRadius: 4, marginBottom: 28 }} />
          <ArticleSkeleton />
        </div>
        <div>
          <div className="skeleton-line" style={{ width: '100%', height: 200, borderRadius: 4, marginBottom: 20 }} />
          <div className="skeleton-line" style={{ width: '100%', height: 150, borderRadius: 4 }} />
        </div>
      </div>
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
  const [showMoreClicked, setShowMoreClicked] = useState(false);
  const [enrichedData, setEnrichedData] = useState<Article | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    let active = true;

    Promise.all([fetchArticleById(id), fetchNews()]).then(([art, all]) => {
      if (!active) return;
      setArticle(art);
      setLoading(false);

      if (art) {
        const cats = art.categories || [];
        const rel = all.filter(a => a.id !== id && a.categories?.some(c => cats.includes(c))).slice(0, 6);
        setRelated(rel.length > 0 ? rel : all.filter(a => a.id !== id).slice(0, 6));

        // Prefetch/start enrichment in background immediately if pending
        if (art.enrichmentStatus === 'pending') {
          enrichArticleById(id).then((enriched) => {
            if (!active) return;
            if (enriched) {
              setArticle(enriched);
              setEnrichedData(enriched);
            }
          });
        }
      }
    });

    return () => {
      active = false;
    };
  }, [id]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return <PageSkeleton />;
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

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Inter', Arial, sans-serif" }} className="page-slide-up">
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
            {article.enrichmentStatus === 'complete' ? (
              <div className="fade-in">
                <ArticleBody text={article.content || article.summary} />
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 17, lineHeight: 1.85, color: '#222', marginBottom: 22, fontFamily: "'Source Serif 4', Georgia, serif" }}>
                  {article.summary}
                </p>

                {showMoreClicked ? (
                  enrichedData ? (
                    <div className="fade-in">
                      <ArticleBody text={enrichedData.content || enrichedData.summary} />
                    </div>
                  ) : (
                    <div className="fade-in">
                      <ArticleSkeleton />
                    </div>
                  )
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30, marginBottom: 20 }}>
                    <button
                      onClick={() => setShowMoreClicked(true)}
                      style={{
                        padding: '12px 32px',
                        background: 'linear-gradient(135deg, #111 0%, #333 100%)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 14,
                        border: 'none',
                        borderRadius: 30,
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                      className="show-more-btn"
                    >
                      <BookOpen style={{ width: 16, height: 16 }} />
                      Read Full Article
                    </button>
                  </div>
                )}
              </div>
            )}

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
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton-line {
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: shimmer 1.6s infinite linear;
          border-radius: 4px;
        }
        .fade-in {
          animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .page-slide-up {
          animation: slideUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .show-more-btn {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s;
        }
        .show-more-btn:hover {
          transform: translateY(-2px);
          background: linear-gradient(135deg, #222 0%, #444 100%) !important;
          box-shadow: 0 6px 20px rgba(0,0,0,0.15) !important;
        }
        .show-more-btn:active {
          transform: translateY(0);
        }
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px; }

        /* Loading Overlay Animations */
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes textPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes shimmerBar {
          0% { left: -50%; }
          100% { left: 100%; }
        }
        .animate-logo-i {
          animation: bounceInLogoI 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .animate-logo-r {
          animation: bounceInLogoR 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.15s forwards;
        }
        @keyframes bounceInLogoI {
          from { opacity: 0; transform: scale(0.3) rotate(-15deg); }
          to { opacity: 1; transform: scale(1) rotate(0); }
        }
        @keyframes bounceInLogoR {
          from { opacity: 0; transform: scale(0.3) rotate(15deg); }
          to { opacity: 1; transform: scale(1) rotate(0); }
        }
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
