'use client';

import React, { useState } from 'react';
import { useNews } from '../hooks/useNews';
import { NewsTicker } from '../components/NewsTicker';
import { SentimentFilter } from '../components/SentimentFilter';
import { ArticleCard } from '../components/ArticleCard';
import { RefreshCw, Cpu, Database, Server, ShieldAlert } from 'lucide-react';

export default function Home() {
  const {
    articles,
    filteredArticles,
    loading,
    ingesting,
    error,
    sentimentFilter,
    setSentimentFilter,
    categoryFilter,
    setCategoryFilter,
    availableCategories,
    refresh,
    triggerIngest
  } = useNews();

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleManualIngest = async () => {
    setNotification(null);
    const result = await triggerIngest();
    if (result.success) {
      setNotification({
        message: `Successfully completed. Ingested: ${result.ingestedCount}, Skipped: ${result.skippedCount}, Errors: ${result.errorsCount}`,
        type: 'success'
      });
    } else {
      setNotification({
        message: result.message || 'Ingestion pipeline execution failed.',
        type: 'error'
      });
    }
    // Clear notification after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Compute stats
  const positiveCount = articles.filter(a => a.sentiment === 'Positive').length;
  const positivePercentage = articles.length > 0 ? Math.round((positiveCount / articles.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Header / Brand */}
      <header className="border-b border-zinc-800 bg-zinc-900/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-orange-500 via-white to-emerald-600 flex items-center justify-center p-[2px] shadow-lg shadow-orange-500/10">
              <div className="w-full h-full bg-zinc-950 rounded-[6px] flex items-center justify-center font-black text-sm text-transparent bg-clip-text bg-gradient-to-tr from-orange-400 via-zinc-100 to-emerald-400">
                IR
              </div>
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-zinc-100 to-emerald-500">
                INDIA REPORTS
              </span>
              <span className="text-[10px] block font-mono text-zinc-500 tracking-widest uppercase">Autonomous News Platform</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refresh()}
              disabled={loading || ingesting}
              className="p-2 text-zinc-400 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
              title="Refresh News Feed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleManualIngest}
              disabled={loading || ingesting}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-emerald-600 hover:from-orange-500 hover:to-emerald-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 cursor-pointer"
            >
              <Cpu className={`w-4 h-4 ${ingesting ? 'animate-pulse' : ''}`} />
              {ingesting ? 'Running Ingestion...' : 'Trigger Pipeline'}
            </button>
          </div>
        </div>
      </header>

      {/* Breaking News Marquee */}
      <NewsTicker articles={articles} />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow w-full">
        {/* Banner/Hero Section */}
        <div className="mb-10 text-center md:text-left relative overflow-hidden bg-gradient-to-br from-zinc-900/50 via-zinc-900/10 to-transparent p-6 sm:p-8 rounded-2xl border border-zinc-800/60">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Autonomous News Intelligence
          </h1>
          <p className="text-zinc-400 max-w-2xl text-sm sm:text-base leading-relaxed mb-6">
            Monitored, scraped, synthesized, and categorized entirely by AI. Updated automatically every 15 minutes. Powered by Firecrawl extraction, Gemini 1.5 Flash structured synthesis, and Upstash Redis caching.
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-zinc-500 font-medium block">Total Articles</span>
                <span className="text-lg font-bold text-zinc-200">{articles.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-zinc-500 font-medium block">Positive Sentiment</span>
                <span className="text-lg font-bold text-zinc-200">{positivePercentage}%</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-zinc-500 font-medium block">Active Sources</span>
                <span className="text-lg font-bold text-zinc-200">
                  {new Set(articles.map(a => a.sourceName)).size}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
                <div className="w-5 h-5 flex items-center justify-center font-bold text-xs">OK</div>
              </div>
              <div>
                <span className="text-xs text-zinc-500 font-medium block">Pipeline Status</span>
                <span className="text-lg font-bold text-emerald-400 animate-pulse flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Live
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className={`p-4 rounded-xl border mb-6 flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            notification.type === 'success' 
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' 
              : 'bg-rose-950/30 border-rose-500/30 text-rose-400'
          }`}>
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">{notification.type === 'success' ? 'Ingestion Success' : 'Pipeline Alert'}</p>
              <p className="text-xs opacity-90">{notification.message}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-400 mb-6 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Feed Error</p>
              <p className="text-xs opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Interactive Filter Toggles */}
        <SentimentFilter
          sentimentFilter={sentimentFilter}
          setSentimentFilter={setSentimentFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          availableCategories={availableCategories}
        />

        {/* News Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-zinc-500 text-sm font-medium">Fetching reports from database...</span>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-20 border border-zinc-800/50 rounded-2xl bg-zinc-900/10">
            <Cpu className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
            <h3 className="text-base font-bold text-zinc-400 mb-1">No articles match your criteria</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
              {sentimentFilter === 'Positive' 
                ? 'Try turning off "Only Positive News" or click "Trigger Pipeline" to ingest fresh articles.'
                : 'Try selecting another category or click "Trigger Pipeline" to scan the web.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-8 text-center text-xs text-zinc-600">
        <p>© 2026 India Reports. Driven by Autonomous AI Agents. All Rights Reserved.</p>
        <p className="mt-1 text-zinc-700 font-mono">Status: Connected to Supabase & Redis Cache</p>
      </footer>
    </div>
  );
}
