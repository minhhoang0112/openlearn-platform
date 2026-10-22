import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Volume2,
  Plus,
  Check,
  Loader2,
  Languages,
  ChevronDown,
  Clock,
  Trash2,
  ArrowRight
} from 'lucide-react';
import { playAudio } from '../utils/audio';
import { lookupDictionaryWord, DictionaryLookupResult } from '../utils/dictionary';
import {api} from '../api/client';

interface DictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

interface HistoryItem {
  term: string;
  meaning: string;
  phonetic?: string;
  pos?: string;
  timestamp: number;
}

export const DictionaryModal: React.FC<DictionaryModalProps> = ({
  isOpen,
  onClose,
  initialQuery = ''
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('vi');
  const [error, setError] = useState('');
  const [result, setResult] = useState<DictionaryLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [addedCards, setAddedCards] = useState<Record<number, boolean>>({});

  // Search History from localStorage
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('oq_dict_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (initialQuery.trim()) {
        setQuery(initialQuery);
        handleSearch(initialQuery);
      } else {
        setQuery('');
        setResult(null);
      }
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const saveToHistory = (res: DictionaryLookupResult) => {
    const meaning = res.senses[0]?.meaning || res.fullTranslation || '';
    const pos = res.senses[0]?.pos || '';
    const item: HistoryItem = {
      term: res.term,
      meaning,
      phonetic: res.phonetic,
      pos,
      timestamp: Date.now()
    };

    setHistory((prev) => {
      const filtered = prev.filter((h) => h.term.toLowerCase() !== res.term.toLowerCase());
      const updated = [item, ...filtered].slice(0, 20); // Keep last 20
      try {
        localStorage.setItem('oq_dict_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('oq_dict_history');
    } catch {}
  };

  const removeHistoryItem = (termToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => {
      const updated = prev.filter((h) => h.term !== termToRemove);
      try {
        localStorage.setItem('oq_dict_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleSearch = async (textToSearch?: string) => {
    const q = (textToSearch !== undefined ? textToSearch : query).trim();
    if (!q) {
      setResult(null);
      return;
    }

    setLoading(true);
    setError('');setResult(null);
    try {
      const res = await lookupDictionaryWord(
        q,
        sourceLang,
        targetLang === 'auto' ? 'vi' : targetLang
      );
      setResult(res);
      setAddedCards({});
      saveToHistory(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tra được từ này.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const handleAddCard = async (senseIdx: number) => {
    if (!result || loading || addedCards[senseIdx]) return;
    setLoading(true);setError('');
    try {
      const sense=result.senses[senseIdx];
      await api.createSet({title:'Tra cứu: '+result.term,visibility:'private',learning_language:'en',native_language:'vi',words:[{term:result.term,definition:sense.meaning,phonetic:result.phonetic,part_of_speech:sense.pos,example:sense.exampleEn||''}]});
      setAddedCards(prev=>({...prev,[senseIdx]:true}));
    } catch(e) {setError(e instanceof Error?e.message:'Không lưu được bộ thẻ.');}
    finally {setLoading(false);}
  };

  const isVi = result?.sourceLang === 'vi';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] z-10 p-6 md:p-7 space-y-4">
        {/* 1. Header Bar matching Image 2 */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <div className="text-slate-800 dark:text-slate-200">
              <Languages className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h2 className="text-base md:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Tra từ
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Search Input & Controls matching Image 2 */}
        {error && <p role="alert" className="text-rose-600">{error}</p>}
        <form onSubmit={handleFormSubmit} className="space-y-3">
          <div className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value.trim()) {
                  setResult(null);
                }
              }}
              placeholder="Nhập một từ để tra cứu..."
              className="w-full pl-4 pr-14 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-2xs"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              title="Tìm kiếm"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white flex items-center justify-center transition shadow-xs"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Search className="w-4 h-4 stroke-[2.5]" />
              )}
            </button>
          </div>

          {/* Language Selection Dropdowns matching Image 2 */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <div className="relative">
              <select
                disabled
                value={sourceLang}
                onChange={(e) => {
                  setSourceLang(e.target.value);
                  if (query.trim()) setTimeout(() => handleSearch(), 50);
                }}
                className="appearance-none pl-3 pr-7 py-1.5 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer focus:outline-none shadow-2xs"
              >
                <option value="auto">Auto</option>
                <option value="en">English (EN)</option>
                <option value="vi">Tiếng Việt (VI)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <span className="text-slate-400 font-bold">→</span>

            <div className="relative">
              <select
                disabled
                value={targetLang}
                onChange={(e) => {
                  setTargetLang(e.target.value);
                  if (query.trim()) setTimeout(() => handleSearch(), 50);
                }}
                className="appearance-none pl-3 pr-7 py-1.5 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer focus:outline-none shadow-2xs"
              >
                <option value="auto">Auto</option>
                <option value="vi">Tiếng Việt (VI)</option>
                <option value="en">English (EN)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </form>

        {/* 3. Main Body */}
        <div className="flex-1 overflow-y-auto space-y-5 pt-1 min-h-[260px]">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-xs font-semibold">Đang dịch và tra cứu từ điển...</p>
            </div>
          )}

          {/* Empty Initial State matching Image 2 100% */}
          {!loading && !result && (
            <div className="space-y-6 py-6">
              <div className="flex flex-col items-center justify-center text-center px-4 space-y-3">
                <div className="text-slate-400 dark:text-slate-500 my-2">
                  <Languages className="w-14 h-14 stroke-[1.4]" />
                </div>
                <p className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                  Nhập một từ để tra nghĩa, từ loại, từ đồng nghĩa và hơn thế nữa
                </p>
              </div>

              {/* Lịch sử tra cứu gần đây */}
              {history.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Lịch sử tra từ gần đây ({history.length})</span>
                    </div>
                    <button
                      onClick={clearHistory}
                      className="text-[11px] font-semibold text-slate-400 hover:text-rose-500 transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Xóa lịch sử</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {history.map((item) => (
                      <div
                        key={item.term}
                        onClick={() => {
                          setQuery(item.term);
                          handleSearch(item.term);
                        }}
                        className="group p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition truncate">
                              {item.term}
                            </span>
                            {item.pos && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                                {item.pos}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 truncate mt-0.5">
                            {item.meaning}
                          </div>
                        </div>

                        <button
                          onClick={(e) => removeHistoryItem(item.term, e)}
                          title="Xóa khỏi lịch sử"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded-md transition shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Result View matching Image 1 100% */}
          {!loading && result && (
            <div className="space-y-5">
              {/* Word Title Row */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                      {result.term}
                    </h1>
                    <button
                      onClick={() => playAudio(result.term, isVi ? 'vi-VN' : 'en-US')}
                      title="Nghe phát âm chuẩn"
                      className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition"
                    >
                      <Volume2 className="w-5 h-5 stroke-[2.2]" />
                    </button>
                  </div>

                  {result.phonetic && (
                    <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {result.phonetic}
                    </div>
                  )}
                </div>

                {/* Right Badges: (!) and [EN -> VI] */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    title="Báo cáo nghĩa chưa chuẩn"
                    className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/60 dark:border-amber-900/60 dark:text-amber-400 flex items-center justify-center font-black text-xs hover:scale-105 transition"
                  >
                    !
                  </button>

                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs shadow-2xs">
                    <span>{isVi ? '🇻🇳 VI' : '🇬🇧 EN'}</span>
                    <span className="text-slate-400">→</span>
                    <span>{isVi ? '🇬🇧 EN' : '🇻🇳 VI'}</span>
                  </div>
                </div>
              </div>

              {/* Senses List */}
              <div className="space-y-4 pt-1">
                {result.senses.map((sense, idx) => (
                  <div key={idx} className="space-y-3">
                    {/* Sense Heading with + Thêm vào thẻ Button */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs">
                          {sense.pos}
                        </span>
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          {sense.meaning}
                        </span>
                      </div>

                      {/* + Thêm vào thẻ Button matching Image 1 */}
                      <button
                        onClick={() => handleAddCard(idx)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs shrink-0 ${
                          addedCards[idx]
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900'
                        }`}
                      >
                        {addedCards[idx] ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã thêm</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Lưu thành bộ thẻ</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Example Sentence Box matching Image 1 */}
                    {sense.exampleEn && (
                      <div className="ml-8 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-dotted border-slate-400">
                            {sense.exampleEn}
                          </span>
                          <button
                            onClick={() => playAudio(sense.exampleEn || '', 'en-US')}
                            title="Nghe câu ví dụ"
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {sense.exampleVi && (
                          <div className="text-xs text-slate-500 italic">
                            {sense.exampleVi}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Synonyms row matching Image 1 */}
                    {sense.synonyms && sense.synonyms.length > 0 && (
                      <div className="ml-8 flex items-center gap-2 flex-wrap pt-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          TỪ ĐỒNG NGHĨA:
                        </span>
                        {sense.synonyms.map((syn) => (
                          <button
                            key={syn}
                            onClick={() => {
                              setQuery(syn);
                              handleSearch(syn);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-slate-400 transition shadow-2xs"
                          >
                            {syn}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Divider & Related words section matching Image 1 */}
              {result.relatedWords && result.relatedWords.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    TỪ GHÉP / LIÊN QUAN
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {result.relatedWords.map((rw) => (
                      <button
                        key={rw}
                        onClick={() => {
                          setQuery(rw);
                          handleSearch(rw);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                      >
                        {rw}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
