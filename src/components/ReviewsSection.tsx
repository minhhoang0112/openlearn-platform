import React from 'react';
import { Star } from 'lucide-react';
import { mockReviews } from '../data/mockData';

interface ReviewsSectionProps {
  lang: 'vi' | 'en';
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ lang }) => {
  const t = {
    eyebrow: lang === 'vi' ? 'Đánh giá từ người dùng' : 'What users say',
    title: lang === 'vi' 
      ? 'Ấn tượng thực tế từ người học' 
      : 'Real impressions from real learners',
  };

  return (
    <section className="border-b py-16 bg-muted/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {t.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {t.title}
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockReviews.map((rev) => (
            <div
              key={rev.id}
              className="rounded-[12px] border bg-card p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1 text-amber-500 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed italic">
                  "{rev.content}"
                </p>
              </div>

              <div className="mt-5 pt-3 border-t flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary uppercase">
                    {rev.avatar}
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {rev.author}
                  </span>
                </div>
                {rev.favoriteFeature && (
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    {rev.favoriteFeature}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

