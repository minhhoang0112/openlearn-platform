import React from 'react';
import { useRouter } from '../context/RouterContext';
import { Compass, Calendar, FolderHeart } from 'lucide-react';

export const NotFoundView: React.FC = () => {
  const { path, navigate } = useRouter();

  return (
    <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
      <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto shadow-xs">
        <Compass className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          Lỗi điều hướng
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          404 - Không tìm thấy trang
        </h1>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Đường dẫn <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs">{path.split('?')[0]}</code> bạn yêu cầu không tồn tại hoặc đã được chuyển dời.
        </p>
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/today', { replace: true })}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-xs transition"
        >
          <Calendar className="w-4 h-4" />
          <span>Về Học hôm nay</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/my-created')}
          className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-2 transition"
        >
          <FolderHeart className="w-4 h-4 text-slate-400" />
          <span>Về Thư viện</span>
        </button>
      </div>
    </div>
  );
};
