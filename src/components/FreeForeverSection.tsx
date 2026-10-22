import React from 'react';
import { Layers, BookOpen, Infinity as InfinityIcon, CreditCard, Sparkles, Check } from 'lucide-react';

interface FreeForeverSectionProps {
  lang: 'vi' | 'en';
}

export const FreeForeverSection: React.FC<FreeForeverSectionProps> = ({ lang }) => {
  const t = {
    eyebrow: lang === 'vi' ? 'Miễn phí mãi mãi' : 'Free forever',
    title: lang === 'vi' 
      ? 'Ghi nhớ miễn phí, không giới hạn từ và học phần' 
      : 'Memorize for free, unlimited words and sets',
    desc: lang === 'vi'
      ? 'OpenQuiz là nền tảng học từ vựng mở cho bất kỳ ai muốn xây dựng vốn từ vựng ngoại ngữ bền vững. Bạn có thể tạo học phần mới, thêm từ và ôn tập với các chế độ cốt lõi mà không phải trả bất kỳ khoản phí nào để bắt đầu.'
      : 'OpenQuiz is a free vocabulary learning platform for anyone who wants to build a lasting personal vocabulary. You can create new sets, add words, and memorize with core modes without paying to get started.',
    pillars: [
      {
        icon: Layers,
        title: lang === 'vi' ? 'Học phần không giới hạn' : 'Unlimited sets',
        desc: lang === 'vi' 
          ? 'Tạo bao nhiêu bộ flashcard hoặc chủ đề học tùy thích.' 
          : 'Create as many flashcard sets or study topics as you want.'
      },
      {
        icon: BookOpen,
        title: lang === 'vi' ? 'Từ vựng không giới hạn' : 'Unlimited vocabulary',
        desc: lang === 'vi' 
          ? 'Xây dựng kho từ vựng cá nhân cho IELTS, giao tiếp hàng ngày, trường lớp hay công việc.' 
          : 'Build a personal word bank for IELTS, daily conversation, class, or work.'
      },
      {
        icon: InfinityIcon,
        title: lang === 'vi' ? 'Ghi nhớ không giới hạn' : 'Unlimited memorization',
        desc: lang === 'vi' 
          ? 'Flashcard, trắc nghiệm, luyện viết, nghe chính tả và SRS — sử dụng trọn đời.' 
          : 'Flashcards, quizzes, writing, dictation, and SRS — use forever.'
      },
      {
        icon: CreditCard,
        title: lang === 'vi' ? 'Không cần thẻ tín dụng' : 'No credit card needed',
        desc: lang === 'vi' 
          ? 'Đăng nhập miễn phí và bắt đầu học ngay — không yêu cầu thanh toán để bắt đầu.' 
          : 'Sign in free and start learning right away — no payment required to begin.'
      }
    ],
    audienceTitle: lang === 'vi' 
      ? 'Ứng dụng từ vựng miễn phí cho mọi đối tượng học' 
      : 'A free vocabulary app for every type of learner',
    audienceDesc: lang === 'vi'
      ? 'Dùng OpenQuiz để luyện thi chứng chỉ, học giao tiếp, dạy lớp nhỏ hay tự học mỗi ngày. Khi cần nói tốt hơn, tính năng luyện nói của OpenQuiz giúp bạn dùng chính những từ vừa học trong ngữ cảnh sinh động.'
      : 'Use OpenQuiz to prep for exams, learn conversational language, teach small classes, or study on your own every day. When you need to speak better, OpenQuiz\'s speaking practice helps you use the very words you\'ve learned in context.',
    chips: [
      lang === 'vi' ? 'Luyện từ vựng hàng ngày' : 'daily vocabulary practice',
      lang === 'vi' ? 'Từ vựng luyện thi IELTS' : 'vocabulary for IELTS',
      lang === 'vi' ? 'App học từ vựng miễn phí' : 'free vocabulary app',
      lang === 'vi' ? 'Website học từ vựng trực quan' : 'vocabulary learning website',
      lang === 'vi' ? 'Luyện nói với từ của chính bạn' : 'speaking practice with your vocab',
      lang === 'vi' ? 'Luyện phản xạ nói miễn phí' : 'free speaking practice to start'
    ]
  };

  return (
    <section id="free" className="border-b py-16 md:py-24 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Top Header */}
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

        {/* 4 Guarantee Pillars */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.pillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="rounded-[12px] border bg-card p-6 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Audience & Tag Chips */}
        <div className="mt-16 rounded-[16px] border bg-card p-8 md:p-10 shadow-sm">
          <div className="mx-auto max-w-3xl text-center">
            <h3 className="text-2xl font-bold text-foreground">
              {t.audienceTitle}
            </h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {t.audienceDesc}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {t.chips.map((chip, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors cursor-default"
              >
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

