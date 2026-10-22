import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { api, PathCard, SetCard } from '../api/client';
import {
  ArrowLeft,
  Compass,
  Bookmark,
  Share2,
  Lock,
  Unlock,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Sparkles,
  Layers,
  Loader2
} from 'lucide-react';

export const LearningPathView: React.FC = () => {
  const { params, navigate, goBack } = useRouter();
  const pathId = Number(params.id) || 14;

  const [path, setPath] = useState<PathCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getPath(pathId)
      .then((res) => {
        if (mounted) {
          setPath(res);
          setSaved(res.saved || false);
        }
      })
      .catch((err) => {
        if (mounted) setError(err?.message || 'Không thể tải lộ trình học tập.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [pathId]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm">Đang tải các bộ thẻ của lộ trình...</p>
      </div>
    );
  }

  if (error || !path) {
    return (
      <div className="max-w-md mx-auto p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <p className="text-rose-500 font-semibold mb-3">{error || 'Không tìm thấy lộ trình'}</p>
        <button
          onClick={() => goBack()}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const actualSets = path.sets || [];
  const totalSlots = actualSets.length;
  const masteredSets = actualSets.filter(s=>s.word_count>0&&s.mastered_count===s.word_count).length;
  const totalWords = actualSets.reduce((n,s)=>n+s.word_count,0);

  const handleToggleSave = async () => {
    const nextSaved = !saved;
    setSaved(nextSaved);
    try {
      await api.save('path', pathId, nextSaved);
    } catch {
      setSaved(!nextSaved);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <button
            onClick={() => goBack()}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {path.title}
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
                {path.tag || 'TOEIC'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {path.description || ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleSave}
            className={`p-2.5 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold ${
              saved
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 text-amber-700 dark:text-amber-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${saved ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span>{saved ? 'Đã lưu lộ trình' : 'Lưu lộ trình'}</span>
          </button>
        </div>
      </div>

      {/* Progress & Milestone Overview Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                Tiến độ lộ trình học tập
              </div>
              <div className="text-xs text-slate-400">
                {masteredSets} / {totalSlots} bộ thẻ đã hoàn thành
              </div>
            </div>
          </div>

          <div className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
            {totalSlots ? Math.round(masteredSets / totalSlots * 100) : 0}% Hoàn thành
          </div>
        </div>

        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 rounded-full" style={{ width: (totalSlots ? masteredSets / totalSlots * 100 : 0) + '%' }} />
        </div>
      </div>

      {/* 50 Sets Roadmap Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Danh sách {totalSlots} bộ thẻ hiện có
          </h2>
          <span className="text-xs text-slate-400">Thứ tự trong lộ trình</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actualSets.map((s, idx) => {
            const isFirst = idx === 0;

            return (
              <div
                key={s.id || idx}
                onClick={() => navigate(`/study-set/${s.id}`)}
                className={`p-5 rounded-2xl border transition flex items-center justify-between gap-4 cursor-pointer group ${
                  isFirst
                    ? 'border-indigo-500/80 bg-white dark:bg-slate-900 shadow-sm'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                    isFirst
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950 group-hover:text-indigo-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                      {s.title}
                    </h3>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {s.word_count || 12} từ vựng • {isFirst ? 'Đang học' : 'Chưa học'}
                    </div>
                  </div>
                </div>

                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  {isFirst ? (
                    <button
                      onClick={() => navigate(`/study-set/${s.id}`)}
                      className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                    >
                      <span>Học ngay</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/study-set/${s.id}`)}
                      className="px-3.5 py-1.5 bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
                    >
                      Xem bộ
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

