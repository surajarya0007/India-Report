'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchArticleById, fetchNews, Article } from '../../../lib/api';
import { 
  Clock, 
  ChevronLeft, 
  Share2, 
  TrendingUp, 
  Volume2, 
  Bookmark, 
  Printer, 
  AlertCircle,
  Quote
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const dateFormatted = d.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }).toUpperCase();
  const timeFormatted = d.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  }).toUpperCase();
  return `${dateFormatted} AT ${timeFormatted}`;
}

const CAT_COLORS: Record<string, string> = {
  Tech: '#1565c0', Business: '#2e7d32', Finance: '#6a1b9a',
  Science: '#00695c', Health: '#ad1457', Entertainment: '#e65100',
  Politics: '#b71c1c', India: '#c62828', World: '#37474f', Sports: '#0277bd', Default: '#455a64',
};

function catColor(cat?: string) { 
  return CAT_COLORS[cat || ''] || CAT_COLORS.Default; 
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
      style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid #f2f2f2', cursor: 'pointer' }}
    >
      <div style={{ 
        flexShrink: 0, 
        width: 80, 
        height: 60, 
        overflow: 'hidden', 
        background: `linear-gradient(135deg, ${bg}22, ${bg}11)`, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.imageUrl} alt={article.headline} onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <span style={{ color: bg, fontSize: 16, fontWeight: 900, fontFamily: 'Georgia, serif', opacity: 0.3 }}>IR</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {cat && (
          <span style={{ 
            fontSize: 9, 
            fontWeight: 800, 
            color: bg, 
            letterSpacing: '0.08em', 
            textTransform: 'uppercase', 
            display: 'block',
            marginBottom: 4 
          }}>
            {cat} ↗
          </span>
        )}
        <p style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 13, 
          fontWeight: 700, 
          lineHeight: 1.35, 
          color: hov ? bg : '#111', 
          transition: 'color 0.15s',
          display: '-webkit-box', 
          WebkitLineClamp: 2, 
          WebkitBoxOrient: 'vertical', 
          overflow: 'hidden',
          margin: 0
        }}>
          {article.headline}
        </p>
      </div>
    </div>
  );
}

// ─── Pull-Quote Callout ───────────────────────────────────────────────────────

function PullQuote({ text, color }: { text: string; color: string }) {
  return (
    <div style={{
      margin: '36px 0',
      padding: '28px 32px',
      borderLeft: `5px solid ${color}`,
      background: `${color}08`,
      position: 'relative',
    }}>
      <Quote style={{ 
        width: 28, height: 28, color: color, opacity: 0.3,
        position: 'absolute', top: 16, right: 20
      }} />
      <p style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '19px',
        fontStyle: 'italic',
        fontWeight: 600,
        lineHeight: 1.6,
        color: '#1a1a2e',
        margin: 0,
      }}>
        {text}
      </p>
    </div>
  );
}

// ─── Inline Markdown Bold Parser ──────────────────────────────────────────────

function renderTextWithBold(text: string, isFirstParagraph?: boolean) {
  const parts = text.split('**');
  const nodes = parts.map((part, idx) => {
    // Odd indices are between **...**
    if (idx % 2 === 1) {
      return <strong key={idx} style={{ color: '#111', fontWeight: 800 }}>{part}</strong>;
    }
    return part;
  });

  if (isFirstParagraph && nodes.length > 0) {
    // If the first element is a string, extract the drop cap from it
    if (typeof nodes[0] === 'string' && nodes[0].length > 0) {
      const firstStr = nodes[0];
      const firstLetter = firstStr[0];
      const remainingText = firstStr.slice(1);
      nodes[0] = remainingText;
      return (
        <>
          <span className="drop-cap">{firstLetter}</span>
          {nodes}
        </>
      );
    }
  }

  return nodes;
}

// ─── Article body renderer with Section Headings + Pull Quotes ────────────────

