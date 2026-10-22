import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { mockFaqsVi, mockFaqsEn } from '../data/mockData';

interface FaqSectionProps {
  lang: 'vi' | 'en';
}

export const FaqSection: React.FC<FaqSectionProps> = ({ lang }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = lang === 'vi' ? mockFaqsVi : mockFaqsEn;

  const t = {
    eyebrow: lang === 'vi' ? 'Câu hỏi thường gặp' : 'Frequently asked questions',
    title: lang === 'vi'
      ? 'Thông tin nhanh trước khi tạo tài khoản'
      : 'Quick info before creating an account',
    desc: lang === 'vi'
      ? 'Các giải đáp dưới đây giúp bạn hiểu rõ tính năng miễn phí, cách luyện nói và chấm điểm phát âm trên OpenQuiz.'
      : 'The answers below help you understand what\'s free, what relates to speaking practice, and what pronunciation scoring covers.',
  };

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="border-b py-16 md:py-24 bg-muted/10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {t.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {t.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
            {t.desc}
          </p>
        </div>

        {/* Accordion list */}
        <div className="mt-12 divide-y divide-border rounded-[16px] border bg-card shadow-sm overflow-hidden">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="transition-colors">
                <h3>
                  <button
                    type="button"
                    onClick={() => toggle(idx)}
                    className="flex w-full items-center justify-between p-5 text-left text-base font-bold text-foreground hover:bg-muted/40 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="pr-4">{faq.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
                      }`}
                    />
                  </button>
                </h3>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm leading-relaxed text-muted-foreground animate-in slide-in-from-top-1 duration-200">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

