import React from 'react';
import { Article } from '../lib/api';
import { ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ArticleCardProps {
  article: Article;
}

export function ArticleCard({ article }: ArticleCardProps) {
  // Split the 3-sentence summary by sentence boundaries (periods followed by space)
  const sentences = article.summary
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Sentiment styling configurations
  const sentimentConfig = {
    Positive: {
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: <TrendingUp className="w-3.5 h-3.5 mr-1" />
    },
    Negative: {
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: <TrendingDown className="w-3.5 h-3.5 mr-1" />
    },
    Neutral: {
      color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
      icon: <Minus className="w-3.5 h-3.5 mr-1" />
    }
  }[article.sentiment] || {
    color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    icon: <Minus className="w-3.5 h-3.5 mr-1" />
  };

  const formattedDate = new Date(article.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 group">
      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {article.categories.map((cat) => (
              <span
                key={cat}
                className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
              >
                {cat}
              </span>
            ))}
          </div>

          <div className={`flex items-center px-2 py-0.5 border rounded text-[10px] font-bold uppercase tracking-wider ${sentimentConfig.color}`}>
            {sentimentConfig.icon}
            {article.sentiment}
          </div>
        </div>

        {/* Headline */}
        <h3 className="text-lg font-bold text-zinc-100 mb-2 leading-snug line-clamp-2 group-hover:text-red-400 transition-colors">
          {article.headline}
        </h3>

        {/* Source & Date */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 mb-4">
          <span className="font-semibold text-zinc-400">{article.sourceName}</span>
          <span>•</span>
          <span>{formattedDate}</span>
        </div>

        {/* Bullet Points */}
        <ul className="space-y-2.5 mb-6 text-sm text-zinc-300">
          {sentences.map((sentence, idx) => (
            <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0 opacity-80" />
              <span>{sentence}</span>
            </li>
          ))}
          {sentences.length === 0 && (
            <li className="text-zinc-500 italic">Summary unavailable.</li>
          )}
        </ul>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-zinc-800/80 flex justify-end">
        <a
          href={article.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors group/link"
        >
          Read Source
          <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
        </a>
      </div>
    </div>
  );
}
