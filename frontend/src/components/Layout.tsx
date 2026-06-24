'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from './Header';
import Footer from './Footer';
import DisclaimerModal from './DisclaimerModal';
import { Article, fetchNews } from '../lib/api';
import { articlePath } from '../lib/seo';
import { Clock } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
  showBreakingTicker?: boolean;
  breakingArticles?: Article[];
  activeNav?: string;
  onNavChange?: (nav: string) => void;
  onSearch?: (query: string) => void;
  onIngest?: () => void;
  ingesting?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
}

// Breaking ticker component (extracted from page.tsx)
function BreakingTicker({ articles = [] }: { articles?: Article[] }) {
  const items = articles.length > 0
    ? [...articles, ...articles]
    : [
        { id: '', headline: 'India Reports: AI-Powered News Platform — Updated On Demand' },
        { id: '', headline: 'Breaking coverage from India and the world, synthesized by Gemini 1.5 Flash' },
        { id: '', headline: 'Live pipeline: Firecrawl extraction • Supabase storage • Upstash caching' }
      ];

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
          {items.map((item, i) => (
            item.id ? (
              <Link
                key={i}
                href={articlePath('categories' in item && item.categories?.[0] ? item.categories[0] : 'news', item.headline)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: '#fff',
                  fontSize: 13,
                  padding: '0 28px',
                  whiteSpace: 'nowrap',
                  gap: 10,
                  textDecoration: 'none',
                }}
                className="ticker-item-clickable"
              >
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'inline-block', flexShrink: 0 }} />
                {item.headline}
              </Link>
            ) : (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: '#fff',
                  fontSize: 13,
                  padding: '0 28px',
                  whiteSpace: 'nowrap',
                  gap: 10,
                  cursor: 'default',
                }}
              >
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'inline-block', flexShrink: 0 }} />
                {item.headline}
              </span>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Layout({
  children,
  showNav = true,
  showBreakingTicker = true,
  breakingArticles = [],
  activeNav = 'Home',
  onNavChange,
  onSearch,
  onIngest,
  ingesting = false,
  searchQuery = '',
  onSearchQueryChange,
}: LayoutProps) {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [tickerNews, setTickerNews] = useState<Article[]>(breakingArticles);

  useEffect(() => {
    if (breakingArticles.length > 0) {
      setTickerNews(breakingArticles);
      return;
    }

    if (!showBreakingTicker) {
      return;
    }

    let cancelled = false;

    fetchNews()
      .then((all) => {
        if (!cancelled) {
          setTickerNews(all.slice(0, 8));
        }
      })
      .catch((err) => {
        console.error('[Layout] Failed to fetch ticker news:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [breakingArticles, showBreakingTicker]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)' }}>
      <Header
        activeNav={activeNav}
        onNavChange={onNavChange}
        onSearch={onSearch}
        onIngest={onIngest}
        ingesting={ingesting}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        showNav={showNav}
        onDisclaimerClick={() => setDisclaimerOpen(true)}
      />

      {showBreakingTicker && <BreakingTicker articles={tickerNews} />}

      <div style={{ flex: 1 }}>
        {children}
      </div>

      <Footer onNavChange={onNavChange} onDisclaimerClick={() => setDisclaimerOpen(true)} />

      <DisclaimerModal isOpen={disclaimerOpen} onClose={() => setDisclaimerOpen(false)} />

      {/* Keyframe for pulse animation if needed */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
