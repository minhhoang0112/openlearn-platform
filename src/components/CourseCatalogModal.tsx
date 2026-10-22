import React, { useState } from 'react';
import {
  X,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Brain,
  PenTool,
  CheckSquare,
  FileText,
  Mic,
  MessageSquare,
  Sparkles,
  Award,
  ChevronRight,
  Volume2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { speakText } from '../utils/speech';

interface CourseCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'vi' | 'en';
}

interface CourseItem {
  id: string;
  level: string;
  title: string;
  tag: string;
  desc: string;
  wordsCount: number;
  lessonsCount: number;
  badgeColor: string;
}

const COURSES_DATA: CourseItem[] = [
  {
    id: 'a1',
    level: 'A1',
    title: 'Khoá A1 – Nhập môn (Beginner)',
    tag: 'Nhập môn',
    desc: '200 từ vựng căn bản nhất về đời sống, chào hỏi, số đếm, gia đình và phương hướng.',
    wordsCount: 200,
    lessonsCount: 30,
    badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
  },
  {
    id: 'a2',
    level: 'A2',
    title: 'Khoá A2 – Sơ cấp (Elementary)',
    tag: 'Sơ cấp',
    desc: '250 từ vựng miêu tả trường học, mua sắm, du lịch và thói quen hàng ngày.',
    wordsCount: 250,
    lessonsCount: 30,
    badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
  },
  {
    id: 'b1',
    level: 'B1',
    title: 'Khoá B1 – Trung cấp (Intermediate)',
    tag: 'Trung cấp',
    desc: '300 từ vựng công sở, diễn đạt kế hoạch tương lai và xử lý tình huống phát sinh.',
    wordsCount: 300,
    lessonsCount: 30,
    badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
  },
  {
    id: 'b2_1',
    level: 'B2.1',
    title: 'Khoá B2.1 – Trung cao cấp (Upper Intermediate)',
    tag: 'Trung cao cấp',
    desc: '300 từ vựng thảo luận các chủ đề thời sự, công nghệ, kinh doanh và xã hội.',
    wordsCount: 300,
    lessonsCount: 30,
    badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
  },
  {
    id: 'c1',
    level: 'C1',
    title: 'Khoá C1 – Cao cấp (Advanced)',
    tag: 'Cao cấp',
    desc: '300 từ vựng học thuật, đàm phán hợp đồng, phân tích báo cáo và hùng biện.',
    wordsCount: 300,
    lessonsCount: 30,
    badgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
  },
  {
    id: 'ielts',
    level: 'IELTS',
    title: 'IELTS Speaking – Coherence & Cohesion (Band 4.5 – 7.5+)',
    tag: 'IELTS Pro',
    desc: '250 từ nối, liên từ mở ý và từ vựng nâng cao theo phương pháp "Nói trước – Học sau".',
    wordsCount: 250,
    lessonsCount: 30,
    badgeColor: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20'
  }
];

const SAMPLE_LESSON_STEPS = [
  { num: 1, name: 'Thẻ ghi nhớ (Flashcards)', icon: Brain },
  { num: 2, name: 'Luyện viết (Writing)', icon: PenTool },
  { num: 3, name: 'Trắc nghiệm (Quiz)', icon: CheckSquare },
  { num: 4, name: 'Điền từ vào câu (Fill Blank)', icon: FileText },
  { num: 5, name: 'Nghe & nói lại (Listen & Speak)', icon: Mic },
  { num: 6, name: 'Hội thoại tình huống AI (Conversation)', icon: MessageSquare },
  { num: 7, name: 'Đúc kết ngữ pháp & Sửa lỗi (Explanation)', icon: Sparkles }
];

