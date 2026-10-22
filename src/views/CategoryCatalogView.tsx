import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext';
import {
  ArrowLeft,
  ShieldCheck,
  User,
  ChevronRight,
  BookOpen,
  Sparkles
} from 'lucide-react';

interface CatalogCardItem {
  id: number;
  title: string;
  verified?: boolean;
  learningLang: 'en';
  nativeLang: 'vi' | 'en';
  setsCount: number;
  author: string;
  level: 'basic' | 'intermediate' | 'advanced';
}

interface CatalogGroup {
  groupTitle: string;
  items: CatalogCardItem[];
}

export const CategoryCatalogView: React.FC = () => {
  const { path, params, navigate, goBack } = useRouter();

  // Determine category from path or param
  // /category/nen-tang, /category/toeic, /category/cong-viec
  let categoryKey = 'nen-tang';
  if (path.includes('toeic')) categoryKey = 'toeic';
  if (path.includes('cong-viec') || path.includes('career')) categoryKey = 'cong-viec';

  const [levelFilter, setLevelFilter] = useState<'all' | 'basic' | 'intermediate' | 'advanced'>('all');

  // Exact data mapping corresponding 100% to OpenQuiz real screenshots
  const catalogData: Record<string, { title: string; groups: CatalogGroup[] }> = {
    'nen-tang': {
      title: 'Nền tảng',
      groups: [
        {
          groupTitle: 'Essential Word Forms - by OpenQuiz',
          items: [
            {
              id: 39443,
              title: 'English Word Form Mastery Path',
              verified: true,
              learningLang: 'en',
              nativeLang: 'vi',
              setsCount: 20,
              author: 'Openquiz Team',
              level: 'intermediate'
            }
          ]
        },
        {
          groupTitle: 'Cơ Bản - Lấy gốc tiếng Anh',
          items: [
            {
              id: 20269,
              title: 'Lộ trình A1-A2 tiếng Anh',
              verified: false,
              learningLang: 'en',
              nativeLang: 'vi',
              setsCount: 20,
              author: 'Openquiz Team',
              level: 'basic'
            },
            {
              id: 20269,
              title: 'A1–A2 English Learning Path',
              verified: false,
              learningLang: 'en',
              nativeLang: 'en',
              setsCount: 20,
              author: 'Openquiz Team',
              level: 'basic'
            }
          ]
        },
        {
          groupTitle: 'Nâng tầm giao tiếp',
          items: [
            {
              id: 102453,
              title: 'Lộ trình làm chủ Chunking để giao tiếp trôi chảy - by OpenQuiz',
              verified: true,
              learningLang: 'en',
              nativeLang: 'vi',
              setsCount: 10,
              author: 'Openquiz Team',
              level: 'intermediate'
            }
          ]
        },
        {
          groupTitle: 'Nâng tầm từ vựng',
          items: [
            {
              id: 20271,
              title: 'C1-C2 Everyday English',
              verified: false,
              learningLang: 'en',
              nativeLang: 'vi',
              setsCount: 20,
              author: 'Openquiz Team',
              level: 'advanced'
            },
            {
              id: 20271,
              title: 'C1–C2 Everyday English',
              verified: false,
              learningLang: 'en',
              nativeLang: 'en',
              setsCount: 20,
              author: 'Openquiz Team',
              level: 'advanced'
            }
          ]
        },
        {
          groupTitle: 'Nền tảng - Bổ sung từ vựng',
          items: [
            {
              id: 20270,
              title: 'B1-B2 Everyday English',
              verified: false,
              learningLang: 'en',
              nativeLang: 'vi',
              setsCount: 20,
              author: 'Openquiz Team',
              level: 'intermediate'
            },
            {
              id: 20270,
              title: 'B1–B2 Everyday English',
              verified: false,
              learningLang: 'en',
              nativeLang: 'en',
              setsCount: 20,
              author: 'Openquiz Team',
              level: 'intermediate'
            }
          ]
        }
      ]
    },
    'toeic': {
      title: 'TOEIC',
      groups: [
        {
          groupTitle: 'OpenQuiz đề xuất',
          items: [
            {
              id: 14,
              title: '600 Essential words for the TOEIC Exam',
              verified: true,
              learningLang: 'en',
              nativeLang: 'vi',
              setsCount: 50,
              author: 'Openquiz Team',
              level: 'intermediate'
            },
            {
              id: 15,
              title: '600 Essential Words for the TOEIC Exam',
              verified: true,
              learningLang: 'en',
              nativeLang: 'en',
              setsCount: 50,
              author: 'Openquiz Team',
              level: 'intermediate'
            }
          ]
        },
        {
          groupTitle: 'Essential Word Forms - by OpenQuiz',
          items: [
            {
              id: 39443,
              title: 'English Word Form Mastery Path',
              verified: true,
              learningLang: 'en',
              nativeLang: 'vi',
              setsCount: 20,
              author: 'Openquiz Team',
              level: 'intermediate'
            }
          ]
        }
      ]
    },
    'cong-viec': {
      title: 'Công việc',
      groups: [
        {
          groupTitle: 'Chuyên ngành Cơ khí - Kỹ thuật',
          items: [
            {
              id: 20274,
              title: 'English for Technical Work',
              verified: false,
              learningLang: 'en',
              nativeLang: 'vi',
              setsCount: 10,
              author: 'Openquiz Team',
              level: 'intermediate'
            },
            {
              id: 20274,
              title: 'English for Technical Work',
              verified: false,
              learningLang: 'en',
              nativeLang: 'en',
              setsCount: 10,
              author: 'Openquiz Team',
              level: 'intermediate'
            }
          ]
        },
        {
          groupTitle: 'Chuyên ngành Kinh tế',
          items: [
            {
              id: 20276,
              title: 'English for Business',
              verified: false,
              learningLang: 'en',
              nativeLang: 'vi',
              setsCount: 10,
              author: 'Openquiz Team',
              level: 'intermediate'
            },
            {
              id: 20276,
              title: 'English for Business',
              verified: false,
              learningLang: 'en',
              nativeLang: 'en',
              setsCount: 10,
              author: 'Openquiz Team',
              level: 'intermediate'
            }
          ]
        },
        {
          groupTitle: 'Chuyên ngành Y-Dược',
          items: [
            {
              id: 205,
              title: 'Tiếng Anh Y Tế Cơ Bản',
              verified: false,
              learningLang: 'en',
              nativeLang: 'vi',
              setsCount: 10,
              author: 'Openquiz Team',
              level: 'basic'
            },
            {
              id: 206,
              title: 'Basic Medical English',
              verified: false,
              learningLang: 'en',
              nativeLang: 'en',
              setsCount: 10,
              author: 'Openquiz Team',
              level: 'basic'
            }
          ]
        },
        {
          groupTitle: 'Ngành IT - Công Nghệ',
          items: [
            {
              id: 207,
              title: 'English for Technology',
              verified: false,
              learningLang: 'en',
              nativeLang: 'vi',
              setsCount: 10,
              author: 'Openquiz Team',
              level: 'intermediate'
            },
            {
              id: 208,
              title: 'English for Technology',
              verified: false,
              learningLang: 'en',
              nativeLang: 'en',
              setsCount: 10,
              author: 'Openquiz Team',
              level: 'intermediate'
            }
          ]
        }
      ]
    }
  };

  const currentCategory = catalogData[categoryKey] || catalogData['nen-tang'];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* 1. Header Bar: Back Arrow, Category Title, Filter Pills */}
      <div className="space-y-5">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => goBack()}
            className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {currentCategory.title}
          </h1>
        </div>

        {/* Filter Pills matching the screenshot exactly */}
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'basic', label: 'Cơ bản' },
            { id: 'intermediate', label: 'Trung cấp' },
            { id: 'advanced', label: 'Nâng cao' },
          ].map((pill) => {
            const isSelected = levelFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setLevelFilter(pill.id as any)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Sub-categories and 2-column cards layout */}
      <div className="space-y-9">
        {currentCategory.groups.map((grp, gIdx) => {
          const visibleItems = grp.items.filter((item) => {
            if (levelFilter === 'all') return true;
            return item.level === levelFilter;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={gIdx} className="space-y-3.5">
              {/* Group Heading */}
              <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {grp.groupTitle}
              </h2>

              {/* 2-Column Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleItems.map((item) => {
                  return (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/learning-path/${item.id}`)}
                      className="group bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition cursor-pointer flex flex-col justify-between min-h-[140px]"
                    >
                      {/* Top: Title & Verified Shield */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition leading-snug">
                          {item.title}
                        </h3>
                        {item.verified && (
                          <div className="shrink-0 text-blue-500 mt-0.5" title="Xác thực bởi OpenQuiz">
                            <ShieldCheck className="w-4 h-4 fill-blue-50 text-blue-600" />
                          </div>
                        )}
                      </div>

                      {/* Middle: Flags pair */}
                      <div className="flex items-center gap-2 py-3 text-sm">
                        <span>🇬🇧</span>
                        <span className="w-8 h-px bg-slate-300 dark:bg-slate-700 inline-block" />
                        <span>{item.nativeLang === 'vi' ? '🇻🇳' : '🇬🇧'}</span>
                      </div>

                      {/* Bottom Tags: Count & Author */}
                      <div className="flex items-center gap-2 pt-1 text-[11px]">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                          {item.setsCount} Bộ thẻ
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{item.author}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
