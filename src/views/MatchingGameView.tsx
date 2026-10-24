import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from '../context/RouterContext';
import { api, StudySession } from '../api/client';
import { parsePracticeLaunchQuery } from '../utils/practiceLaunch';
import { LearningBreadcrumb } from '../components/LearningBreadcrumb';
import { forwardNavigationContext } from '../utils/navigationContext';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Gamepad2,
  Clock,
  RotateCcw,
  Trophy,
  Sparkles,
  Loader2
} from 'lucide-react';

interface TilePair {
  id: string;
  text: string;
  type: 'term' | 'definition';
  question_id: string;
}

export const MatchingGameView: React.FC = () => {
  const { params, path, navigate, goBack } = useRouter();
  const setId = Number(params.id) || 163;
  const launchQuery = useMemo(() => parsePracticeLaunchQuery(path), [path]);

  const [session, setSession] = useState<StudySession | null>(null);
  const [tiles, setTiles] = useState<TilePair[]>([]);
  const [selectedTile, setSelectedTile] = useState<TilePair | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [mismatchedIds, setMismatchedIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const timerRef = useRef<any>(null);
  const submittingRef = useRef(false);

  const initGame = async () => {
    setLoading(true);
    setIsGameOver(false);
    setSelectedTile(null);
    setMatchedIds(new Set());
    setMismatchedIds(new Set());
    setTimer(0);
    clearInterval(timerRef.current);

    try {
      const s = await api.startStudy(setId, 'match', {
        ...(launchQuery.wordIds.length > 0 ? { word_ids: launchQuery.wordIds } : {}),
        ...(launchQuery.reviewScope === 'due' ? { due_only: true } : {}),
      });
      setSession(s);

      const pRes = await api.getMatchPairs(s.id);
      // Shuffle pairs
      const list: TilePair[] = [
        ...pRes.terms.map(t=>({id:`term:${t.id}`,question_id:t.id,text:t.text,type:'term' as const})),
        ...pRes.definitions.map(t=>({id:`definition:${t.id}`,question_id:t.id,text:t.text,type:'definition' as const}))
      ];
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      setTiles(list);

      // Start timer
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 100);
      }, 100);
    } catch (err: any) {
      setError(err?.message || 'Không thể khởi tạo trò chơi ghép từ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initGame();
    return () => clearInterval(timerRef.current);
  }, [setId, launchQuery]);

  const handleTileClick = async (tile: TilePair) => {
    if (submittingRef.current || matchedIds.has(tile.id) || isGameOver || mismatchedIds.size > 0) return;

    if (!selectedTile) {
      setSelectedTile(tile);
      return;
    }

    if (selectedTile.id === tile.id) {
      setSelectedTile(null);
      return;
    }

    // Check if matched
    if (selectedTile.question_id === tile.question_id && selectedTile.type !== tile.type) {
      if (!session) return;
      submittingRef.current = true;
      try {
        await api.answer(session.id, selectedTile.question_id, selectedTile.type === 'definition' ? selectedTile.text : tile.text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không lưu được kết quả.');
        return;
      } finally {
        submittingRef.current = false;
      }
      // Correct Match!
      const newMatched = new Set(matchedIds);
      newMatched.add(selectedTile.id);
      newMatched.add(tile.id);
      setMatchedIds(newMatched);
      setSelectedTile(null);


      // Check if all matched
      if (newMatched.size >= tiles.length && tiles.length > 0) {
        clearInterval(timerRef.current);
        setIsGameOver(true);
        try {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch {}
      }
    } else {
      // Mismatch
      const errSet = new Set<string>([selectedTile.id, tile.id]);
      setMismatchedIds(errSet);
      setTimeout(() => {
        setMismatchedIds(new Set());
        setSelectedTile(null);
      }, 600);
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm">Đang tải thẻ ghép từ...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-md mx-auto p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <p className="text-rose-500 font-semibold mb-3">{error || 'Không thể bắt đầu trò chơi'}</p>
        <button
          onClick={() => goBack()}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold"
        >
          Quay lại bộ từ
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <LearningBreadcrumb currentLabel="Ghép thẻ" setId={setId} />
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Ghép từ (Matching Game)</h1>
            <p className="text-xs text-slate-400">Chọn 1 từ tiếng Anh và 1 nghĩa tương ứng để ghép cặp</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-sm font-bold">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>{formatTime(timer)}</span>
          </div>
          <button
            onClick={initGame}
            title="Chơi lại"
            className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Game Over Win Card */}
      {isGameOver ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-5 max-w-md mx-auto shadow-sm">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 text-amber-500 flex items-center justify-center shadow-lg">
            <Trophy className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Kỷ lục ghép từ tuyệt vời!
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Bạn đã ghép chính xác tất cả các cặp từ trong thời gian:
            </p>
            <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-2">
              {formatTime(timer)}
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={initGame}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Chơi lại ván mới</span>
            </button>
            <button
              onClick={() => navigate(forwardNavigationContext(`/study-set/${setId}`, path))}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
            >
              Quay về bộ từ
            </button>
          </div>
        </div>
      ) : (
        /* Tile Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {tiles.map((tile) => {
            const isMatched = matchedIds.has(tile.id);
            const isSelected = selectedTile?.id === tile.id;
            const isMismatched = mismatchedIds.has(tile.id);

            if (isMatched) {
              return (
                <div
                  key={tile.id}
                  className="min-h-[110px] rounded-2xl border border-transparent bg-slate-50/20 dark:bg-slate-900/20 opacity-0 pointer-events-none transition-all duration-300"
                />
              );
            }

            return (
              <button
                key={tile.id}
                onClick={() => handleTileClick(tile)}
                className={`min-h-[110px] p-4 rounded-2xl border text-center font-bold text-sm transition-all duration-200 flex items-center justify-center select-none shadow-xs cursor-pointer ${
                  isMismatched
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 animate-shake'
                    : isSelected
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500 shadow-md scale-102'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-slate-400 hover:shadow-sm'
                }`}
              >
                <span className="leading-snug">{tile.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

