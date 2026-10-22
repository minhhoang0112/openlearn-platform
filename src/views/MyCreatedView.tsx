import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { api, SetCard, PathCard } from '../api/client';
import {
  FolderHeart,
  PlusCircle,
  BookOpen,
  Compass,
  ChevronRight,
  ArrowRight,
  Loader2
} from 'lucide-react';

export const MyCreatedView: React.FC = () => {
  const { navigate } = useRouter();

  const [tab, setTab] = useState<'my_sets' | 'saved_sets' | 'saved_paths'>('my_sets');
  const [sets, setSets] = useState<SetCard[]>([]);
  const [paths, setPaths] = useState<PathCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.allSettled([
      api.getSets(tab === 'my_sets' ? 'mine' : 'saved'),
      api.getPaths('saved')
    ]).then(([sRes, pRes]) => {
      if (!mounted) return;
      if (sRes.status === 'fulfilled') setSets(sRes.value.items || []);
      if (pRes.status === 'fulfilled') setPaths(pRes.value.items || []);
      setLoading(false);
    });

    return () => { mounted = false; };
  }, [tab]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm">Đang tải tài liệu học tập của bạn...</p>
      </div>
    );
  }

  const savedSets = sets.filter((s) => s.saved);
  const savedPaths = paths.filter((p) => p.saved);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <FolderHeart className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Tủ sách học tập cá nhân
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quản lý các bộ thẻ từ vựng tự tạo và các nội dung bạn đã lưu
          </p>
        </div>

        <button
          onClick={() => navigate('/create-flashcard')}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Tạo bộ thẻ mới</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
        <button
          onClick={() => setTab('my_sets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            tab === 'my_sets'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Bộ thẻ đã tạo ({sets.length})
        </button>
        <button
          onClick={() => setTab('saved_sets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            tab === 'saved_sets'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Bộ thẻ đã lưu ({savedSets.length})
        </button>
        <button
          onClick={() => setTab('saved_paths')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            tab === 'saved_paths'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Lộ trình đã lưu ({savedPaths.length})
        </button>
      </div>

      {/* Tab Contents */}
      {tab === 'my_sets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sets.length === 0 ? (
            <div className="col-span-full py-16 text-center text-xs text-slate-400">
              Bạn chưa có bộ thẻ nào. Nhấp vào "Tạo bộ thẻ mới" để bắt đầu!
            </div>
          ) : (
            sets.map((set) => (
              <div
                key={set.id}
                onClick={() => navigate(`/study-set/${set.id}`)}
                className="group p-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xs hover:border-indigo-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                      {set.tag || 'TOEIC'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {set.word_count} từ
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition mb-1">
                    {set.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {set.description || 'Bộ từ vựng tiếng Anh cá nhân.'}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-400">Học ngay</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'saved_sets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedSets.length === 0 ? (
            <div className="col-span-full py-16 text-center text-xs text-slate-400">
              Bạn chưa đánh dấu lưu bộ thẻ nào.
            </div>
          ) : (
            savedSets.map((set) => (
              <div
                key={set.id}
                onClick={() => navigate(`/study-set/${set.id}`)}
                className="group p-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xs hover:border-amber-500 transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-500 mb-1">
                    {set.title}
                  </h3>
                  <p className="text-xs text-slate-500">{set.word_count} từ</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-amber-600 font-bold">
                  Đã lưu vào danh mục
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'saved_paths' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {savedPaths.length === 0 ? (
            <div className="col-span-full py-16 text-center text-xs text-slate-400">
              Bạn chưa lưu lộ trình học nào.
            </div>
          ) : (
            savedPaths.map((path) => (
              <div
                key={path.id}
                onClick={() => navigate(`/learning-path/${path.id}`)}
                className="group p-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xs hover:border-indigo-500 transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 mb-1">
                    {path.title}
                  </h3>
                  <p className="text-xs text-slate-500">{path.set_count} bộ thẻ</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-indigo-600 font-bold">
                  Xem lộ trình →
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

