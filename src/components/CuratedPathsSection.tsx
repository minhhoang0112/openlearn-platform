import React from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';
import { catalog, languages } from '../data/catalog';

export const CuratedPathsSection: React.FC<{ lang: 'vi' | 'en'; onSelectCourse: (id: string) => void; onBrowse: () => void }> = ({ lang, onSelectCourse, onBrowse }) => (
  <section id="paths" className="border-b py-16">
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <p className="section-eyebrow">{lang === 'vi' ? 'Lộ trình học sẵn có' : 'Ready-made learning paths'}</p>
      <h2 className="section-title">{lang === 'vi' ? 'Bắt đầu ngay với lộ trình từ vựng biên soạn sẵn' : 'Start immediately with curated vocab paths'}</h2>
      <p className="mt-4 max-w-3xl text-muted-foreground">{lang === 'vi' ? 'Khám phá các lộ trình theo ngôn ngữ và mục tiêu học tập của bạn.' : 'Explore learning paths for your language and learning goals.'}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {languages.map(language => <div key={language.id} className="rounded-xl border bg-card p-5">
          <h3 className="mb-5 font-bold"><span className="mr-2 text-xl">{language.flag}</span>{language[lang]}</h3>
          <ul className="space-y-3">{catalog.filter(c => c.language === language.id).map(course => <li key={course.id}>
            <button className="flex w-full items-start gap-2 text-left text-sm hover:text-teal-600" onClick={() => onSelectCourse(course.id)}><BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />{course.title}</button>
          </li>)}</ul>
        </div>)}
      </div>
      <button onClick={onBrowse} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold hover:underline">{lang === 'vi' ? 'Xem thư viện học tập' : 'Browse the library'}<ArrowRight className="h-4 w-4" /></button>
    </div>
  </section>
);