function ArticleBody({ 
  contentBlocks, 
  sectionHeadings, 
  highlightedFacts,
  color
}: { 
  contentBlocks?: string[];
  sectionHeadings?: string[];
  highlightedFacts?: string[];
  color: string;
}) {
  if (!contentBlocks || contentBlocks.length === 0) {
    return <p style={{ fontSize: 16, color: '#666' }}>No content available.</p>;
  }

  // Section headings appear before paragraphs at index 1, 3, 5, 7
  const headingIndices = [1, 3, 5, 7];
  // Pull quotes appear after paragraphs at index 2, 5
  const pullQuoteAfter = [2, 5];

  return (
    <div>
      {contentBlocks.map((para, i) => {
        const isFirst = i === 0;
        const pContent = renderTextWithBold(para, isFirst);

        // Determine which section heading to show (based on position in headingIndices)
        const headingSlot = headingIndices.indexOf(i);
        const heading = headingSlot >= 0 ? (sectionHeadings?.[headingSlot] || null) : null;

        // Determine which pull quote to show after this paragraph
        const pullQuoteSlot = pullQuoteAfter.indexOf(i);
        const pullQuote = pullQuoteSlot >= 0 ? (highlightedFacts?.[pullQuoteSlot] || null) : null;

        return (
          <React.Fragment key={i}>
            {/* Section Heading */}
            {heading && (
              <h3 className="section-subheading" style={{ borderLeft: `4px solid ${color}` }}>
                {heading}
              </h3>
            )}

            {/* Paragraph */}
            <p className="article-paragraph">
              {pContent}
            </p>

            {/* Pull Quote Callout */}
            {pullQuote && <PullQuote text={pullQuote} color={color} />}
          </React.Fragment>
        );
      })}

      {/* Remaining highlighted facts as a callout grid at the end */}
      {highlightedFacts && highlightedFacts.length > 2 && (
        <div style={{ 
          marginTop: 40, 
          padding: '28px',
          background: '#f8fafc',
          borderTop: `3px solid ${color}`,
        }}>
          <h4 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: color,
            margin: '0 0 16px 0'
          }}>
            KEY TAKEAWAYS
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {highlightedFacts.slice(2).map((fact, idx) => (
              <div key={idx} style={{
                padding: '16px',
                background: '#fff',
                border: `1px solid ${color}22`,
                borderLeft: `3px solid ${color}`,
              }}>
                <p style={{
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: '#2c3e50',
                  margin: 0,
                  fontWeight: 500,
                }}>
                  {fact}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page skeletons ──────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', Arial, sans-serif" }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e8e8e8' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 56 }}>
          <div style={{ width: 80, height: 24, background: '#f0f0f0' }} />
        </div>
      </header>
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '32px 20px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '0 40px' }}>
        <div>
          <div style={{ width: 120, height: 18, background: '#f0f0f0', marginBottom: 16 }} />
          <div style={{ width: '90%', height: 38, background: '#f0f0f0', marginBottom: 24 }} />
          <div style={{ width: '100%', height: 420, background: '#f0f0f0', marginBottom: 28 }} />
          <div style={{ width: '100%', height: 200, background: '#f0f0f0' }} />
        </div>
        <div>
          <div style={{ width: '100%', height: 200, background: '#f0f0f0', marginBottom: 20 }} />
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
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Reaction State
  const [reactions, setReactions] = useState<Record<string, number>>({
    like: 24, love: 15, laugh: 4, wow: 9, sad: 1, angry: 0
  });
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);

  const handleReactionClick = (key: string) => {
    if (selectedReaction === key) {
      setReactions(prev => ({ ...prev, [key]: prev[key] - 1 }));
      setSelectedReaction(null);
    } else {
      setReactions(prev => {
        const next = { ...prev };
        if (selectedReaction) next[selectedReaction] = next[selectedReaction] - 1;
        next[key] = next[key] + 1;
        return next;
      });
      setSelectedReaction(key);
    }
  };

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
        const rel = all.filter(a => a.id !== id && a.categories?.some(c => cats.includes(c))).slice(0, 5);
        setRelated(rel.length > 0 ? rel : all.filter(a => a.id !== id).slice(0, 5));
      }
    });

    return () => { active = false; };
  }, [id]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => { if (typeof window !== 'undefined') window.print(); };

  const toggleAudio = () => {
    if ('speechSynthesis' in window && article) {
      if (audioPlaying) {
        window.speechSynthesis.cancel();
        setAudioPlaying(false);
      } else {
        const textToSpeak = `${article.headline}. Key takeaways: ${article.summary.join('. ')}. ${article.contentBlocks?.join('. ')}`;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.onend = () => setAudioPlaying(false);
        utterance.onerror = () => setAudioPlaying(false);
        setAudioPlaying(true);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  useEffect(() => {
    return () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
  }, []);

  if (loading) return <PageSkeleton />;

  if (!article) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <TopBar onBack={() => router.push('/')} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
          <p style={{ fontSize: 16, color: '#888', fontWeight: 600 }}>Article not found</p>
          <button onClick={() => router.push('/')}
            style={{ marginTop: 8, padding: '8px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 13 }}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const primaryCategory = article.categories?.[0] || 'News';
  const categoryColorHex = catColor(primaryCategory);
  const readTime = Math.ceil(((article.contentBlocks?.join(' ') || '').split(' ').length) / 200);

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#111', fontFamily: "'Inter', Arial, sans-serif" }}>
      {/* Import Web Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Source+Serif+4:ital,opsz,wght@0,8..60,300..700;1,8..60,300..700&family=Inter:wght@300..900&display=swap" rel="stylesheet" />

      <TopBar onBack={() => router.push('/')} />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
        {/* Breadcrumb / Category Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <span 
            onClick={() => router.push('/')}
            style={{ 
              fontSize: 11, fontWeight: 800, color: categoryColorHex, 
              letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4
            }}
          >
            Home
          </span>
          <span style={{ fontSize: 11, color: '#bbb' }}>/</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: categoryColorHex, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {primaryCategory}
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(28px, 4vw, 46px)',
          fontWeight: 800,
          lineHeight: 1.15,
          color: '#111',
          marginBottom: 20,
          letterSpacing: '-0.02em',
          maxWidth: '90%'
        }}>
          {article.headline}
        </h1>

        {/* Divider line in category color */}
        <div style={{ width: 60, height: 4, background: categoryColorHex, marginBottom: 20 }} />

        {/* Premium Meta Row */}
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16, paddingBottom: 18, 
          borderBottom: '1px solid #eaeaea', marginBottom: 28
        }}>
          {/* Author/Date Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: '50%', 
              background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 900, fontFamily: 'Georgia, serif' }}>IR</span>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>India Reports Editorial Desk</div>
              <div style={{ fontSize: 10, color: '#888', fontWeight: 500, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock style={{ width: 10, height: 10 }} />
                <span>{formatDate(article.createdAt)}</span>
                <span>·</span>
                <span>{readTime} MIN READ</span>
              </div>
            </div>
          </div>

          {/* Action Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="action-pill" onClick={toggleAudio}>
              <Volume2 style={{ width: 14, height: 14 }} />
              <span>{audioPlaying ? 'STOP' : 'LISTEN'}</span>
            </button>
            <button className="action-pill">
              <Bookmark style={{ width: 14, height: 14 }} />
              <span>SAVE</span>
            </button>
            <button className="action-pill" onClick={handlePrint}>
              <Printer style={{ width: 14, height: 14 }} />
              <span>PRINT</span>
            </button>
            <button className="action-pill active-pill" onClick={handleShare}>
              <Share2 style={{ width: 14, height: 14 }} />
              <span>{copied ? 'COPIED!' : 'SHARE'}</span>
            </button>
          </div>
        </div>

        {/* ── Page Grid ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '0 48px', alignItems: 'start' }}>
          
          {/* Left Main Content */}
          <div style={{ minWidth: 0 }}>
            {/* Hero Image */}
            <div style={{ position: 'relative', marginBottom: 32 }}>
              {article.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={article.imageUrl} 
                  alt={article.headline}
                  style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 520, objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: 380,
                  background: `linear-gradient(135deg, ${categoryColorHex}0d 0%, ${categoryColorHex}1a 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid #f0f0f0'
                }}>
                  <span style={{ color: categoryColorHex, fontSize: 72, fontWeight: 900, fontFamily: 'Georgia, serif', opacity: 0.15 }}>IR</span>
                </div>
              )}
              <div style={{ 
                textAlign: 'right', fontSize: 10, color: '#999', 
                marginTop: 6, fontStyle: 'italic', letterSpacing: '0.04em' 
              }}>
                IMAGE: INDIA REPORTS / GOOGLE NEWS INGEST
              </div>
            </div>

            {/* Summary Box (IR Summary Style) */}
            {article.summary && article.summary.length > 0 && (
              <div style={{
                background: '#f8fafc',
                borderLeft: `4px solid ${categoryColorHex}`,
                padding: '24px 28px',
                marginBottom: 36,
              }}>
                <h4 style={{ 
                  fontSize: 10, fontWeight: 900, letterSpacing: '0.15em',
                  textTransform: 'uppercase', margin: '0 0 14px 0', color: categoryColorHex 
                }}>
                  IR SUMMARY — KEY POINTS
                </h4>
                <ul style={{ 
                  margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 12,
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontSize: '15.5px', lineHeight: 1.65, color: '#334155'
                }}>
                  {article.summary.map((bullet, idx) => (
                    <li key={idx} style={{ paddingLeft: 4 }}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Content Header */}
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
              paddingBottom: 12, borderBottom: `2px solid ${categoryColorHex}20`
            }}>
              <span style={{
                fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 900,
                color: categoryColorHex, letterSpacing: '0.15em', textTransform: 'uppercase'
              }}>
                IN-DEPTH ANALYSIS
              </span>
              <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
              {article.categories?.map((cat, i) => (
                <span key={i} style={{
                  fontSize: 9, fontWeight: 800, color: catColor(cat),
                  background: `${catColor(cat)}15`, padding: '3px 8px',
                  letterSpacing: '0.08em', textTransform: 'uppercase'
                }}>
                  {cat}
                </span>
              ))}
            </div>

            {/* Article Body */}
            <ArticleBody 
              contentBlocks={article.contentBlocks}
              sectionHeadings={article.sectionHeadings}
              highlightedFacts={article.highlightedFacts}
              color={categoryColorHex}
            />

            {/* Reactions Block */}
            <div style={{ 
              marginTop: 52, paddingTop: 28, borderTop: '2px solid #f0f0f0',
              textAlign: 'center'
            }}>
              <span style={{ 
                fontSize: 11, fontWeight: 800, color: '#555', letterSpacing: '0.1em',
                textTransform: 'uppercase', display: 'block', marginBottom: 18
              }}>
                How do you feel about this story?
              </span>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { key: 'like', emoji: '👍', label: 'Like' },
                  { key: 'love', emoji: '❤️', label: 'Love' },
                  { key: 'laugh', emoji: '😂', label: 'Laugh' },
                  { key: 'wow', emoji: '😮', label: 'Wow' },
                  { key: 'sad', emoji: '😢', label: 'Sad' },
                  { key: 'angry', emoji: '😡', label: 'Angry' },
                ].map((item) => {
                  const isActive = selectedReaction === item.key;
                  return (
                    <button 
                      key={item.key} 
                      onClick={() => handleReactionClick(item.key)}
                      className={`reaction-btn ${isActive ? 'reaction-active' : ''}`}
                    >
                      <span style={{ fontSize: 18 }}>{item.emoji}</span>
                      <span className="count">{reactions[item.key]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <aside>
            {/* Sentiment Tag */}
            {article.sentiment && (
              <div style={{
                marginBottom: 24,
                padding: '14px 20px',
                background: article.sentiment === 'Positive' ? '#f0fdf4' : article.sentiment === 'Negative' ? '#fff1f2' : '#f8fafc',
                border: `1px solid ${article.sentiment === 'Positive' ? '#bbf7d0' : article.sentiment === 'Negative' ? '#fecdd3' : '#e2e8f0'}`,
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                <TrendingUp style={{ 
                  width: 16, height: 16, 
                  color: article.sentiment === 'Positive' ? '#16a34a' : article.sentiment === 'Negative' ? '#e11d48' : '#64748b'
                }} />
                <div>
                  <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', marginBottom: 2 }}>
                    SENTIMENT ANALYSIS
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>
                    {article.sentiment} Coverage
                  </div>
                </div>
              </div>
            )}

            {/* Related News List */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                paddingBottom: 10, borderBottom: `2.5px solid ${categoryColorHex}` 
              }}>
                <h3 style={{ 
                  fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 900,
                  color: '#111', letterSpacing: '0.12em', margin: 0, textTransform: 'uppercase'
                }}>
                  Related Stories
                </h3>
              </div>
              
              {related.length === 0 && (
                <p style={{ fontSize: 12, color: '#bbb' }}>No related stories found.</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {related.map(a => <SideCard key={a.id} article={a} />)}
              </div>

              {/* Back to Home Button */}
              <button 
                onClick={() => router.push('/')}
                style={{
                  width: '100%', marginTop: 20, padding: '12px',
                  background: categoryColorHex, color: '#fff', border: 'none',
                  fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', cursor: 'pointer',
                  transition: 'opacity 0.2s', textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                ◀ BACK TO HOME
              </button>
            </div>

            {/* AI assisted notice */}
            <div style={{ background: '#f8f8f8', padding: '20px', border: '1px solid #eaeaea' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <AlertCircle style={{ width: 14, height: 14, color: categoryColorHex }} />
                <span style={{ fontSize: 10, fontWeight: 900, color: '#111', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  AI Dossier Synthesis
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: '#666', lineHeight: 1.6, margin: 0 }}>
                This report is compiled programmatically from multiple verified news publications. Raw articles are parsed via Firecrawl and structured analysis is synthesized dynamically using Gemini AI models.
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* Global CSS Styles */}
      <style>{`
        .action-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #e0e0e0;
          background: #fff;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #555;
          height: 32px;
          padding: 0 14px;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
        }
        .action-pill:hover {
          background: #f8f8f8;
          color: #111;
          border-color: #adadad;
        }
        .active-pill {
          background: #111;
          color: #fff !important;
          border-color: #111;
        }
        .active-pill:hover {
          background: #222;
          border-color: #222;
        }
        .article-paragraph {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 18px;
          line-height: 1.9;
          color: #2c3e50;
          margin-bottom: 28px;
          letter-spacing: 0.01em;
        }
        .section-subheading {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 22px;
          font-weight: 800;
          color: #111;
          margin-top: 44px;
          margin-bottom: 18px;
          padding-left: 14px;
          letter-spacing: -0.01em;
          line-height: 1.3;
        }
        .drop-cap {
          float: left;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 68px;
          line-height: 52px;
          padding-top: 4px;
          padding-right: 10px;
          padding-left: 2px;
          font-weight: 800;
          color: #111;
        }
        .reaction-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: 1px solid #e0e0e0;
          border-radius: 20px;
          background: #fff;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .reaction-btn:hover {
          background: #f5f7fb;
          border-color: #bbb;
          transform: translateY(-1px);
        }
        .reaction-active {
          background: #eff6ff !important;
          border-color: #3b82f6 !important;
        }
        .reaction-btn .count {
          font-size: 12px;
          font-weight: 700;
          color: #555;
        }
        .reaction-active .count {
          color: #2563eb !important;
        }
        @media (max-width: 768px) {
          main > div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Top Navigation Bar (non-sticky) ─────────────────────────────────────────

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #e8e8e8' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58 }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#444', fontSize: 13, fontWeight: 600, padding: '6px 0', fontFamily: "'Inter', sans-serif" }}>
          <ChevronLeft style={{ width: 18, height: 18 }} />
          Back
        </button>

        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
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
