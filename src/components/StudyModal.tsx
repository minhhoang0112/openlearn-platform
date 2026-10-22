import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Volume2,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Brain,
  PenTool,
  Mic,
  Plus,
  Sparkles,
  Shuffle,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { mockVocabSets } from '../data/mockData';
import { WordItem, VocabSet } from '../types';
import { speakText, startSpeechRecognition } from '../utils/speech';
import { saveSet } from '../utils/library';

interface StudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'vi' | 'en';
  initialSet?: VocabSet;
}

type TabType = 'flashcard' | 'write' | 'speak' | 'create';

export const StudyModal: React.FC<StudyModalProps> = ({ isOpen, onClose, lang, initialSet }) => {

  const [activeTab, setActiveTab] = useState<TabType>('flashcard');
  const [currentSet, setCurrentSet] = useState<VocabSet>(initialSet || mockVocabSets[0]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredWords, setMasteredWords] = useState<Set<string>>(() => {
    try { const value = JSON.parse(localStorage.getItem(`study:${initialSet?.id || mockVocabSets[0].id}`) || '[]'); return new Set(Array.isArray(value) ? value : []); } catch { return new Set(); }
  });
  const [storageError, setStorageError] = useState('');
  const [speechError, setSpeechError] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<{ stop: () => void } | null>(null);
  const answerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input, textarea, select, [tabindex="0"]') || []).filter(el => el.offsetParent !== null);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); controllerRef.current?.stop(); window.speechSynthesis?.cancel(); if (answerTimer.current) clearTimeout(answerTimer.current); };
  }, [onClose]);

  // Write mode state
  const [userAnswer, setUserAnswer] = useState('');
  const [writeFeedback, setWriteFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [showHint, setShowHint] = useState(false);

  // Speak mode state
  const [isRecording, setIsRecording] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [analyzedScore, setAnalyzedScore] = useState<{
    score: number;
    accuracy: number;
    fluency: number;
    grammarFeedback?: string;
  } | null>(null);
  const [activeSpeechController, setActiveSpeechController] = useState<{ stop: () => void } | null>(null);

  // Create set state
  const [newTitle, setNewTitle] = useState('');
  const [newTerm, setNewTerm] = useState('');
  const [newDef, setNewDef] = useState('');

  const currentWord = currentSet.words[currentWordIndex] || currentSet.words[0];

  const handlePronounce = (term: string) => {
    speakText(term, currentWord.language || 'en-US');
  };

  const handleNextWord = () => {
    setIsFlipped(false);
    setUserAnswer('');
    setWriteFeedback('idle');
    setShowHint(false);
    setSpeechTranscript('');
    setAnalyzedScore(null);

    if (currentWordIndex < currentSet.words.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      // Completed all words
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setCurrentWordIndex(0);
    }
  };

  const handlePrevWord = () => {
    setIsFlipped(false);
    setUserAnswer('');
    setWriteFeedback('idle');
    setShowHint(false);
    setSpeechTranscript('');
    setAnalyzedScore(null);

    if (currentWordIndex > 0) {
      setCurrentWordIndex(currentWordIndex - 1);
    }
  };

  const handleMarkMastered = () => {
    const updated = new Set(masteredWords);
    if (updated.has(currentWord.id)) {
      updated.delete(currentWord.id);
    } else {
      updated.add(currentWord.id);
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 }
      });
    }
    setMasteredWords(updated);
    try { localStorage.setItem(`study:${currentSet.id}`, JSON.stringify([...updated])); } catch { setStorageError('Không thể lưu tiến độ. Bộ nhớ trình duyệt đã đầy hoặc bị chặn.'); }
  };

  const handleCheckWriteAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;

    if (userAnswer.trim().toLowerCase() === currentWord.term.toLowerCase()) {
      setWriteFeedback('correct');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
      answerTimer.current = setTimeout(() => {
        handleNextWord();
      }, 1200);
    } else {
      setWriteFeedback('incorrect');
    }
  };

  const handleStartSpeaking = () => {
    if (isRecording) {
      if (activeSpeechController) activeSpeechController.stop();
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    setSpeechError('');
    setSpeechTranscript('');
    setAnalyzedScore(null);

    const controller = startSpeechRecognition(
      (transcript) => {
        setSpeechTranscript(transcript);
        // Keyword recognition only; no pronunciation score is inferred.
        const hasKeyword = transcript.toLowerCase().includes(currentWord.term.toLowerCase());
        setIsRecording(false);
        setSpeechError(hasKeyword ? 'Đã nhận diện từ mục tiêu. Chấm điểm phát âm cần kết nối dịch vụ đánh giá.' : `Chưa nhận diện từ "${currentWord.term}". Hãy thử lại.`);
      },
      () => {
        setIsRecording(false);
        setSpeechError('Không thể dùng micro. Hãy cấp quyền và dùng trình duyệt hỗ trợ nhận diện giọng nói.');
      },
      currentWord.language || 'en-US',
      () => setIsRecording(false)
    );

    setActiveSpeechController(controller);
    controllerRef.current = controller;
  };

  const handleAddCustomWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim() || !newDef.trim()) return;

    const newWord: WordItem = {
      id: 'custom-' + Date.now(),
      term: newTerm.trim(),
      definition: newDef.trim(),
      partOfSpeech: 'noun',
      phonetic: `/${newTerm.trim()}/`,
      status: 'new',
      language: currentWord.language || 'en-US'
    };

    const updated = {
      ...currentSet,
      words: [...currentSet.words, newWord]
    };
    setCurrentSet(updated);
    try { saveSet(updated); } catch { setStorageError('Không thể lưu bộ từ vào trình duyệt. Hãy kiểm tra dung lượng lưu trữ.'); }
    setNewTerm('');
    setNewDef('');
    setActiveTab('flashcard');
    setCurrentWordIndex(updated.words.length - 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="study-title" tabIndex={-1} className="relative w-full max-w-3xl rounded-[16px] border bg-background shadow-2xl overflow-hidden flex flex-col max-h-[90vh] outline-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-primary text-primary-foreground font-black">
              Q
            </div>
            <div>
              <h2 id="study-title" className="text-base font-extrabold text-foreground">
                {currentSet.title}
              </h2>
              <p className="text-xs text-muted-foreground">
                Từ {currentWordIndex + 1} / {currentSet.words.length} • Đã nhớ ({masteredWords.size})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              aria-label={lang === 'vi' ? 'Đóng phòng học' : 'Close study room'}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Study Mode Tabs */}
        <div className="flex border-b bg-muted/30 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('flashcard')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'flashcard'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Brain className="h-4 w-4" />
            <span>Thẻ Flashcard</span>
          </button>

          <button
            onClick={() => setActiveTab('write')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'write'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <PenTool className="h-4 w-4" />
            <span>Luyện viết (Write)</span>
          </button>

          <button
            onClick={() => setActiveTab('speak')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'speak'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mic className="h-4 w-4" />
            <span>Luyện nói AI (Speaking)</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'create'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Thêm từ mới</span>
          </button>
        </div>

        {/* Tab Content Body */}
        {storageError && <p role="alert" className="px-6 pt-3 text-sm text-red-600">{storageError}</p>}
        {speechError && activeTab === 'speak' && <p role="status" className="px-6 pt-3 text-sm text-muted-foreground">{speechError}</p>}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: FLASHCARD */}
          {activeTab === 'flashcard' && (
            <div className="flex flex-col items-center">
              <div
                className="w-full max-w-lg cursor-pointer"
                style={{ perspective: 1000 }}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div
                  className={`relative w-full h-72 rounded-[16px] transition-transform duration-500 shadow-lg ${
                    isFlipped ? '[transform:rotateY(180deg)]' : ''
                  }`}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Front Side */}
                  <div
                    className="absolute inset-0 rounded-[16px] border bg-card p-6 flex flex-col justify-between"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold uppercase text-emerald-600 dark:text-emerald-400">
                        {currentWord.partOfSpeech || 'Từ vựng'}
                      </span>
                      <span className="flex items-center gap-1">
                        <RotateCw className="h-3.5 w-3.5" />
                        Nhấp để lật
                      </span>
                    </div>

                    <div className="text-center my-auto">
                      <p className="text-4xl font-black text-foreground tracking-tight mb-2">
                        {currentWord.term}
                      </p>
                      {currentWord.phonetic && (
                        <p className="text-sm font-serif italic text-muted-foreground">
                          {currentWord.phonetic}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <p className="text-xs text-muted-foreground truncate max-w-xs italic">
                        {currentWord.example || 'Example sentence'}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePronounce(currentWord.term);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-muted hover:bg-emerald-500 hover:text-white transition-colors"
                        title="Nghe phát âm chuẩn"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Back Side */}
                  <div
                    className="absolute inset-0 rounded-[16px] border bg-card p-6 flex flex-col justify-between [transform:rotateY(180deg)]"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        Định nghĩa tiếng Việt
                      </span>
                      <span className="flex items-center gap-1">
                        <RotateCw className="h-3.5 w-3.5" />
                        Nhấp để lật lại
                      </span>
                    </div>

                    <div className="text-center my-auto">
                      <p className="text-2xl font-bold text-foreground mb-3">
                        {currentWord.definition}
                      </p>
                      {currentWord.example && (
                        <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-[8px]">
                          Ví dụ: "{currentWord.example}"
                        </p>
                      )}
                    </div>

                    <div className="text-center text-xs text-muted-foreground">
                      Học phần: <b>{currentSet.title}</b>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="mt-6 flex items-center justify-between w-full max-w-lg">
                <button
                  onClick={handlePrevWord}
                  disabled={currentWordIndex === 0}
                  className="flex items-center gap-1 rounded-[8px] border px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Từ trước</span>
                </button>

                <button
                  onClick={handleMarkMastered}
                  className={`flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-xs font-bold transition-all ${
                    masteredWords.has(currentWord.id)
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'border border-border text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-600'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{masteredWords.has(currentWord.id) ? 'Đã thành thạo' : 'Đánh dấu đã thuộc'}</span>
                </button>

                <button
                  onClick={handleNextWord}
                  className="flex items-center gap-1 rounded-[8px] bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:bg-primary/90"
                >
                  <span>Từ tiếp theo</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: WRITE MODE */}
          {activeTab === 'write' && (
            <div className="max-w-lg mx-auto space-y-6">
              <div className="rounded-[12px] border bg-card p-6 text-center space-y-2">
                <p className="text-xs uppercase font-bold text-muted-foreground">
                  Định nghĩa tiếng Việt:
                </p>
                <p className="text-2xl font-black text-foreground">
                  {currentWord.definition}
                </p>
                {currentWord.phonetic && (
                  <p className="text-sm font-serif italic text-muted-foreground">
                    Gợi ý phiên âm: {currentWord.phonetic}
                  </p>
                )}
              </div>

              <form onSubmit={handleCheckWriteAnswer} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Gõ từ tiếng Anh tương ứng:
                  </label>
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type the word in English..."
                    className="w-full rounded-[8px] border border-input bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                </div>

                {writeFeedback === 'correct' && (
                  <div className="rounded-[8px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 p-3 text-xs text-emerald-800 dark:text-emerald-200 font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Chính xác! Chuẩn bị chuyển sang từ tiếp theo...
                  </div>
                )}

                {writeFeedback === 'incorrect' && (
                  <div className="rounded-[8px] bg-red-50 dark:bg-red-950/40 border border-red-500/30 p-3 text-xs text-red-800 dark:text-red-200 font-bold flex items-center justify-between">
                    <span>Chưa đúng rồi! Hãy thử lại hoặc xem gợi ý.</span>
                    <button
                      type="button"
                      onClick={() => setShowHint(true)}
                      className="underline hover:text-red-900"
                    >
                      Xem đáp án
                    </button>
                  </div>
                )}

                {showHint && (
                  <div className="rounded-[8px] bg-muted p-3 text-xs text-foreground font-mono">
                    Đáp án đúng là: <b>{currentWord.term}</b>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => handlePronounce(currentWord.term)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Volume2 className="h-4 w-4" />
                    Nghe phát âm
                  </button>

                  <button
                    type="submit"
                    className="rounded-[8px] bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold hover:bg-primary/90"
                  >
                    Kiểm tra đáp án
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: SPEAKING MODE */}
          {activeTab === 'speak' && (
            <div className="max-w-lg mx-auto space-y-6">
              <div className="rounded-[12px] border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">💬 Đề bài luyện nói AI:</span>
                  <span className="text-[10px] font-bold rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                    Từ bắt buộc: {currentWord.term}
                  </span>
                </div>
                <p className="text-sm font-bold text-foreground">
                  "Give a sentence describing your experience using the word:{' '}
                  <span className="text-emerald-600 underline font-black">{currentWord.term}</span>."
                </p>
              </div>

              {/* Speech Recognition Box */}
              <div className="rounded-[12px] border bg-muted/20 p-5 text-center space-y-4">
                <div className="flex flex-col items-center justify-center">
                  <button
                    onClick={handleStartSpeaking}
                    className={`flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-all ${
                      isRecording
                        ? 'bg-red-500 scale-110 animate-pulse'
                        : 'bg-primary hover:scale-105'
                    }`}
                  >
                    <Mic className="h-7 w-7" />
                  </button>
                  <p className="mt-3 text-xs font-bold text-muted-foreground">
                    {isRecording ? 'Đang lắng nghe... Nhấn lại để kết thúc' : 'Nhấn micro và đọc câu của bạn'}
                  </p>
                </div>

                {speechTranscript && (
                  <div className="text-left rounded-[8px] bg-card p-3 border">
                    <p className="text-[11px] font-bold text-muted-foreground mb-1">Văn bản nhận diện:</p>
                    <p className="text-sm text-foreground italic">"{speechTranscript}"</p>
                  </div>
                )}

                {analyzedScore && (
                  <div className="text-left rounded-[10px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 p-4 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                        Điểm PronScore AI:
                      </span>
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                        {analyzedScore.score} / 100
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Độ chính xác: <b>{analyzedScore.accuracy}%</b> • Độ trôi chảy: <b>{analyzedScore.fluency}%</b>
                    </p>
                    <p className="text-xs text-emerald-900 dark:text-emerald-100 font-medium pt-1">
                      💡 {analyzedScore.grammarFeedback}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ADD CUSTOM WORD */}
          {activeTab === 'create' && (
            <div className="max-w-lg mx-auto space-y-6">
              <div className="rounded-[12px] border bg-card p-5">
                <h3 className="text-base font-bold text-foreground mb-1">
                  Thêm từ mới vào học phần "{currentSet.title}"
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Từ mới sẽ được lưu vào phiên học và có thể luyện qua Flashcard, Viết hoặc Nói.
                </p>

                <form onSubmit={handleAddCustomWord} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      Thuật ngữ / Từ vựng (Term):
                    </label>
                    <input
                      type="text"
                      value={newTerm}
                      onChange={(e) => setNewTerm(e.target.value)}
                      placeholder="Ví dụ: perseverance, breakthrough..."
                      className="w-full rounded-[8px] border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      Định nghĩa tiếng Việt (Definition):
                    </label>
                    <input
                      type="text"
                      value={newDef}
                      onChange={(e) => setNewDef(e.target.value)}
                      placeholder="Ví dụ: sự kiên trì, bước đột phá..."
                      className="w-full rounded-[8px] border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-[8px] bg-primary text-primary-foreground py-2.5 text-sm font-bold hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4" />
                      Thêm vào danh sách học
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

