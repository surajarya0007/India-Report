import React from 'react';
import { Article } from '../lib/api';

interface NewsTickerProps {
  articles: Article[];
}

export function NewsTicker({ articles }: NewsTickerProps) {
  if (!articles || articles.length === 0) {
    return (
      <div className="bg-zinc-900 border-y border-zinc-800 text-zinc-400 py-2.5 text-sm overflow-hidden whitespace-nowrap">
        <div className="max-w-7xl mx-auto px-4 flex items-center">
          <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-xs mr-3 tracking-wider uppercase">Live</span>
          <span>Waiting for latest news reports from India...</span>
        </div>
      </div>
    );
  }

  // Duplicate the list to create a seamless infinite loop marquee
  const tickerItems = [...articles, ...articles];

  return (
    <div className="bg-zinc-950 border-y border-zinc-800 text-zinc-300 py-3 text-sm overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-zinc-950 to-transparent w-16 z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-zinc-950 to-transparent w-16 z-10 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 flex items-center">
        <span className="bg-red-600 text-white font-extrabold px-3 py-1 rounded text-xs mr-4 tracking-wider uppercase shrink-0 shadow-lg shadow-red-900/30">
          Trending
        </span>
        <div className="overflow-hidden flex w-full">
          <div className="animate-marquee flex items-center gap-12">
            {tickerItems.map((article, index) => (
              <div key={`${article.id}-${index}`} className="flex items-center gap-2 font-medium shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span className="hover:text-red-400 transition-colors cursor-pointer">{article.headline}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
