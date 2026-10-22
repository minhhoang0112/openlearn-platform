import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../context/RouterContext';
import { api, CourseSummary, CourseDetail, CourseLessonActivitiesResponse, CourseLessonActivity } from '../api/client';
import { FeedbackModal } from '../components/FeedbackModal';
import {
  GraduationCap,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  BookOpen,
  Mic,
  MessageSquare,
  Sparkles,
  Layers,
  X,
  Target,
  Star,
  Award,
  Loader2,
  Volume2
} from 'lucide-react';

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'Tiếng Anh', flag: '🇬🇧' },
  { code: 'zh', name: 'Tiếng Trung', flag: '🇨🇳' },
  { code: 'ja', name: 'Tiếng Nhật', flag: '🇯🇵' },
  { code: 'ko', name: 'Tiếng Hàn', flag: '🇰🇷' },
];

export const CoursesView: React.FC = () => {
  const { navigate } = useRouter();

  const [activeLang, setActiveLang] = useState<string>('en');
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  // Dropdown states for top breadcrumb pills
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const courseMenuRef = useRef<HTMLDivElement>(null);

  // Objectives and Feedback modal states
  const [objectivesModalOpen, setObjectivesModalOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Lesson Activities Modal (connected to GET /course-lessons/:id/activities)
  const [activeLessonModal, setActiveLessonModal] = useState<{
    partNum: number;
    lessonNum: number;
    lesson: { id: number; title: string; position: number; completed_at?: string | null };
  } | null>(null);
  const [lessonActivities, setLessonActivities] = useState<CourseLessonActivitiesResponse | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState('');

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
      if (courseMenuRef.current && !courseMenuRef.current.contains(e.target as Node)) {
        setCourseMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch courses list
  const fetchCourses = async (langCode: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getCourses();
      const all = res.items || [];
      const filtered = all.filter(c => c.language === langCode);
      setCourses(filtered);
      if (filtered.length > 0) {
        loadCourseDetail(filtered[0].id);
      } else {
        setSelectedCourse(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách khoá học.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses(activeLang);
  }, [activeLang]);

  // Load detailed parts and lessons for a course
  const loadCourseDetail = async (id: number) => {
    setDetailLoading(true);
    setError('');
    try {
      const d = await api.getCourse(id);
      setSelectedCourse(d);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải nội dung khoá học.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Lesson Activities Modal calling GET /course-lessons/:id/activities
  const openLesson = async (
    partNum: number,
    lessonNum: number,
    lesson: { id: number; title: string; position: number; completed_at?: string | null }
  ) => {
    setActiveLessonModal({ partNum, lessonNum, lesson });
    setLessonActivities(null);
    setLessonError('');
    setLessonLoading(true);
    try {
      const data = await api.getCourseLessonActivities(lesson.id);
      setLessonActivities(data);
    } catch (err: any) {
      setLessonError(err?.message || 'Không thể tải các hoạt động bài học.');
    } finally {
      setLessonLoading(false);
    }
  };

  const navigateToActivity = (route: string) => {
    setActiveLessonModal(null);
    navigate(route);
  };

  const currentLangObj = LANGUAGES.find(l => l.code === activeLang) || LANGUAGES[0];

  // Helper to format course label in top pill
  const getCourseShortTitle = (course: CourseDetail | CourseSummary | null) => {
    if (!course) return 'Chọn khoá học';
    if (course.competence === 'A1') return 'A1 - Nhập môn';
    if (course.competence === 'A2') return 'A2 - Sơ cấp';
    if (course.competence === 'TOEIC') return 'TOEIC - Luyện đề';
    return `${course.competence} - ${course.title.slice(0, 16)}`;
  };

  const getActivityIcon = (key: string) => {
    switch (key) {
      case 'lesson': return GraduationCap;
      case 'flashcards': return Layers;
      case 'practice': return Award;
      case 'vocabulary': return BookOpen;
      case 'grammar': return Sparkles;
      case 'dictation': return Volume2;
      case 'speaking': return Mic;
      case 'conversation': return MessageSquare;
      case 'reading': return BookOpen;
      default: return CheckCircle2;
    }
  };



  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col items-center pb-24">
      {/* 1. Top Header Matching Image 1 */}
      <div className="w-full max-w-4xl px-4 pt-6 pb-4 flex flex-col items-center gap-3">
        {/* Breadcrumb Selector Pills */}
        <div className="flex items-center gap-3">
          {/* Language Pill Selector */}
          <div ref={langMenuRef} className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black text-slate-800 dark:text-slate-200 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition flex items-center gap-2"
            >
              <span className="text-sm">{currentLangObj.flag}</span>
              <span>{currentLangObj.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {langMenuOpen && (
              <div className="absolute left-0 mt-2 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-1">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setActiveLang(l.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition text-left ${
                      activeLang === l.code
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Course / Level Pill Selector */}
          <div ref={courseMenuRef} className="relative">
            <button
              onClick={() => setCourseMenuOpen(!courseMenuOpen)}
              className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black text-slate-800 dark:text-slate-200 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition flex items-center gap-2"
            >
              <span>{getCourseShortTitle(selectedCourse)}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {courseMenuOpen && (
              <div className="absolute right-0 sm:left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-1">
                {courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      loadCourseDetail(c.id);
                      setCourseMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left ${
                      selectedCourse?.id === c.id
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{c.title}</span>
                    <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300">
                      {c.competence}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Links right below pills matching Image 1 */}
        <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400 pt-1">
          <button
            onClick={() => setObjectivesModalOpen(true)}
            className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <span>🎯</span>
            <span>Mục tiêu khoá học</span>
          </button>
          <span>•</span>
          <button
            onClick={() => setFeedbackOpen(true)}
            className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <span>⭐</span>
            <span>Góp ý khoá học</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="w-full max-w-xl mx-auto my-3 p-4 rounded-2xl bg-rose-50 text-rose-700 text-xs font-bold">
          {error}
        </div>
      )}

      {/* 2. Road Map Content */}
      <div className="w-full max-w-2xl px-4 mt-6">
        {loading || detailLoading ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-400">Đang tải bản đồ khoá học...</p>
          </div>
        ) : selectedCourse ? (
          <div className="space-y-16">
            {selectedCourse.parts?.map((part, pIdx) => {
              const lessons = part.lessons || [];
              const lessonHeight = 100;
              const totalHeight = lessons.length * lessonHeight + 20;

              // Authentic winding S-curve horizontal percentages
              const xPositions = [50, 36, 28, 40, 62, 72, 60, 48];

              return (
                <div key={part.id || pIdx} className="space-y-6">
                  {/* Part Header matching Image 1 */}
                  <div className="text-center space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                      PART {pIdx + 1}
                    </span>
                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                      {part.title}
                    </h2>
                  </div>

                  {/* Winding Canvas Container */}
                  <div className="relative overflow-hidden" style={{ height: `${totalHeight}px` }}>
                    {/* SVG Winding Path */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox={`0 0 100 ${totalHeight}`}
                      preserveAspectRatio="none"
                    >
                      <path
                        d={lessons
                          .map((_, idx) => {
                            const x = xPositions[idx % xPositions.length];
                            const y = idx * lessonHeight + 45;
                            return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                          })
                          .join(' ')}
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="3"
                        strokeDasharray="6 6"
                      />
                    </svg>

                    {/* Lesson Nodes along the winding curve */}
                    {lessons.map((les, lIdx) => {
                      const xPos = xPositions[lIdx % xPositions.length];
                      const yPos = lIdx * lessonHeight + 45;
                      const isCompleted = !!les.completed_at;

                      return (
                        <div
                          key={les.id}
                          style={{
                            left: `${xPos}%`,
                            top: `${yPos}px`,
                            transform: 'translate(-50%, -50%)',
                          }}
                          className="absolute z-10"
                        >
                          <button
                            type="button"
                            onClick={() => void openLesson(pIdx + 1, lIdx + 1, les)}
                            className="group px-4 py-2.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:border-slate-400 dark:hover:border-slate-500 hover:scale-105 transition-all flex items-center gap-3 cursor-pointer"
                          >
                            {/* Icon badge with green circle ring matching Image 1 */}
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition ${
                                isCompleted
                                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                                  : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <GraduationCap className="w-4 h-4 text-indigo-600" />
                              )}
                            </div>

                            {/* Lesson Title */}
                            <span className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {les.title}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center text-slate-400 text-xs">
            Chưa có lộ trình bài học cho lựa chọn này.
          </div>
        )}
      </div>

      {/* 3. Authentic 7-Activity Modal Matching Image 1 */}
      {activeLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 animate-scaleUp"
          >
            {/* Modal Header matching Image 1 */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {/* Badge Icon with green ring */}
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500/80 flex items-center justify-center text-emerald-600 shadow-xs shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    {activeLessonModal.lesson.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    Part {activeLessonModal.partNum} • Lesson {activeLessonModal.lessonNum} • {lessonActivities?.activities.length || 0} hoạt động
                  </p>
                  {lessonActivities?.progress && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                      ✓ Đã hoàn thành ({lessonActivities.progress.score}/{lessonActivities.progress.total} điểm)
                    </p>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setActiveLessonModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Activities matching Image 1 */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {lessonLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                  Đang tải hoạt động bài học...
                </div>
              ) : lessonError ? (
                <div className="py-8 text-center text-rose-500 text-xs font-semibold">
                  {lessonError}
                </div>
              ) : (
                lessonActivities?.activities.map((act, idx) => {
                  const Icon = getActivityIcon(act.key);
                  return (
                    <div
                      key={act.key + idx}
                      onClick={() => navigateToActivity(act.route)}
                      className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Icon Container */}
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                          <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>

                        {/* Title & Preview */}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span>{idx + 1}. {act.title}</span>
                            {act.scope === 'topic' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-medium">
                                Chủ đề
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-600 transition shrink-0 ml-2" />
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Button matching Image 1 */}
            <div className="pt-2">
              <button
                disabled={lessonLoading || !lessonActivities?.activities.length}
                onClick={() => {
                  if (lessonActivities?.activities[0]) {
                    navigateToActivity(lessonActivities.activities[0].route);
                  }
                }}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-md transition"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Course Objectives Modal */}
      {objectivesModalOpen && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Mục tiêu khoá học
                </h3>
              </div>
              <button
                onClick={() => setObjectivesModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900">
                <span className="font-bold text-indigo-900 dark:text-indigo-200">
                  {selectedCourse.title}
                </span>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-1">
                  Khung năng lực chuẩn: {selectedCourse.competence} • Đầy đủ tính năng thực hành không khoá Pro.
                </p>
              </div>

              <ul className="space-y-2 list-disc list-inside">
                <li>
                  <strong className="text-slate-800 dark:text-white">Luyện nói phản xạ:</strong> Thực hành phát âm từng câu qua microphone với nhận diện giọng nói bản ngữ.
                </li>
                <li>
                  <strong className="text-slate-800 dark:text-white">Vốn từ vựng bài bản:</strong> Tích hợp sổ từ vựng chuẩn ngữ nghĩa, âm thanh tự nhiên và flashcard ôn tập.
                </li>
                <li>
                  <strong className="text-slate-800 dark:text-white">Thử thách hội thoại:</strong> Mô phỏng ngữ cảnh đời sống thực tế, chấm điểm và lưu tiến độ trên hệ thống.
                </li>
              </ul>
            </div>

            <button
              onClick={() => setObjectivesModalOpen(false)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* 5. Feedback Modal */}
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
};