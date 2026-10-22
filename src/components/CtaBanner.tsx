import React from 'react';
import { Sparkles } from 'lucide-react';
import { GoogleChromeIcon } from './Icons';

interface CtaBannerProps {
  lang: 'vi' | 'en';
  onStart: () => void;
}

export const CtaBanner: React.FC<CtaBannerProps> = ({ lang, onStart }) => {
  const t = {
    title: lang === 'vi'
      ? 'Bắt đầu học từ vựng miễn phí trên OpenQuiz'
      : 'Start learning vocabulary for free on OpenQuiz',
    desc: lang === 'vi'
      ? 'Tạo học phần đầu tiên của bạn, ghi nhớ không giới hạn và biến từ vựng thành phản xạ câu nói thực tế.'
      : 'Create your first set, memorize without limits, and turn vocabulary into real sentences.',
    btnGoogle: lang === 'vi' ? 'Khám phá thư viện học tập' : 'Explore the learning library',
    supportedBy: lang === 'vi' ? 'Được bảo trợ bởi' : 'Supported By',
  };

  return (
    <section className="py-16 md:py-24 border-b relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-primary/5 to-emerald-500/10 -z-10" />

      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          {t.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          {t.desc}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={onStart}
            className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all active:scale-95"
          >
            <GoogleChromeIcon className="h-5 w-5" />
            <span>{t.btnGoogle}</span>
          </button>
        </div>

        {/* ElevenLabs Grants Partner Banner */}
        <div className="mt-14 pt-8 border-t flex flex-col items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t.supportedBy}
          </p>
          <a
            href="https://elevenlabs.io/startup-grants"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:bg-muted/60 transition-colors shadow-2xs group"
          >
            <span className="font-extrabold text-sm tracking-tight text-foreground group-hover:text-emerald-600 transition-colors">
              // IIElevenLabs Grants
            </span>
          </a>
        </div>
      </div>
    </section>
  );
};
