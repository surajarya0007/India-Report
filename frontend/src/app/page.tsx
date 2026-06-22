'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useNews } from '../hooks/useNews';
import { Article } from '../lib/api';
import { Clock, RefreshCw, ChevronRight } from 'lucide-react';
import Layout from '../components/Layout';
import ShareDialog from '../components/ShareDialog';
import ScrollReveal from '../components/ScrollReveal';

import ImageSourceBadge from '../components/ImageSourceBadge';

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
        <ImageSourceBadge imageUrl={article.imageUrl} />
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
    <div style={{ display: 'flex', background: 'var(--ticker-bg)', overflow: 'hidden', borderBottom: '1px solid rgba(0,0,0,0.15)' }}>
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 14px',
        background: 'var(--ticker-label-bg)', color: '#fff', fontSize: 10, fontWeight: 800,
        letterSpacing: '0.15em', textTransform: 'uppercase', whiteSpace: 'nowrap',
        borderRight: '2px solid rgba(0,0,0,0.15)', gap: 6, height: 36,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
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
          fontFamily: 'var(--font-serif)',
          fontSize: 22, fontWeight: 800, lineHeight: 1.25, marginTop: 8, marginBottom: 8,
          color: hov ? 'var(--ir-crimson)' : 'var(--color-ink)', transition: 'color 0.2s',
        }}>
          {article.headline}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-ink-muted)', lineHeight: 1.65, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {firstSentence}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-ink-faint)' }}>
          <Clock style={{ width: 11, height: 11 }} />
          <span>{timeAgo(article.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

function CompactCard({ article, showDivider = true, index = 0 }: { article: Article; showDivider?: boolean; index?: number }) {
  const router = useRouter();
  const [hov, setHov] = useState(false);
  return (
    <>
      {showDivider && <div style={{ height: 1, background: 'var(--border-secondary)', margin: '0' }} />}
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
            fontFamily: 'var(--font-serif)',
            fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginTop: 5,
            color: hov ? 'var(--ir-crimson)' : 'var(--color-ink)', transition: 'color 0.2s',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {article.headline}
          </h3>
          <div style={{ fontSize: 11, color: 'var(--color-ink-ghost)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock style={{ width: 10, height: 10 }} />
            {timeAgo(article.createdAt)}
          </div>
        </div>
      </div>
    </>
  );
}

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
        border: '1px solid var(--border-primary)',
        boxShadow: hov ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transition: 'box-shadow 0.25s',
        animationDelay: `${index * 50}ms`,
        background: 'var(--bg-elevated)',
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
          fontFamily: 'var(--font-serif)',
          fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginTop: 7, marginBottom: 5,
          color: hov ? 'var(--ir-crimson)' : 'var(--color-ink)', transition: 'color 0.2s',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {article.headline}
        </h3>
        <p style={{ fontSize: 12, color: 'var(--color-ink-muted)', lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {firstSentence}
        </p>
        <div style={{ fontSize: 11, color: 'var(--color-ink-ghost)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock style={{ width: 10, height: 10 }} />
          {timeAgo(article.createdAt)}
        </div>
      </div>
    </div>
  );
}

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
        borderBottom: '1px solid var(--border-faint)', cursor: 'pointer',
        animationDelay: `${index * 50}ms`,
      }}
    >
      <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--border-primary)', fontFamily: 'Georgia, serif', lineHeight: 1, flexShrink: 0, minWidth: 26, textAlign: 'right' }}>
        {String(rank).padStart(2, '0')}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <CatTag cat={article.categories?.[0]} />
          {article.enrichmentStatus === 'pending' && <EnrichingBadge />}
        </div>
        <h4 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 13, fontWeight: 700, lineHeight: 1.35, marginTop: 5,
          color: hov ? 'var(--ir-crimson)' : 'var(--color-ink)', transition: 'color 0.2s',
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {article.headline}
        </h4>
        <div style={{ fontSize: 11, color: 'var(--color-ink-ghost)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 10, borderBottom: '2px solid var(--color-ink)' }}>
      <div style={{ width: 4, height: 20, background: 'var(--ir-crimson)', borderRadius: 2, flexShrink: 0 }} />
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 900, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>{title}</h2>
      <div style={{ flex: 1, height: 1, background: 'var(--border-primary)', marginLeft: 4 }} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeNav, setActiveNav] = useState('Home');
  const [activeSearch, setActiveSearch] = useState<string | undefined>(undefined);
  const { articles, loading, ingesting, hasPendingArticles, refresh, triggerIngest, searchNews } = useNews(activeNav, activeSearch);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

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

  const handleSearch = async (q: string) => {
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

  const handleNavChange = (nav: string) => {
    setActiveNav(nav);
    setActiveSearch(undefined);
    setSearchQuery('');
  };

  // Layout slots
  const isCategoryView = activeNav !== 'Home' && !activeSearch;
  
  const topStories = isCategoryView
    ? filtered.filter(a => a.categories?.[0] === activeNav)
    : filtered;

  const bottomStories = isCategoryView
    ? filtered.filter(a => a.categories?.includes(activeNav) && a.categories?.[0] !== activeNav)
    : filtered.slice(11);

  const centerHero = topStories[0];
  const centerGrid = topStories.slice(1, 5);
  const leftFeed = topStories.slice(5, 9);
  const rightFeed = topStories.slice(9, 15);

  const sectionTitle = activeSearch 
    ? `Results for "${activeSearch}"` 
    : activeNav === 'Home' 
      ? 'More Stories' 
      : `Related ${activeNav} Stories`;

  return (
    <Layout
      activeNav={activeNav}
      onNavChange={handleNavChange}
      onSearch={handleSearch}
      onIngest={handleIngest}
      ingesting={ingesting}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      showNav={true}
      showBreakingTicker={true}
      breakingArticles={articles.slice(0, 6)}
    >
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          background: toast.ok ? '#14532d' : '#7f1d1d',
          color: '#fff', padding: '10px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600,
          boxShadow: 'var(--shadow-lg)', animation: 'fadeIn 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="ir-container" style={{ padding: '24px 20px' }}>

        {/* Full-page loader */}
        {loading && filtered.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0', gap: 12 }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--ir-crimson)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 14, color: 'var(--color-ink-faint)' }}>
              {`Looking for "${searchQuery || activeSearch || 'your topic'}" in database…`}
            </span>
          </div>
        )}

        {/* Ingest loading */}
        {ingesting && !loading && filtered.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0', gap: 12 }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--ir-crimson)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 14, color: 'var(--color-ink-faint)' }}>Pulling latest stories from Google News…</span>
          </div>
        )}

        {/* Background refresh banner */}
        {(ingesting || hasPendingArticles) && filtered.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 16px', marginBottom: 16, borderRadius: 4,
            background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', fontSize: 13, color: 'var(--color-ink-muted)',
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
            <p style={{ fontSize: 16, color: 'var(--color-ink-faint)', fontWeight: 600 }}>No stories found</p>
            <p style={{ fontSize: 13, color: 'var(--color-ink-ghost)', marginTop: 6 }}>{activeSearch ? `No results for "${activeSearch}". Try a different topic.` : 'Try another category or click Update Feed.'}</p>
          </div>
        )}

        {(topStories.length > 0 || bottomStories.length > 0) && (
          <>
            {/* 3-column grid */}
            {topStories.length > 0 && (
              <div className="ir-home-grid" style={{ display: 'grid', gridTemplateColumns: '240px 1fr 240px', gap: '0 24px', marginBottom: 36 }}>

                {/* LEFT COLUMN */}
                <aside style={{ borderRight: '1px solid var(--border-secondary)', paddingRight: 24 }}>
                  <div style={{ borderBottom: '2px solid var(--color-ink)', paddingBottom: 8, marginBottom: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-ink)' }}>Top Stories</span>
                  </div>
                  {leftFeed.map((a, i) => <CompactCard key={a.id} article={a} showDivider={i > 0} index={i} />)}
                </aside>

                {/* CENTER COLUMN */}
                <div style={{ borderRight: '1px solid var(--border-secondary)', paddingRight: 24 }}>
                  {centerHero && (
                    <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border-secondary)' }}>
                      <FeatureCard article={centerHero} index={0} />
                    </div>
                  )}
                  {centerGrid.length > 0 && (
                    <div className="ir-center-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {centerGrid.map((a, i) => <GridCard key={a.id} article={a} index={i + 1} />)}
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN */}
                <aside style={{ paddingLeft: 0 }}>
                  <div style={{ borderBottom: '2px solid var(--color-ink)', paddingBottom: 8, marginBottom: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-ink)' }}>Latest News</span>
                  </div>
                  {rightFeed.map((a, i) => <SidebarItem key={a.id} article={a} rank={i + 1} index={i} />)}
                </aside>
              </div>
            )}

            {/* Section row: more stories */}
            {bottomStories.length > 0 && (
              <ScrollReveal>
                <section style={{ marginBottom: 36 }}>
                  <SectionHead title={sectionTitle} />
                  <div className="ir-more-stories-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {bottomStories.slice(0, 4).map((a, i) => <GridCard key={a.id} article={a} index={i} />)}
                  </div>
                </section>
              </ScrollReveal>
            )}

            {/* Extra stories */}
            {bottomStories.slice(4).length > 0 && (
              <ScrollReveal>
                <section style={{ marginBottom: 36 }}>
                  <SectionHead title={isCategoryView ? "Other Related Reports" : "All Reports"} />
                  <div className="ir-more-stories-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {bottomStories.slice(4).map((a, i) => <GridCard key={a.id} article={a} index={i} />)}
                  </div>
                </section>
              </ScrollReveal>
            )}
          </>
        )}
      </main>
    </Layout>
  );
}
