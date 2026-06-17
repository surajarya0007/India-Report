import React from 'react';

interface SentimentFilterProps {
  sentimentFilter: 'All' | 'Positive';
  setSentimentFilter: (value: 'All' | 'Positive') => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  availableCategories: string[];
}

export function SentimentFilter({
  sentimentFilter,
  setSentimentFilter,
  categoryFilter,
  setCategoryFilter,
  availableCategories
}: SentimentFilterProps) {
  // Static list of possible categories from spec, plus "All"
  const defaultCategories = ['All', 'Tech', 'Business', 'Science', 'Health', 'Entertainment', 'Finance'];

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-zinc-900/40 backdrop-blur-md border border-zinc-800 p-4 rounded-xl mb-8">
      {/* Sentiment Toggles */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Filter by Sentiment</span>
        <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 w-fit">
          <button
            onClick={() => setSentimentFilter('All')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              sentimentFilter === 'All'
                ? 'bg-zinc-800 text-zinc-100 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All News
          </button>
          <button
            onClick={() => setSentimentFilter('Positive')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              sentimentFilter === 'Positive'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${sentimentFilter === 'Positive' ? 'bg-white' : 'bg-emerald-500'}`} />
            Only Positive News
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Filter by Category</span>
        <div className="flex flex-wrap gap-2">
          {defaultCategories.map((category) => {
            const isActive = categoryFilter === category;
            return (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-900/20'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