export const CourseCatalogModal: React.FC<CourseCatalogModalProps> = ({
  isOpen,
  onClose,
  lang
}) => {
  if (!isOpen) return null;

  const [activeCourse, setActiveCourse] = useState<CourseItem | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [fillAnswer, setFillAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleStartLesson = (course: CourseItem) => {
    setActiveCourse(course);
    setActiveStepIndex(0);
    setFeedback(null);
  };

  const handleNextStep = () => {
    if (activeStepIndex < SAMPLE_LESSON_STEPS.length - 1) {
      setActiveStepIndex(activeStepIndex + 1);
      setFeedback(null);
      setFillAnswer('');
    } else {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setFeedback('Chúc mừng bạn đã hoàn thành trọn vẹn quy trình bài học 7 bước!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-[16px] border bg-background shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-primary text-primary-foreground font-black">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">
                {activeCourse ? `${activeCourse.title} • Bài 01/30` : 'Khóa Học Khung Chuẩn & Luyện Thi Chứng Chỉ'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {activeCourse ? 'Lộ trình bài học 7 bước chuẩn sư phạm OpenQuiz' : 'Chuẩn CEFR Châu Âu & IELTS Speaking Master'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeCourse && (
              <button
                onClick={() => setActiveCourse(null)}
                className="text-xs font-semibold px-3 py-1.5 rounded-[6px] border hover:bg-muted"
              >
                ← Quay lại danh mục
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {!activeCourse ? (
            /* VIEW 1: Course Catalog Grid */
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-foreground">
                  Chọn Lộ Trình Phù Hợp Với Trình Độ Của Bạn
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Mỗi khóa học bao gồm 30 bài học thực hành tương tác theo phương pháp <b>Nói trước – Học sau</b>.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {COURSES_DATA.map((course) => (
                  <div
                    key={course.id}
                    className="rounded-[12px] border bg-card p-5 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${course.badgeColor}`}>
                          Level {course.level}
                        </span>
                        <span className="text-xs text-muted-foreground font-semibold">
                          {course.lessonsCount} bài học
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-foreground mb-1 group-hover:text-emerald-600 transition-colors">
                        {course.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                        {course.desc}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {course.wordsCount} từ vựng
                      </span>
                      <button
                        onClick={() => handleStartLesson(course)}
                        className="inline-flex items-center gap-1 text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-[6px] hover:bg-primary/90 transition-all"
                      >
                        <span>Học thử bài 1</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* VIEW 2: 7-Step Interactive Lesson Runner */
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Stepper Progress Bar */}
              <div className="flex items-center justify-between border-b pb-3 overflow-x-auto gap-2">
                {SAMPLE_LESSON_STEPS.map((step, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-1.5 text-xs font-bold shrink-0 ${
                      activeStepIndex === idx
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : activeStepIndex > idx
                        ? 'text-foreground'
                        : 'text-muted-foreground/50'
                    }`}
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                      activeStepIndex === idx
                        ? 'bg-emerald-600 text-white'
                        : activeStepIndex > idx
                        ? 'bg-muted text-foreground'
                        : 'bg-muted/40 text-muted-foreground'
                    }`}>
                      {step.num}
                    </span>
                    <span className="hidden sm:inline">{step.name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>

              {/* Step Display Area */}
              <div className="rounded-[14px] border bg-card p-6 shadow-sm min-h-[300px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                      Bước {activeStepIndex + 1} / 7
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {SAMPLE_LESSON_STEPS[activeStepIndex].name}
                    </span>
                  </div>

                  {/* STEP 1: Flashcards */}
                  {activeStepIndex === 0 && (
                    <div className="text-center py-6 space-y-3">
                      <p className="text-3xl font-black text-foreground">coherence</p>
                      <p className="text-sm font-serif italic text-muted-foreground">/koʊˈhɪrəns/</p>
                      <p className="text-sm text-foreground bg-muted/40 p-3 rounded-[8px] max-w-md mx-auto">
                        Định nghĩa: <b>sự mạch lạc, tính liên kết logic trong lời nói và bài viết</b>
                      </p>
                      <button
                        onClick={() => speakText('coherence')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold hover:bg-muted"
                      >
                        <Volume2 className="h-4 w-4" />
                        <span>Nghe phát âm chuẩn</span>
                      </button>
                    </div>
                  )}

                  {/* STEP 2: Writing */}
                  {activeStepIndex === 1 && (
                    <div className="py-4 space-y-4">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Nghĩa: Sự mạch lạc, tính liên kết logic. Gợi ý: bắt đầu bằng chữ "c"
                      </p>
                      <input
                        type="text"
                        placeholder="Gõ từ tiếng Anh..."
                        className="w-full rounded-[8px] border p-3 font-bold text-base focus:ring-2 focus:ring-primary"
                        defaultValue="coherence"
                      />
                    </div>
                  )}

                  {/* STEP 3: Multiple Choice */}
                  {activeStepIndex === 2 && (
                    <div className="py-4 space-y-3">
                      <p className="text-sm font-bold text-foreground">
                        Từ nào sau đây mang nghĩa "sự mạch lạc, liên kết logic"?
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {['A. coherence', 'B. confusion', 'C. obstacle', 'D. hesitation'].map((opt, i) => (
                          <button
                            key={i}
                            className={`p-3 rounded-[8px] border text-left text-xs font-bold transition-colors ${
                              i === 0 ? 'bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-200' : 'hover:bg-muted'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Fill in Blank */}
                  {activeStepIndex === 3 && (
                    <div className="py-4 space-y-3">
                      <p className="text-sm font-bold text-foreground">
                        Điền từ thích hợp vào câu:
                      </p>
                      <p className="text-sm bg-muted/30 p-3 rounded-[8px] leading-relaxed">
                        "His speech lacked logical <span className="underline decoration-emerald-500 font-bold">coherence</span>, making it difficult for the audience to follow."
                      </p>
                    </div>
                  )}

                  {/* STEP 5: Listen & Speak */}
                  {activeStepIndex === 4 && (
                    <div className="text-center py-6 space-y-3">
                      <p className="text-sm font-semibold text-muted-foreground">Đọc lại câu sau:</p>
                      <p className="text-base font-bold text-foreground italic">
                        "Coherence is essential for scoring Band 7 in IELTS Speaking."
                      </p>
                      <div className="flex justify-center gap-3 pt-2">
                        <button
                          onClick={() => speakText("Coherence is essential for scoring Band 7 in IELTS Speaking.")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border text-xs font-bold hover:bg-muted"
                        >
                          <Volume2 className="h-4 w-4" />
                          <span>Nghe mẫu</span>
                        </button>
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-red-500 text-white text-xs font-bold hover:bg-red-600 animate-pulse"
                        >
                          <Mic className="h-4 w-4" />
                          <span>Bật micro đọc thử</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 6: AI Conversation */}
                  {activeStepIndex === 5 && (
                    <div className="space-y-3 py-2">
                      <div className="rounded-[8px] bg-muted/40 p-3 text-xs leading-relaxed">
                        <p className="font-bold text-emerald-600 mb-1">🤖 IELTS Examiner (AI):</p>
                        <p>"How important is structure when giving a presentation?"</p>
                      </div>
                      <div className="rounded-[8px] bg-card border p-3 text-xs leading-relaxed">
                        <p className="font-bold text-foreground mb-1">👤 Câu trả lời của bạn (bắt buộc dùng: coherence):</p>
                        <p>"Structure gives your presentation <span className="font-bold text-emerald-600">coherence</span>, allowing the listeners to comprehend key takeaways."</p>
                      </div>
                    </div>
                  )}

                  {/* STEP 7: Grammar & Native Polish */}
                  {activeStepIndex === 6 && (
                    <div className="space-y-3 py-2">
                      <div className="rounded-[8px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 p-3.5 space-y-2">
                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-emerald-600" />
                          Đánh giá & Lời khuyên ngữ pháp của AI:
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Bạn đã sử dụng danh từ <b>coherence</b> hoàn toàn chính xác trong cấu trúc "give something coherence". Câu văn mượt mà, đạt chuẩn C1/IELTS Band 7.5.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="mt-6 pt-3 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">
                    {feedback || `Bước ${activeStepIndex + 1} của 7`}
                  </span>
                  <button
                    onClick={handleNextStep}
                    className="inline-flex items-center gap-1.5 rounded-[8px] bg-primary text-primary-foreground px-5 py-2 text-xs font-bold hover:bg-primary/90 transition-all shadow-xs"
                  >
                    <span>{activeStepIndex === 6 ? 'Hoàn thành bài học' : 'Bước tiếp theo'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

