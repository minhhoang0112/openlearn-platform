import React, { useEffect, useState } from 'react';
import {
  Headphones,
  Play,
  RotateCcw,
  Clock,
  Sparkles,
  Loader2,
  AlertCircle,
  Volume2,
  ChevronRight,
  Sliders,
  History,
  CheckCircle2,
  X,
  Repeat
} from 'lucide-react';
import {
  api,
  ListeningCatalogItem,
  ListeningSession,
  ListeningSessionHistoryItem,
  ListeningSessionSettings
} from '../api/client';
import { useRouter } from '../context/RouterContext';

export const ListeningLibraryView: React.FC = () => {
  const { navigate } = useRouter();

  const [activeTab, setActiveTab] = useState<'catalog' | 'history'>('catalog');

  // Catalog state
  const [catalogItems, setCatalogItems] = useState<ListeningCatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<ListeningSessionHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Session configuration modal state
  const [selectedItem, setSelectedItem] = useState<ListeningCatalogItem | null>(null);
  const [mode, setMode] = useState<'listen_repeat' | 'shadowing'>('listen_repeat');
  const [rate, setRate] = useState<number>(0.9);
  const [targetRepetitions, setTargetRepetitions] = useState<number>(2);
  const [startingSession, setStartingSession] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Fetch catalog items
  const fetchCatalog = async () => {
    setLoadingCatalog(true);
    setCatalogError(null);
    try {
      const res = await api.getListeningCatalog();
      setCatalogItems(res.items || []);
    } catch (err) {
      setCatalogError((err as Error).message || 'Không thể tải thư viện luyện nghe');
    } finally {
      setLoadingCatalog(false);
    }
  };

  // Fetch history items
  const fetchHistory = async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await api.getListeningSessions({ limit: 50 });
      setHistoryItems(res.items || []);
    } catch (err) {
      setHistoryError((err as Error).message || 'Không thể tải lịch sử luyện nghe');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void fetchCatalog();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      void fetchHistory();
    }
  }, [activeTab]);

  // Handle open config modal
  const openConfigModal = (item: ListeningCatalogItem) => {
    setSelectedItem(item);
    setMode('listen_repeat');
    setRate(0.9);
    setTargetRepetitions(2);
    setStartError(null);
  };

  const closeConfigModal = () => {
    setSelectedItem(null);
    setStartError(null);
  };

  // Handle start session
  const handleStartSession = async (resume = true) => {
    if (!selectedItem || startingSession) return;
    setStartingSession(true);
    setStartError(null);

    const settings: ListeningSessionSettings = {
      mode,
      rate,
      target_repetitions: targetRepetitions
    };

    try {
      const session = await api.startListeningSession(selectedItem.lesson_id, settings, resume);
      closeConfigModal();
      navigate(`/listening/practice/${session.id}`);
    } catch (err) {
      setStartError((err as Error).message || 'Không thể khởi tạo phiên luyện nghe');
    } finally {
      setStartingSession(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 pb-28">
      {/* Page Header */}
      <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          <Headphones className="w-4 h-4" />
          <span>Thư viện luyện nghe V2</span>
          <span>•</span>
          <span>Nghe từng câu & Shadowing</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Luyện nghe câu & Nói đuổi (Shadowing)
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
          Mỗi bài học được chia thành các câu ngắn với file âm thanh WAV chuẩn riêng biệt. Bạn có thể nghe lặp lại nhiều lần hoặc bật chế độ nói đuổi (shadowing) để rèn phản xạ phát âm.
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          <span>Danh mục học liệu ({catalogItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch sử các phiên luyện tập</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/materials')}
          className="ml-auto mb-1.5 px-3.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition flex items-center gap-1.5 shadow-2xs"
        >
          <Headphones className="w-3.5 h-3.5" />
          <span>Học liệu cá nhân của tôi</span>
          <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] rounded-full font-black">Mới</span>
        </button>
      </div>

      {/* TAB 1: CATALOG ITEMS */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {loadingCatalog ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold">Đang tải danh mục bài luyện nghe...</p>
            </div>
          ) : catalogError ? (
            <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-3xl text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">{catalogError}</p>
              <button
                type="button"
                onClick={() => void fetchCatalog()}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl"
              >
                Thử lại
              </button>
            </div>
          ) : catalogItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400">Chưa có bài học luyện nghe nào khả dụng.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catalogItems.map((item) => {
                const isReady = item.sentence_practice_available && item.sentence_count > 0;
                const isCheckpoint = item.lesson_kind === 'checkpoint';

                return (
                  <div
                    key={item.lesson_id}
                    className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between space-y-4 ${
                      isReady
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 opacity-60'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            {item.lesson_id}
                          </span>
                          {item.program_id === 'english-it-system' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              IT / System
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                              Nền tảng
                            </span>
                          )}
                          {isCheckpoint && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                              Ôn chặng
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                            v{item.content_version}
                          </span>
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {item.sentence_count} câu
                        </span>
                      </div>

                      <div>
                        <h3 className="font-extrabold text-base md:text-lg text-slate-900 dark:text-white">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 italic">
                          "{item.transcript}"
                        </p>
                      </div>

                      <div className="pt-1 text-[11px] text-slate-400 flex items-center gap-3">
                        <span>Giọng: {item.voice}</span>
                        <span>•</span>
                        <span>WAV câu riêng</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-400">
                        {isReady ? 'Đã có audio từng câu' : 'Đang chuẩn bị clip'}
                      </span>

                      {isReady ? (
                        <button
                          type="button"
                          onClick={() => openConfigModal(item)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Luyện bài này</span>
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 italic">
                          Chưa khả dụng
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HISTORY SESSIONS */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {loadingHistory ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold">Đang tải lịch sử các phiên luyện nghe...</p>
            </div>
          ) : historyError ? (
            <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-3xl text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">{historyError}</p>
              <button
                type="button"
                onClick={() => void fetchHistory()}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl"
              >
                Thử lại
              </button>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
              Bạn chưa có phiên luyện nghe từng câu nào. Hãy chọn một bài học ở tab trên để bắt đầu!
            </div>
          ) : (
            <div className="space-y-3">
              {historyItems.map((sess) => {
                const isCompleted = sess.status === 'completed';

                return (
                  <div
                    key={sess.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isCompleted
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                          }`}
                        >
                          {isCompleted ? 'Đã hoàn tất' : 'Đang học dở'}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {(sess.settings?.mode === 'shadowing' ? 'Nói đuổi (Shadowing)' : 'Nghe & Lặp lại') + (sess.settings?.rate ? ` • ${sess.settings.rate}x` : '')}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                        {sess.title}
                      </h4>

                      <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span>Đã luyện: {sess.summary?.practised_sentences ?? 0} câu</span>
                        <span>•</span>
                        <span>Bỏ qua: {sess.summary?.skipped_sentences ?? 0}</span>
                        <span>•</span>
                        <span>Tự nhắc: {sess.summary?.repetitions_self_reported ?? 0} lượt</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/listening/practice/${sess.id}`)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          isCompleted
                            ? 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {isCompleted ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Xem / Luyện lại</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Tiếp tục phiên</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONFIGURATION POPUP MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Cài đặt phiên luyện tập
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeConfigModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {startError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-semibold">
                {startError}
              </div>
            )}

            {/* Config 1: Mode */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Chế độ luyện tập
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('listen_repeat')}
                  className={`p-3 rounded-2xl border-2 text-left transition ${
                    mode === 'listen_repeat'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Nghe & Lặp lại</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Nghe câu xong, dừng để nhắc lại từng từ.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('shadowing')}
                  className={`p-3 rounded-2xl border-2 text-left transition ${
                    mode === 'shadowing'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Nói đuổi (Shadowing)</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Nói bám theo giọng mẫu gần như đồng thời.
                  </div>
                </button>
              </div>
            </div>

            {/* Config 2: Speed / Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold uppercase tracking-wider text-slate-500">
                  2. Tốc độ phát audio
                </label>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                  {rate}x
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[0.5, 0.75, 0.9, 1.0, 1.25].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRate(r)}
                    className={`py-2 rounded-xl text-xs font-bold transition ${
                      rate === r
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>

            {/* Config 3: Target Repetitions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold uppercase tracking-wider text-slate-500">
                  3. Số lượt nhắc lại mục tiêu mỗi câu
                </label>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                  {targetRepetitions} lần
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rep) => (
                  <button
                    key={rep}
                    type="button"
                    onClick={() => setTargetRepetitions(rep)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                      targetRepetitions === rep
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                        : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {rep}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeConfigModal}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={startingSession}
                onClick={() => void handleStartSession(true)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-1.5 transition shadow-md"
              >
                {startingSession ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang mở phiên...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Bắt đầu luyện ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

