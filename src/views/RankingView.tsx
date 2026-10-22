import React, { useState, useEffect } from 'react';
import { api, RankingUser } from '../api/client';
import { Trophy, Medal, Crown, Flame, Sparkles, Loader2 } from 'lucide-react';

export const RankingView: React.FC = () => {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [rankingList, setRankingList] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getRanking(period)
      .then((res) => {
        if (mounted) setRankingList(res.items || []);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [period]);

  const top1 = rankingList[0];
  const top2 = rankingList[1];
  const top3 = rankingList[2];
  const rest = rankingList.slice(3);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Bảng xếp hạng học viên
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Vinh danh những học viên có chuỗi học tập và điểm số từ vựng cao nhất
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              period === 'week'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tuần này
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              period === 'month'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tháng này
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-3" />
          <p className="text-sm">Đang cập nhật bảng xếp hạng...</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-3 md:gap-6 items-end pt-8 pb-4">
            {/* 2nd Place */}
            {top2 && (
              <div className="p-4 md:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs order-1">
                <div className="relative inline-block">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center text-xl font-black mx-auto">
                    {top2.name.charAt(0)}
                  </div>
                  <span className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-extrabold text-xs flex items-center justify-center border-2 border-white">
                    2
                  </span>
                </div>
                <div>
                  <h3 className="text-xs md:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {top2.name}
                  </h3>
                  <div className="text-xs md:text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {top2.points} pts
                  </div>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {top1 && (
              <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-b from-amber-500/10 to-transparent bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-500 text-center space-y-4 shadow-md order-2 -mt-6">
                <div className="relative inline-block">
                  <Crown className="w-7 h-7 text-amber-500 absolute -top-5 left-1/2 -translate-x-1/2" />
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl font-black mx-auto shadow-sm">
                    {top1.name.charAt(0)}
                  </div>
                  <span className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-amber-400 text-slate-900 font-black text-xs flex items-center justify-center border-2 border-white shadow-xs">
                    1
                  </span>
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-black text-slate-900 dark:text-white truncate">
                    {top1.name}
                  </h3>
                  <div className="text-base md:text-lg font-black text-amber-500 mt-0.5">
                    {top1.points} pts
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3 && (
              <div className="p-4 md:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs order-3">
                <div className="relative inline-block">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-amber-900/20 text-amber-800 flex items-center justify-center text-xl font-black mx-auto">
                    {top3.name.charAt(0)}
                  </div>
                  <span className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-amber-700 text-white font-extrabold text-xs flex items-center justify-center border-2 border-white">
                    3
                  </span>
                </div>
                <div>
                  <h3 className="text-xs md:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {top3.name}
                  </h3>
                  <div className="text-xs md:text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {top3.points} pts
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              Bảng xếp hạng chung
            </div>

            {rest.length === 0 && rankingList.length <= 3 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Hãy là người tiếp theo ghi điểm để leo hạng!
              </div>
            ) : (
              rest.map((user) => (
                <div
                  key={user.user_id}
                  className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 text-center font-bold text-sm text-slate-400">
                      {user.rank}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center">
                      {user.name.charAt(0)}
                    </div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {user.name}
                    </span>
                  </div>

                  <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                    {user.points} pts
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

