'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useNews } from '../hooks/useNews';
import { Article } from '../lib/api';
import { Search, Menu, X, Clock, RefreshCw, Cpu, ChevronRight } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const CAT_COLORS: Record<string, string> = {
  Tech: '#1565c0', Business: '#2e7d32', Finance: '#6a1b9a',
  Science: '#00695c', Health: '#ad1457', Entertainment: '#e65100',
  Politics: '#b71c1c', India: '#c62828', World: '#37474f', Sports: '#d84315', Default: '#455a64',
};

function catColor(cat?: string) {
  return CAT_COLORS[cat || ''] || CAT_COLORS.Default;
}

// ─── Shared: Image placeholder ────────────────────────────────────────────────

function ImgBox({ article, height = 180, style = {} }: { article: Article; height?: number; style?: React.CSSProperties }) {
  const cat = article.categories?.[0];
  const bg = catColor(cat);
  const [imgError, setImgError] = useState(false);
  const hasImage = !!article.imageUrl && !imgError;

  if (hasImage) {
    return (
      <div style={{
        height,
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        background: `linear-gradient(140deg, ${bg}dd 0%, ${bg}77 100%)`,
        ...style,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={article.imageUrl}
          alt={article.headline}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          className="img-fade-in"
        />
      </div>
    );
  }

  return (
    <div style={{
      height,
      background: `linear-gradient(140deg, ${bg}dd 0%, ${bg}77 100%)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
      ...style,
    }}>
      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 48, fontWeight: 900, lineHeight: 1, fontFamily: 'Georgia, serif' }}>IR</span>
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 4 }}>{cat || 'News'}</span>
    </div>
  );
}


// ─── Shared: Category tag ─────────────────────────────────────────────────────

function CatTag({ cat }: { cat?: string }) {
  const label = cat || 'India';
  return (
    <span style={{
      display: 'inline-block',
      background: catColor(cat),
      color: '#fff', fontSize: 9, fontWeight: 800,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      padding: '2px 7px', borderRadius: 2, flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

function EnrichingBadge() {
  return (
    <span style={{
      display: 'inline-block', marginLeft: 6,
      background: '#fff8e1', color: '#f57f17', fontSize: 8, fontWeight: 800,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '2px 6px', borderRadius: 2, border: '1px solid #ffe082',
    }}>
      Updating
    </span>
  );
}

// ─── Breaking ticker ─────────────────────────────────────────────────────────

function BreakingTicker({ articles }: { articles: Article[] }) {
  const texts = articles.length > 0
    ? [...articles, ...articles].map(a => a.headline)
    : ['India Reports: AI-Powered News Platform — Updated On Demand', 'Breaking coverage from India and the world, synthesized by Gemini 1.5 Flash', 'Live pipeline: Firecrawl extraction • Supabase storage • Upstash caching'];

  return (
    <div style={{ display: 'flex', background: '#c62828', overflow: 'hidden', borderBottom: '1px solid #a81c1c' }}>
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 14px',
        background: '#7f0000', color: '#fff', fontSize: 10, fontWeight: 800,
        letterSpacing: '0.15em', textTransform: 'uppercase', whiteSpace: 'nowrap',
        borderRight: '2px solid #a81c1c', gap: 6, height: 36,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
        BREAKING
      </div>
      <div style={{ overflow: 'hidden', flex: 1 }}>
        <div className="ticker-track" style={{ display: 'flex', width: 'max-content', alignItems: 'center', height: 36 }}>
          {texts.map((t, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', color: '#fff', fontSize: 13, padding: '0 28px', whiteSpace: 'nowrap', gap: 10 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'inline-block', flexShrink: 0 }} />
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Article Cards ────────────────────────────────────────────────────────────

/** Large feature card — image on top, big headline */
function FeatureCard({ article, index = 0 }: { article: Article; index?: number }) {
  const router = useRouter();
  const [hov, setHov] = useState(false);
  const firstSentence = article.summary?.[0] ?? '';

  return (
    <div
      onClick={() => router.push(`/article/${article.id}`)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="card-entrance"
      style={{ cursor: 'pointer', animationDelay: `${index * 50}ms` }}
    >
      <div style={{ overflow: 'hidden', borderRadius: 3 }}>
        <ImgBox article={article} height={230} style={{ transform: hov ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.35s ease' }} />
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <CatTag cat={article.categories?.[0]} />
          {article.enrichmentStatus === 'pending' && <EnrichingBadge />}
        </div>
        <h2 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 22, fontWeight: 800, lineHeight: 1.25, marginTop: 8, marginBottom: 8,
          color: hov ? '#c62828' : '#111', transition: 'color 0.2s',
        }}>
          {article.headline}
        </h2>
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.65, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {firstSentence}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#999' }}>
          <Clock style={{ width: 11, height: 11 }} />
          <span>{timeAgo(article.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

/** Compact horizontal card — thumbnail left, text right */
function CompactCard({ article, showDivider = true, index = 0 }: { article: Article; showDivider?: boolean; index?: number }) {
  const router = useRouter();
  const [hov, setHov] = useState(false);
  return (
    <>
      {showDivider && <div style={{ height: 1, background: '#f0f0f0', margin: '0' }} />}
      <div
        onClick={() => router.push(`/article/${article.id}`)}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        className="card-entrance"
        style={{
          display: 'flex', gap: 12, padding: '13px 0', cursor: 'pointer',
          animationDelay: `${index * 50}ms`,
        }}
      >
        <div style={{ flexShrink: 0, width: 82, height: 62, borderRadius: 3, overflow: 'hidden' }}>
          <ImgBox article={article} height={62} style={{ transform: hov ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.3s', width: 82 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            <CatTag cat={article.categories?.[0]} />
            {article.enrichmentStatus === 'pending' && <EnrichingBadge />}
          </div>
          <h3 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginTop: 5,
            color: hov ? '#c62828' : '#111', transition: 'color 0.2s',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {article.headline}
          </h3>
          <div style={{ fontSize: 11, color: '#bbb', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock style={{ width: 10, height: 10 }} />
            {timeAgo(article.createdAt)}
          </div>
        </div>
      </div>
    </>
  );
}

/** Grid card for section rows */
function GridCard({ article, index = 0 }: { article: Article; index?: number }) {
  const router = useRouter();
  const [hov, setHov] = useState(false);
  const firstSentence = article.summary?.[0] ?? '';
  return (
    <div
      onClick={() => router.push(`/article/${article.id}`)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="card-entrance"
      style={{
        cursor: 'pointer', borderRadius: 4, overflow: 'hidden',
        border: '1px solid #ebebeb',
        boxShadow: hov ? '0 4px 18px rgba(0,0,0,0.09)' : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.25s',
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div style={{ overflow: 'hidden' }}>
        <ImgBox article={article} height={140} style={{ transform: hov ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.35s' }} />
      </div>
      <div style={{ padding: '12px 13px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <CatTag cat={article.categories?.[0]} />
          {article.enrichmentStatus === 'pending' && <EnrichingBadge />}
        </div>
        <h3 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginTop: 7, marginBottom: 5,
          color: hov ? '#c62828' : '#111', transition: 'color 0.2s',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {article.headline}
        </h3>
        <p style={{ fontSize: 12, color: '#777', lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {firstSentence}
        </p>
        <div style={{ fontSize: 11, color: '#bbb', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock style={{ width: 10, height: 10 }} />
          {timeAgo(article.createdAt)}
        </div>
      </div>
    </div>
  );
}

/** Sidebar list item */
function SidebarItem({ article, rank, index = 0 }: { article: Article; rank: number; index?: number }) {
  const router = useRouter();
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => router.push(`/article/${article.id}`)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="card-entrance"
      style={{
        display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 0',
        borderBottom: '1px solid #f2f2f2', cursor: 'pointer',
        animationDelay: `${index * 50}ms`,
      }}
    >
      <span style={{ fontSize: 20, fontWeight: 900, color: '#e8e8e8', fontFamily: 'Georgia, serif', lineHeight: 1, flexShrink: 0, minWidth: 26, textAlign: 'right' }}>
        {String(rank).padStart(2, '0')}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <CatTag cat={article.categories?.[0]} />
          {article.enrichmentStatus === 'pending' && <EnrichingBadge />}
        </div>
        <h4 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 13, fontWeight: 700, lineHeight: 1.35, marginTop: 5,
          color: hov ? '#c62828' : '#111', transition: 'color 0.2s',
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {article.headline}
        </h4>
        <div style={{ fontSize: 11, color: '#bbb', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
          <Clock style={{ width: 10, height: 10 }} />
          {timeAgo(article.createdAt)}
        </div>
      </div>
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────

function SectionHead({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 10, borderBottom: '2px solid #111' }}>
      <div style={{ width: 4, height: 20, background: '#c62828', borderRadius: 2, flexShrink: 0 }} />
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 900, color: '#111', letterSpacing: '-0.01em' }}>{title}</h2>
      <div style={{ flex: 1, height: 1, background: '#ebebeb', marginLeft: 4 }} />
    </div>
  );
}

// ─── Navigation categories ────────────────────────────────────────────────────

const NAV_ITEMS = ['Home', 'India', 'World', 'Business', 'Tech', 'Sports', 'Science', 'Finance', 'Health', 'Entertainment', 'Politics'];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeNav, setActiveNav] = useState('Home');
  const [activeSearch, setActiveSearch] = useState<string | undefined>(undefined);
  const { articles, loading, ingesting, hasPendingArticles, refresh, triggerIngest, searchNews } = useNews(activeNav, activeSearch);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    let list = articles;
    if (!activeSearch) {
      const cat = activeNav === 'Home' ? null : activeNav;
      if (cat) list = list.filter(a => a.categories?.includes(cat));
    }
    return list;
  }, [articles, activeNav, activeSearch]);

  const handleIngest = async () => {
    const res = await triggerIngest();
    setToast({ msg: res.success ? `✓ Added ${res.ingestedCount} new stories` : '✗ ' + res.message, ok: res.success });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setActiveNav('Home');
    setActiveSearch(q);
    const res = await searchNews(q);
    const toastMsg = !res.success
      ? '✗ ' + res.message
      : res.ingestedCount > 0
        ? `✓ Added ${res.ingestedCount} new stories for "${q}"`
        : res.hadCachedResults
          ? `✓ Showing ${res.cachedCount} stories for "${q}" (already up to date)`
          : `✓ No stories found for "${q}"`;
    setToast({ msg: toastMsg, ok: res.success });
    setTimeout(() => setToast(null), 5000);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setActiveSearch(undefined);
    setSearchOpen(false);
  };

  // Layout slots
  const centerHero = filtered[0];             // Center top: big hero (1 item)
  const centerGrid = filtered.slice(1, 5);   // Center: 4-card grid below hero (4 items)
  const leftFeed = filtered.slice(5, 9);     // Left sidebar: 4 compact items (4 items)
  const rightFeed = filtered.slice(9, 15);   // Right sidebar: 6 latest items (6 items)

  const sectionTitle = activeSearch ? `Results for "${activeSearch}"` : activeNav === 'Home' ? 'More Stories' : activeNav;

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#111', fontFamily: "'Inter', Arial, sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          background: toast.ok ? '#14532d' : '#7f1d1d',
          color: '#fff', padding: '10px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── BBC-style Top Bar ─────────────────────────────────────────────────── */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e8e8e8' }}>
        {/* Top strip: hamburger | logo center | actions right */}
        <div style={{ maxWidth: 1260, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>

          {/* Left: hamburger + search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 6, color: '#111' }}
              title="Menu"
            >
              {menuOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
            </button>
            <button
              onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) clearSearch(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 3, color: '#111', display: 'flex' }}
              title="Search"
            >
              {searchOpen ? <X style={{ width: 18, height: 18 }} /> : <Search style={{ width: 18, height: 18 }} />}
            </button>
            {searchOpen && (
              <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search Google News..."
                  style={{ border: '1px solid #ddd', borderRadius: 3, padding: '5px 12px', fontSize: 13, width: 220, outline: 'none' }}
                />
                <button
                  type="submit"
                  disabled={ingesting || !searchQuery.trim()}
                  style={{
                    border: '1px solid #111', background: '#111', color: '#fff',
                    borderRadius: 3, padding: '5px 10px', fontSize: 11, fontWeight: 700,
                    cursor: ingesting || !searchQuery.trim() ? 'not-allowed' : 'pointer',
                    opacity: ingesting || !searchQuery.trim() ? 0.5 : 1,
                  }}
                >
                  Go
                </button>
              </form>
            )}
          </div>

          {/* Center: Logo */}
          <a href="/" style={{ textDecoration: 'none', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {['I', 'R'].map((l, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, background: '#111', color: '#fff',
                  fontWeight: 900, fontSize: 18, fontFamily: 'Georgia, serif',
                  letterSpacing: '-0.02em',
                }}>{l}</span>
              ))}
              <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', color: '#111', marginLeft: 8 }}>
                INDIA REPORTS
              </span>
            </div>
          </a>

          {/* Right: date + feed button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: '#999', display: 'none' }} className="date-hide">
              {now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button
              onClick={handleIngest} disabled={ingesting}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, border: '2px solid #111',
                background: ingesting ? '#f5f5f5' : '#111', color: ingesting ? '#999' : '#fff',
                borderRadius: 3, padding: '6px 14px', fontSize: 11, fontWeight: 700,
                cursor: ingesting ? 'not-allowed' : 'pointer', letterSpacing: '0.04em',
                transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}
            >
              <Cpu style={{ width: 11, height: 11 }} />
              {ingesting ? 'Updating…' : 'Update Feed'}
            </button>
            <button onClick={refresh} disabled={loading} title="Refresh"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#777', display: 'flex', padding: 4 }}>
              <RefreshCw style={{ width: 14, height: 14 }} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Nav bar — centered */}
        <div style={{ borderTop: '1px solid #f0f0f0' }}>
          <div style={{ maxWidth: 1260, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 0 }}>
            {NAV_ITEMS.map(item => {
              const active = item === activeNav;
              return (
                <button key={item} onClick={() => { setActiveNav(item); setActiveSearch(undefined); setSearchQuery(''); setSearchOpen(false); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '10px 14px', fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? '#111' : '#444',
                    borderBottom: active ? '2.5px solid #111' : '2.5px solid transparent',
                    whiteSpace: 'nowrap', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#111'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#444'; }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Breaking Ticker */}
      <BreakingTicker articles={articles.slice(0, 6)} />

      {/* ── Main 3-column layout ───────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1260, margin: '0 auto', padding: '24px 20px' }}>

        {/* Full-page loader — only on initial DB fetch, not during background ingest */}
        {loading && filtered.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0', gap: 12 }}>
            <div style={{ width: 36, height: 36, border: '3px solid #c62828', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 14, color: '#888' }}>
              {`Looking for "${searchQuery || activeSearch || 'your topic'}" in database…`}
            </span>
          </div>
        )}

        {/* Ingest started on empty feed — stubs arrive in seconds */}
        {ingesting && !loading && filtered.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0', gap: 12 }}>
            <div style={{ width: 36, height: 36, border: '3px solid #c62828', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 14, color: '#888' }}>Pulling latest stories from Google News…</span>
          </div>
        )}

        {/* Background refresh banner when articles are already visible */}
        {(ingesting || hasPendingArticles) && filtered.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 16px', marginBottom: 16, borderRadius: 4,
            background: '#f5f5f5', border: '1px solid #e8e8e8', fontSize: 13, color: '#666',
          }}>
            <RefreshCw style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} />
            {activeSearch
              ? `Fetching latest stories for "${activeSearch}"…`
              : ingesting
                ? 'Updating feed — new stories appear below while AI enriches summaries…'
                : 'AI is enriching summaries in the background…'}
          </div>
        )}

        {/* No articles */}
        {!loading && !ingesting && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 16, color: '#888', fontWeight: 600 }}>No stories found</p>
            <p style={{ fontSize: 13, color: '#bbb', marginTop: 6 }}>{activeSearch ? `No results for "${activeSearch}". Try a different topic.` : 'Try another category or click Update Feed.'}</p>
          </div>
        )}

        {filtered.length > 0 && (
          <>
            {/* 3-column grid: LEFT (240px) | CENTER (flex) | RIGHT (240px) */}
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 240px', gap: '0 24px', marginBottom: 36 }}>

              {/* ── LEFT COLUMN ────────────────────────────────────────────── */}
              <aside style={{ borderRight: '1px solid #ebebeb', paddingRight: 24 }}>
                <div style={{ borderBottom: '2px solid #111', paddingBottom: 8, marginBottom: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#111' }}>Top Stories</span>
                </div>
                {leftFeed.map((a, i) => <CompactCard key={a.id} article={a} showDivider={i > 0} index={i} />)}
              </aside>

              {/* ── CENTER COLUMN ──────────────────────────────────────────── */}
              <div style={{ borderRight: '1px solid #ebebeb', paddingRight: 24 }}>
                {/* Hero */}
                {centerHero && (
                  <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #ebebeb' }}>
                    <FeatureCard article={centerHero} index={0} />
                  </div>
                )}
                {/* 2×2 card grid */}
                {centerGrid.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {centerGrid.map((a, i) => <GridCard key={a.id} article={a} index={i + 1} />)}
                  </div>
                )}
              </div>

              {/* ── RIGHT COLUMN ───────────────────────────────────────────── */}
              <aside style={{ paddingLeft: 0 }}>
                <div style={{ borderBottom: '2px solid #111', paddingBottom: 8, marginBottom: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#111' }}>Latest News</span>
                </div>
                {rightFeed.map((a, i) => <SidebarItem key={a.id} article={a} rank={i + 1} index={i} />)}
              </aside>
            </div>

            {/* ── Section row: more stories ─────────────────────────────────── */}
            {filtered.slice(11).length > 0 && (
              <section style={{ marginBottom: 36 }}>
                <SectionHead title={sectionTitle} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {filtered.slice(11, 15).map((a, i) => <GridCard key={a.id} article={a} index={i} />)}
                </div>
              </section>
            )}

            {/* ── Extra stories ─────────────────────────────────────────────── */}
            {filtered.slice(15).length > 0 && (
              <section style={{ marginBottom: 36 }}>
                <SectionHead title="All Reports" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {filtered.slice(15).map((a, i) => <GridCard key={a.id} article={a} index={i} />)}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#111', color: '#ccc', marginTop: 20, borderTop: '3px solid #c62828' }}>
        <div style={{ maxWidth: 1260, margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 40, marginBottom: 32 }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 12, letterSpacing: '-0.02em' }}>
                INDIA REPORTS
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.75, color: '#777', maxWidth: 340 }}>
                An autonomous AI-powered news platform. Click Update Feed to pull the latest stories — our pipeline extracts full text via Firecrawl and synthesizes structured summaries using Gemini 1.5 Flash.
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', marginBottom: 16 }}>Sections</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {NAV_ITEMS.filter(n => n !== 'Home').map(n => (
                  <button key={n} onClick={() => { setActiveNav(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    style={{ background: 'none', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer', textAlign: 'left', padding: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#888')}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', marginBottom: 16 }}>Powered By</h4>
              {['Gemini 1.5 Flash · AI', 'Firecrawl · Scraping', 'Supabase · Database', 'Upstash Redis · Cache', 'Currents API · News', 'Next.js · Frontend'].map(t => (
                <div key={t} style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>{t}</div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #222', paddingTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#555' }}>
            <span>© 2026 India Reports. All Rights Reserved.</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Pipeline Active — Manual updates via Update Feed
            </span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cardEntrance {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .card-entrance {
          animation: cardEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes imageFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .img-fade-in {
          animation: imageFadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
