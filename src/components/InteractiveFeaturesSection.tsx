import React, { useState } from 'react';
import { Plus, Volume2, Mic, Play, Pause, CheckCircle2, RotateCw, Sparkles, Send } from 'lucide-react';
import { speakText } from '../utils/speech';

interface InteractiveFeaturesSectionProps {
  lang: 'vi' | 'en';
}

export const InteractiveFeaturesSection: React.FC<InteractiveFeaturesSectionProps> = ({ lang }) => {
  const [activeVoiceWord, setActiveVoiceWord] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState('00:18');
  const [submittedSpeaking, setSubmittedSpeaking] = useState(false);

  const t = {
    eyebrow: lang === 'vi' ? 'Trải nghiệm học tập' : 'Learning experience',
    title: lang === 'vi' 
      ? 'Xem một lần là hiểu cách OpenQuiz hoạt động' 
      : 'See once and understand how OpenQuiz works',
    desc: lang === 'vi'
      ? 'Tạo bộ từ, ghi nhớ, luyện nói và xem điểm phát âm ngay trong một luồng học liền mạch — không cần chuyển đổi qua lại giữa các công cụ rời rạc.'
      : 'Create sets, memorize, practice speaking, and check pronunciation scores all in one flow — no need to switch between separate tools.',
    feature1Title: lang === 'vi' ? 'Tạo học phần từ vựng không giới hạn' : 'Create unlimited vocabulary sets',
    feature1Desc: lang === 'vi' ? 'Thêm từ thủ công, import từ tài liệu, hoặc dùng AI tạo từ bài học.' : 'Add words manually, import, or generate from a lesson.',
    feature2Title: lang === 'vi' ? 'Ghi nhớ miễn phí không giới hạn' : 'Unlimited free memorization',
    feature2Desc: lang === 'vi' ? 'Một bộ từ, nhiều chế độ học để nhớ lâu hơn.' : 'One set, many study modes to remember longer.',
    feature3Title: lang === 'vi' ? 'Dùng từ để nói chủ động' : 'Use words to speak actively',
    feature3Desc: lang === 'vi' ? 'Đừng dừng ở việc nhận diện mặt chữ — hãy ép từ vựng vào câu thực tế.' : 'Don\'t stop at recognition — force your vocabulary into real sentences.',
    feature4Title: lang === 'vi' ? 'Chấm điểm phát âm chỉ rõ lỗi cần sửa' : 'Pronunciation scoring pinpoints what to fix',
    feature4Desc: lang === 'vi' ? 'Xem điểm tổng và chi tiết từng tiêu chí sau mỗi lần nói.' : 'See your total and per-section score after every attempt.',
    setName: lang === 'vi' ? 'Tên học phần' : 'Set name',
    addWord: lang === 'vi' ? 'Thêm từ' : 'Add word',
    submit: lang === 'vi' ? 'Nộp bài' : 'Submit',
    submitted: lang === 'vi' ? 'Đã phân tích!' : 'Analyzed!',
  };

  const handleSpeak = async (word: string) => {
    setActiveVoiceWord(word);
    await speakText(word);
    setActiveVoiceWord(null);
  };

  const handleToggleRecord = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setSubmittedSpeaking(false);
    }
  };

  return (
    <section id="features" className="border-b py-16 md:py-24">
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

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* Feature Card 1: Create Sets */}
          <div className="border bg-card text-card-foreground shadow-sm rounded-[12px] p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {t.feature1Title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t.feature1Desc}
                  </p>
                </div>
                <button
                  onClick={() => handleSpeak('clarify')}
                  className="inline-flex items-center justify-center text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-8 w-8 rounded-[8px] active:scale-95 shadow-sm"
                  aria-label={t.addWord}
                  title="Thêm từ mới"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="rounded-[8px] border bg-muted/40 px-3 py-2">
                  <p className="text-[11px] font-medium text-muted-foreground">{t.setName}</p>
                  <p className="mt-0.5 text-sm font-bold text-foreground">Business English - Meetings</p>
                </div>

                {/* Word 1 */}
                <div className="flex items-center justify-between gap-3 rounded-[8px] border bg-card px-3 py-2 shadow-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-foreground">clarify</p>
                      <button
                        onClick={() => handleSpeak('clarify')}
                        className="text-muted-foreground hover:text-emerald-500 transition-colors"
                        title="Nghe phát âm"
                      >
                        <Volume2 className={`h-3.5 w-3.5 ${activeVoiceWord === 'clarify' ? 'text-emerald-500 animate-bounce' : ''}`} />
                      </button>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">làm rõ, tường minh</p>
                  </div>
                  <span className="shrink-0 rounded-[6px] px-2 py-0.5 text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300">
                    Learning
                  </span>
                </div>

                {/* Word 2 */}
                <div className="flex items-center justify-between gap-3 rounded-[8px] border bg-card px-3 py-2 shadow-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-foreground">deadline</p>
                      <button
                        onClick={() => handleSpeak('deadline')}
                        className="text-muted-foreground hover:text-emerald-500 transition-colors"
                        title="Nghe phát âm"
                      >
                        <Volume2 className={`h-3.5 w-3.5 ${activeVoiceWord === 'deadline' ? 'text-emerald-500 animate-bounce' : ''}`} />
                      </button>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">hạn chót</p>
                  </div>
                  <span className="shrink-0 rounded-[6px] px-2 py-0.5 text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    New
                  </span>
                </div>

                {/* Word 3 */}
                <div className="flex items-center justify-between gap-3 rounded-[8px] border bg-card px-3 py-2 shadow-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-foreground">proposal</p>
                      <button
                        onClick={() => handleSpeak('proposal')}
                        className="text-muted-foreground hover:text-emerald-500 transition-colors"
                        title="Nghe phát âm"
                      >
                        <Volume2 className={`h-3.5 w-3.5 ${activeVoiceWord === 'proposal' ? 'text-emerald-500 animate-bounce' : ''}`} />
                      </button>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">đề xuất, dự thảo</p>
                  </div>
                  <span className="shrink-0 rounded-[6px] px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    Mastered
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Đã lưu 18 từ vựng</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Tự động đồng bộ</span>
            </div>
          </div>

          {/* Feature Card 2: Memorization Modes */}
          <div className="border bg-card text-card-foreground shadow-sm rounded-[12px] p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
            <div>
              <div className="mb-4">
                <h3 className="text-base font-bold text-foreground">
                  {t.feature2Title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t.feature2Desc}
                </p>
              </div>

              <div className="space-y-3">
                {/* Flashcard */}
                <div className="rounded-[8px] border p-2.5 bg-card">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-foreground">1. Thẻ ghi nhớ (Flashcard)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">100%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-1.5">Lật thẻ 2 mặt xem định nghĩa và phát âm</p>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>

                {/* Write */}
                <div className="rounded-[8px] border p-2.5 bg-card">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-foreground">2. Luyện viết (Write)</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold text-[11px]">65%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-1.5">Nhớ lại và gõ chính xác trước khi xem đáp án</p>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '65%' }} />
                  </div>
                </div>

                {/* Dictation */}
                <div className="rounded-[8px] border p-2.5 bg-card">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-foreground">3. Chính tả (Dictation)</span>
                    <span className="text-purple-600 dark:text-purple-400 font-bold text-[11px]">40%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-1.5">Nghe phát âm chuẩn rồi viết lại</p>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '40%' }} />
                  </div>
                </div>

                {/* SRS */}
                <div className="rounded-[8px] border p-2.5 bg-card">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-foreground">4. Lặp lại ngắt quãng (Spaced Repetition)</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold text-[11px]">80%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-1.5">Nhắc nhở ôn tập vào đúng ngày sắp quên</p>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '80%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Ghi nhớ bền vững theo chu kỳ ngắt quãng (SRS)</span>
            </div>
          </div>

          {/* Feature Card 3: Speak with words */}
          <div className="border bg-card text-card-foreground shadow-sm rounded-[12px] p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
            <div>
              <div className="mb-4">
                <h3 className="text-base font-bold text-foreground">
                  {t.feature3Title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t.feature3Desc}
                </p>
              </div>

              <div className="rounded-[10px] border bg-muted/30 p-3.5 space-y-3">
                <div className="rounded-[8px] bg-card p-3 border shadow-xs">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">🎯 Đề bài nói:</p>
                  <p className="text-xs text-foreground leading-relaxed">
                    "Describe a time you overcame a setback. Use:{' '}
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">resilient, progress, strategy</span>."
                  </p>
                </div>

                <div className="rounded-[8px] bg-card p-3 border shadow-xs">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">🗣️ Phản hồi mẫu:</p>
                  <p className="text-xs italic text-foreground leading-relaxed">
                    "I became more <mark className="bg-emerald-100 dark:bg-emerald-900/50 px-1 rounded font-semibold text-emerald-900 dark:text-emerald-100">resilient</mark> after changing my <mark className="bg-emerald-100 dark:bg-emerald-900/50 px-1 rounded font-semibold text-emerald-900 dark:text-emerald-100">strategy</mark> and tracking small <mark className="bg-emerald-100 dark:bg-emerald-900/50 px-1 rounded font-semibold text-emerald-900 dark:text-emerald-100">progress</mark> every week."
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleRecord}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-white transition-all ${
                        isRecording ? 'bg-red-500 animate-pulse' : 'bg-primary hover:scale-105'
                      }`}
                      title="Ghi âm giọng nói"
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-mono font-medium text-muted-foreground">
                      {isRecording ? 'Đang ghi âm...' : `${recordTimer} recording`}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSubmittedSpeaking(true);
                      setIsRecording(false);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-[8px] bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition-colors shadow-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {submittedSpeaking ? t.submitted : t.submit}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              <span>AI nhận diện giọng nói và ngữ cảnh theo chuẩn CEFR</span>
            </div>
          </div>

          {/* Feature Card 4: PronScore Scoring */}
          <div className="border bg-card text-card-foreground shadow-sm rounded-[12px] p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
            <div>
              <div className="mb-4">
                <h3 className="text-base font-bold text-foreground">
                  {t.feature4Title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t.feature4Desc}
                </p>
              </div>

              <div className="rounded-[10px] border bg-muted/30 p-3.5 space-y-3">
                {/* Score Header */}
                <div className="flex items-center justify-between bg-card p-3 rounded-[8px] border shadow-xs">
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">Chỉ số PronScore</span>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">Xuất sắc (Band 7.5+)</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">86</span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </div>
                </div>

                {/* Submetrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-[8px] bg-card p-2.5 border">
                    <div className="flex justify-between font-semibold mb-1">
                      <span>Độ chính xác (Accuracy)</span>
                      <span className="text-foreground font-bold">88%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                      <div className="bg-emerald-500 h-1 rounded-full" style={{ width: '88%' }} />
                    </div>
                  </div>

                  <div className="rounded-[8px] bg-card p-2.5 border">
                    <div className="flex justify-between font-semibold mb-1">
                      <span>Độ lưu loát (Fluency)</span>
                      <span className="text-foreground font-bold">79%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                      <div className="bg-blue-500 h-1 rounded-full" style={{ width: '79%' }} />
                    </div>
                  </div>

                  <div className="rounded-[8px] bg-card p-2.5 border">
                    <div className="flex justify-between font-semibold mb-1">
                      <span>Độ hoàn chỉnh (Completeness)</span>
                      <span className="text-foreground font-bold">93%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                      <div className="bg-purple-500 h-1 rounded-full" style={{ width: '93%' }} />
                    </div>
                  </div>

                  <div className="rounded-[8px] bg-card p-2.5 border">
                    <div className="flex justify-between font-semibold mb-1">
                      <span>Ngữ điệu (Prosody)</span>
                      <span className="text-foreground font-bold">82%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                      <div className="bg-amber-500 h-1 rounded-full" style={{ width: '82%' }} />
                    </div>
                  </div>
                </div>

                {/* Per-word Breakdown */}
                <div className="rounded-[8px] bg-card p-2.5 border">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Phân tích phát âm từng từ khóa:</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      resilient: 91
                    </span>
                    <span className="rounded bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                      strategy: 84
                    </span>
                    <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                      progress: 73
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Được hỗ trợ bởi công nghệ ElevenLabs Speech</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Real-time feedback</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

