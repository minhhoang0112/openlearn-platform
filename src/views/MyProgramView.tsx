import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Terminal,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Loader2,
  AlertCircle,
  Award,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  api,
  LearningProgramSummary,
  LearningProgramDetail,
  LearningLessonMetadata
} from '../api/client';
import { useRouter } from '../context/RouterContext';
import { withNavigationContext } from '../utils/navigationContext';

export const MyProgramView: React.FC = () => {
  const { path, navigate } = useRouter();

  const queryParams = new URLSearchParams(path.includes('?') ? path.split('?')[1] : window.location.search);
  const initialProgram = queryParams.get('program') || 'english-foundation';

  const [programs, setPrograms] = useState<LearningProgramSummary[]>([]);
  const [activeProgramId, setActiveProgramId] = useState<string>(initialProgram);
  const [detail, setDetail] = useState<LearningProgramDetail | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startingLessonId, setStartingLessonId] = useState<string | null>(null);

  const handleSelectProgram = (programId: string) => {
    setActiveProgramId(programId);
    navigate(`/my-program?program=${encodeURIComponent(programId)}`);
  };

  // Fetch list of programs
  useEffect(() => {
    let mounted = true;
    setLoadingList(true);
    api.getLearningPrograms()
      .then((res) => {
        if (!mounted) return;
        const items = res.items || [];
        setPrograms(items);
        if (items.length > 0) {
          const match = items.find((p) => p.id === initialProgram);
          setActiveProgramId(match ? match.id : items[0].id);
        }
      })
      .catch((err) => {
        if (mounted) setError((err as Error).message || 'Không thể tải danh sách chương trình');
      })
      .finally(() => {
        if (mounted) setLoadingList(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch detail for selected program
  useEffect(() => {
    if (!activeProgramId) return;
    let mounted = true;
    setLoadingDetail(true);
    setError(null);
    api.getLearningProgram(activeProgramId)
      .then((res) => {
        if (mounted) setDetail(res);
      })
      .catch((err) => {
        if (mounted) setError((err as Error).message || 'Không thể tải chi tiết chương trình');
      })
      .finally(() => {
        if (mounted) setLoadingDetail(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeProgramId]);

  const handleStartLesson = async (lesson: LearningLessonMetadata, forceNew = false) => {
    setStartingLessonId(lesson.id);
    try {
      const res = await api.startLearningSession(lesson.id, !forceNew);
      const returnUrl = `/my-program?program=${encodeURIComponent(activeProgramId)}`;
      navigate(withNavigationContext(`/lesson-run/${res.id}`, {
        source: 'program',
        from: returnUrl,
      }));
    } catch (err) {
      setError((err as Error).message || 'Không thể mở bài học');
      setStartingLessonId(null);
    }
  };

  if (loadingList) {
    return (
      <div className="max-w-5xl mx-auto p-6 md:p-8 flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-semibold">Đang tải danh mục chương trình học...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 pb-20">
      {/* Header */}
      <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          <span>Chương trình học chuẩn hoá</span>
          <span>•</span>
          <span>Lộ trình học toàn diện</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Lộ trình học tập của tôi
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
          Các bài học được kết hợp đầy đủ các kỹ năng: Nghe hiểu, Từ vựng theo ngữ cảnh, Ngữ pháp câu, Phát âm và Tự luyện nói/viết.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Program Selection Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {programs.map((p) => {
          const isSelected = p.id === activeProgramId;
          const isSpecialist = p.kind === 'specialist';

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectProgram(p.id)}
              className={`p-5 rounded-3xl border-2 text-left transition-all flex flex-col justify-between focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isSelected
                  ? 'border-indigo-600 bg-white dark:bg-slate-900 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      isSpecialist
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    {isSpecialist ? <Terminal className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {p.status}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        isSpecialist
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      }`}
                    >
                      {isSpecialist ? 'Chuyên ngành' : 'Nền tảng'}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-extrabold text-base md:text-lg text-slate-900 dark:text-white">
                    {p.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isSpecialist
                      ? 'Dành cho sinh viên & kỹ sư IT: hệ thống, thao tác lệnh, báo lỗi ticket và cập nhật trạng thái.'
                      : 'Nền tảng giao tiếp A1-B1: củng cố ngữ âm, đại từ, cấu trúc câu, từ vựng sinh hoạt.'}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs w-full">
                <span className="font-semibold text-slate-400">
                  {p.lesson_count} bài học mẫu
                </span>
                <span className={`font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                  {isSelected ? 'Đang xem chương trình này' : 'Bấm để xem'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Program Units & Lessons Detail */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-7 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nội dung chi tiết</div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {detail?.title || 'Đang tải...'}
            </h2>
          </div>
          {detail && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              Phiên bản v{detail.version}
            </span>
          )}
        </div>

        {loadingDetail ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs font-bold">Đang tải bài học...</p>
          </div>
        ) : !detail ? (
          <div className="py-8 text-center text-xs text-slate-400">Không có dữ liệu bài học</div>
        ) : (
          <div className="space-y-6">
            {detail.units.map((unit) => (
              <div key={unit.id} className="space-y-3">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                  {unit.title}
                </h3>

                <div className="space-y-3">
                  {unit.lessons.map((lesson) => {
                    const isDone = Boolean(lesson.completed_at);
                    const isBusy = startingLessonId === lesson.id;

                    return (
                      <div
                        key={lesson.id}
                        className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isDone
                            ? 'border-emerald-200 dark:border-emerald-900/60 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              Mã bài: {lesson.id}
                            </span>
                            {lesson.lesson_kind === 'checkpoint' ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-[10px] font-black text-amber-800 dark:text-amber-300 flex items-center gap-1 border border-amber-300 dark:border-amber-700/60 shadow-xs">
                                <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                <span>Ôn chặng</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                Bài học
                              </span>
                            )}
                            {isDone && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Đã hoàn thành</span>
                              </span>
                            )}
                          </div>

                          <h4 className="font-black text-base md:text-lg text-slate-900 dark:text-white">
                            {lesson.title}
                          </h4>

                          {/* Objectives */}
                          {lesson.objectives?.length > 0 && (
                            <div className="space-y-1 pt-1">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Mục tiêu làm được:
                              </span>
                              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5 list-disc list-inside">
                                {lesson.objectives.map((obj, i) => (
                                  <li key={i}>{obj}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{lesson.estimated_minutes} phút</span>
                            </span>
                            <span>• Âm thanh WAV thật lưu sẵn</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 md:self-center shrink-0">
                          {isDone ? (
                            <div className="flex items-center gap-2 w-full md:w-auto">
                              <button
                                disabled={isBusy}
                                onClick={() => void handleStartLesson(lesson, false)}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
                              >
                                Xem kết quả
                              </button>
                              <button
                                disabled={isBusy}
                                onClick={() => void handleStartLesson(lesson, true)}
                                className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 transition"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{lesson.lesson_kind === 'checkpoint' ? 'Ôn lại chặng' : 'Học lại'}</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              disabled={isBusy}
                              onClick={() => void handleStartLesson(lesson, false)}
                              className="w-full md:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50"
                            >
                              {isBusy ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Đang mở...</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 fill-white" />
                                  <span>{lesson.lesson_kind === 'checkpoint' ? 'Bắt đầu ôn chặng' : 'Bắt đầu học ngay'}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

