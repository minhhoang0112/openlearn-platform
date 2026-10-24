import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from '../context/RouterContext';
import { api, PathCard, SetCard } from '../api/client';
import { normalizeSetProgress } from '../utils/setProgress';
import { parseNavigationContext, sanitizeInternalPath, withNavigationContext } from '../utils/navigationContext';
import {
  ArrowLeft,
  Compass,
  Bookmark,
  ArrowRight,
  Loader2,
  Repeat,
} from 'lucide-react';

export const LearningPathView: React.FC = () => {
  const { params, path: currentFullPath, navigate } = useRouter();
  const pathId = Number(params.id) || 14;
  const navCtx = parseNavigationContext(currentFullPath);

  const [pathData, setPathData] = useState<PathCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fetchPath = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await api.getPath(pathId);
      setPathData(res);
      setSaved(res.saved || false);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải lộ trình học tập.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [pathId]);

  useEffect(() => {
    void fetchPath(true);
    const onSrsUpdated = () => {
      void fetchPath(false);
    };
    window.addEventListener('openquiz:srs-updated', onSrsUpdated);
    return () => {
      window.removeEventListener('openquiz:srs-updated', onSrsUpdated);
    };
  }, [fetchPath]);

  const backRoute = navCtx.from
    ? sanitizeInternalPath(navCtx.from, '/')
    : navCtx.source === 'library'
      ? '/my-created'
      : '/';
  const backLabel =
    navCtx.source === 'library' || (navCtx.from && navCtx.from.startsWith('/my-created'))
      ? 'Về Thư viện'
      : 'Về Trang chủ';

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm">Đang tải các bộ thẻ của lộ trình...</p>
      </div>
    );
  }

  if (error || !pathData) {
    return (
      <div className="max-w-md mx-auto p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <p className="text-rose-500 font-semibold mb-3">{error || 'Không tìm thấy lộ trình'}</p>
        <button
          onClick={() => navigate(backRoute)}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold"
        >
          {backLabel}
        </button>
      </div>
    );
  }

  const actualSets = pathData.sets || [];
  const totalSlots = actualSets.length;
  const masteredSets = actualSets.filter((s) => normalizeSetProgress(s).state === 'mastered').length;
  const inProgressSets = actualSets.filter((s) => normalizeSetProgress(s).state === 'in_progress').length;
  const totalWords = actualSets.reduce((n, s) => n + normalizeSetProgress(s).totalWords, 0);
  const totalReviewedWords = actualSets.reduce((n, s) => n + normalizeSetProgress(s).reviewedWords, 0);

  const handleToggleSave = async () => {
    const nextSaved = !saved;
    setSaved(nextSaved);
    try {
      await api.save('path', pathId, nextSaved);
    } catch {
      setSaved(!nextSaved);
    }
  };

  const buildSetLink = (targetBase: string, s: SetCard) =>
    withNavigationContext(targetBase, {
      source: 'path',
      from: `/learning-path/${pathId}`,
      pathId,
      pathTitle: pathData.title,
      setTitle: s.title,
    });

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <button
            type="button"
            data-testid="contextual-back-button"
            onClick={() => navigate(backRoute)}
            className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition shrink-0 mt-1 inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{backLabel}</span>
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {pathData.title}
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
                {pathData.tag || 'Lộ trình'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {pathData.description || ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
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
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {masteredSets} / {totalSlots} bộ đã thuộc • {inProgressSets} bộ đang học •{' '}
                {totalReviewedWords}/{totalWords} từ đã luyện
              </div>
            </div>
          </div>

          <div className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
            {totalSlots ? Math.round((masteredSets / totalSlots) * 100) : 0}% Hoàn thành
          </div>
        </div>

        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: (totalSlots ? (masteredSets / totalSlots) * 100 : 0) + '%' }}
          />
        </div>
      </div>

      {/* Sets Roadmap Grid — Driven strictly by BE SetCard.progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Danh sách {totalSlots} bộ thẻ hiện có
          </h2>
          <span className="text-xs text-slate-400">Trạng thái thực từ tiến độ học</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actualSets.map((s, idx) => {
            const prog = normalizeSetProgress(s);
            const isStudying = prog.state === 'in_progress';
            const isMastered = prog.state === 'mastered';

            return (
              <div
                key={s.id || idx}
                data-testid={`path-set-card-${s.id}`}
                onClick={() => navigate(buildSetLink(`/study-set/${s.id}`, s))}
                className={`p-5 rounded-2xl border transition flex flex-col justify-between gap-4 cursor-pointer group ${
                  isStudying
                    ? 'border-indigo-500/80 bg-white dark:bg-slate-900 shadow-sm'
                    : isMastered
                      ? 'border-emerald-300 dark:border-emerald-800/80 bg-white dark:bg-slate-900'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        isStudying
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : isMastered
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950 group-hover:text-indigo-600'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          {s.title}
                        </h3>
                        <span
                          data-testid={`set-state-badge-${s.id}`}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${prog.stateBadgeClass}`}
                        >
                          {prog.stateLabel}
                        </span>
                        {prog.dueWords > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold inline-flex items-center gap-1">
                            <Repeat className="w-2.5 h-2.5" />
                            <span>Cần ôn {prog.dueWords} từ</span>
                          </span>
                        )}
                      </div>

                      <div
                        data-testid={`set-progress-text-${s.id}`}
                        className="text-xs text-slate-500 dark:text-slate-400 font-medium"
                      >
                        <span>{prog.totalWords} từ</span>
                        <span> • </span>
                        <span>{prog.summaryText}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bar + Consistent 2 CTA buttons */}
                <div className="space-y-3 pt-1">
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isMastered ? 'bg-emerald-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${prog.percentReviewed}%` }}
                    />
                  </div>

                  <div
                    className="flex items-center justify-end gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      data-testid={`set-view-cta-${s.id}`}
                      onClick={() => navigate(buildSetLink(`/study-set/${s.id}`, s))}
                      className="px-3.5 py-2 bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                    >
                      Xem bộ
                    </button>

                    <button
                      type="button"
                      data-testid={`set-primary-cta-${s.id}`}
                      onClick={() =>
                        navigate(
                          buildSetLink(
                            prog.state === 'empty' ? `/study-set/${s.id}` : `/study/${s.id}`,
                            s,
                          ),
                        )
                      }
                      className="px-4 py-2 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                    >
                      <span>{prog.primaryCtaLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
