import React from 'react';
import { PlusCircle, Brain, MessageSquare, Mic2 } from 'lucide-react';

interface WorkflowSectionProps {
  lang: 'vi' | 'en';
}

export const WorkflowSection: React.FC<WorkflowSectionProps> = ({ lang }) => {
  const t = {
    eyebrow: lang === 'vi' ? 'Từ ghi nhớ thụ động đến nói chủ động' : 'From passive to active speaking',
    title: lang === 'vi' 
      ? 'Lộ trình học tập rõ ràng: tạo bộ từ, ghi nhớ, rồi luyện nói' 
      : 'A clear learning flow: create, memorize, then speak',
    desc: lang === 'vi'
      ? 'OpenQuiz không chỉ giúp bạn nhận biết mặt chữ. Mỗi học phần được ôn luyện qua nhiều vòng, sau đó đưa ngay vào câu thực tế để biến từ vựng thành phản xạ nói chủ động.'
      : 'OpenQuiz doesn\'t just help you recognize words. Each set can go through multiple review rounds, then the words are placed in real sentences to turn vocabulary into active speech.',
    steps: [
      {
        num: '01',
        title: lang === 'vi' ? 'Tạo học phần' : 'Create a set',
        desc: lang === 'vi'
          ? 'Nhập từ, định nghĩa, phiên âm, câu ví dụ hoặc dùng AI tự động tạo từ vựng theo chủ đề học.'
          : 'Enter words, definitions, pronunciation, examples and group them by your learning goal.',
        icon: PlusCircle,
        color: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
      },
      {
        num: '02',
        title: lang === 'vi' ? 'Ghi nhớ cốt lõi' : 'Memorize',
        desc: lang === 'vi'
          ? 'Ôn tập đa giác quan qua Flashcard, Trắc nghiệm, Luyện viết, Nghe chính tả và Spaced Repetition (SRS).'
          : 'Review with flashcards, quizzes, writing, dictation, and spaced repetition.',
        icon: Brain,
        color: 'text-purple-500 bg-purple-500/10 border-purple-500/20'
      },
      {
        num: '03',
        title: lang === 'vi' ? 'Nói với từ vựng' : 'Speak with words',
        desc: lang === 'vi'
          ? 'Đưa từ vựng vừa học vào câu trả lời, trả lời câu hỏi tình huống thực tế cùng AI thông minh.'
          : 'Put newly learned words into answers, conversations, or real-world contexts.',
        icon: MessageSquare,
        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
      },
      {
        num: '04',
        title: lang === 'vi' ? 'Sửa phát âm chi tiết' : 'Fix pronunciation',
        desc: lang === 'vi'
          ? 'Hệ thống PronScore chấm điểm phát âm chính xác, chỉ rõ từng từ và âm tiết bạn cần luyện tập thêm.'
          : 'See your pronunciation score and know exactly what to practice.',
        icon: Mic2,
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
      }
    ]
  };

  return (
    <section id="workflow" className="border-b py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
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

        {/* 4 Steps Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="relative rounded-[12px] border bg-card p-6 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-[10px] border ${step.color} group-hover:scale-110 transition-transform`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-2xl font-black text-muted-foreground/30">
                      {step.num}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span>Step {idx + 1} of 4</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

