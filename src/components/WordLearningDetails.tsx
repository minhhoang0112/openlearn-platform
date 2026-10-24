import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Languages,
  Loader2,
  Volume2,
  Sparkles,
  Edit3,
  ExternalLink,
  X,
  MoreHorizontal,
} from 'lucide-react';
import { api, ApiError, ApiWord, DictionaryEntryItem } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { playAudio } from '../utils/audio';

// Keyed by userId:wordId:mode ('local' | 'ai') so allow_ai=false and allow_ai=true never collide.
const pending = new Map<string, Promise<ApiWord>>();
const localChecked = new Set<string>();

function ensureDetails(wordId: number, userId: number, allowAi: boolean): Promise<ApiWord> {
  const modeKey = allowAi ? 'ai' : 'local';
  const key = `${userId}:${wordId}:${modeKey}`;
  let request = pending.get(key);
  if (!request) {
    request = api.getWordLearningDetails(wordId, allowAi);
    pending.set(key, request);
    void request.then(
      () => pending.delete(key),
      () => pending.delete(key),
    );
  }
  return request;
}

interface SynonymLookupCacheEntry {
  matched: DictionaryEntryItem | null;
}

const synonymLookupCache = new Map<string, SynonymLookupCacheEntry>();
let cachedSynonymUserId: number | string | null = null;

function ensureUserScopedSynonymCache(userId: number | string | undefined) {
  const normalizedUser = userId ?? 'anon';
  if (cachedSynonymUserId !== normalizedUser) {
    synonymLookupCache.clear();
    cachedSynonymUserId = normalizedUser;
  }
}

function getExampleSourceDetail(source?: string): string | null {
  switch (source) {
    case 'prepared':
      return 'Ví dụ chuẩn bị sẵn';
    case 'library':
      return 'Ví dụ có sẵn trong bộ từ';
    case 'manual':
      return 'Ví dụ do bạn tự lưu';
    case 'ai':
      return 'Ví dụ AI đã lưu';
    default:
      return null;
  }
}

/**
 * Splits synonym strings by commas, semicolons, or newlines while keeping multi-word phrases
 * (such as "job seeker") intact. Deduplicates case-insensitively.
 */
export function parseSynonymItems(raw?: string): string[] {
  if (!raw || !raw.trim()) return [];
  const parts = raw
    .split(/[;,\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of parts) {
    const lower = item.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      unique.push(item);
    }
  }
  return unique.slice(0, 8);
}

export function WordLearningDetails({
  word,
  onChange,
  auto = false,
  showSynonyms = true,
  allowInlineEdit = true,
  variant = 'flashcard',
}: {
  word: ApiWord;
  onChange?: (word: ApiWord) => void;
  auto?: boolean;
  showSynonyms?: boolean;
  allowInlineEdit?: boolean;
  variant?: 'list' | 'flashcard' | 'feedback';
}) {
  const { user, capabilities } = useAuth();
  const { navigate, path } = useRouter();
  const [local, setLocal] = useState<ApiWord>(word);
  const [translated, setTranslated] = useState(false);
  const [missingTranslationPrompt, setMissingTranslationPrompt] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Inline manual editor for missing example / translation
  const [editingManual, setEditingManual] = useState(false);
  const [manualExample, setManualExample] = useState(word.example || '');
  const [manualTranslation, setManualTranslation] = useState(word.example_translation || '');
  const [savingManual, setSavingManual] = useState(false);

  // Interactive Synonym Popover state (Rendered via Portal so layout never shifts)
  const [activeSynonym, setActiveSynonym] = useState<string | null>(null);
  const [synonymLoading, setSynonymLoading] = useState(false);
  const [synonymError, setSynonymError] = useState('');
  const [synonymMatch, setSynonymMatch] = useState<DictionaryEntryItem | null>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 300,
  });

  const popoverRef = useRef<HTMLDivElement>(null);
  const activeSynButtonRef = useRef<HTMLButtonElement | null>(null);
  const lookupReqIdRef = useRef(0);

  useEffect(() => {
    ensureUserScopedSynonymCache(user?.id);
  }, [user?.id]);

  useEffect(() => {
    setLocal(word);
    setManualExample(word.example || '');
    setManualTranslation(word.example_translation || '');
  }, [word]);

  useEffect(() => {
    setTranslated(false);
    setMissingTranslationPrompt(false);
    setActionsMenuOpen(false);
    setError('');
    setEditingManual(false);
    setActiveSynonym(null);
    setSynonymError('');
    setSynonymMatch(null);
  }, [word.id]);

  // Background check ONLY with allow_ai: false (0 AI calls on mount/flip/tab change)
  useEffect(() => {
    if (!auto || !user) return;
    if (word.example?.trim() && word.example_translation?.trim()) return;
    const checkKey = `${user.id}:${word.id}`;
    if (localChecked.has(checkKey)) return;
    localChecked.add(checkKey);
    let active = true;
    ensureDetails(word.id, user.id, false)
      .then((updated) => {
        if (!active) return;
        setLocal(updated);
        if (
          updated.example !== word.example ||
          updated.example_translation !== word.example_translation ||
          updated.synonyms !== word.synonyms ||
          updated.example_source !== word.example_source
        ) {
          onChange?.(updated);
        }
      })
      .catch(() => {
        // Non-AI check failure is silent so we don't disrupt display
      });
    return () => {
      active = false;
    };
  }, [auto, user?.id, word.id]);

  const updatePopoverPosition = useCallback((btn: HTMLElement | null) => {
    if (!btn || typeof window === 'undefined') return;
    const rect = btn.getBoundingClientRect();
    const desiredWidth = Math.min(320, Math.max(240, window.innerWidth - 24));
    const centeredLeft = rect.left + rect.width / 2 - desiredWidth / 2;
    const clampedLeft = Math.max(12, Math.min(centeredLeft, window.innerWidth - desiredWidth - 12));
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < 180 && rect.top > 190 ? Math.max(12, rect.top - 165) : rect.bottom + 8;
    setPopoverCoords({
      top,
      left: clampedLeft,
      width: desiredWidth,
    });
  }, []);

  // Close synonym popover on Escape, outside click, or reposition on scroll/resize
  useEffect(() => {
    if (!activeSynonym) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setActiveSynonym(null);
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        (!activeSynButtonRef.current || !activeSynButtonRef.current.contains(target))
      ) {
        setActiveSynonym(null);
      }
    };
    const handleReposition = () => {
      if (activeSynButtonRef.current) {
        updatePopoverPosition(activeSynButtonRef.current);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [activeSynonym, updatePopoverPosition]);

  const requestAiDetails = async (showTranslationAfter = false) => {
    if (!user) return;
    if (!capabilities?.ai.configured) {
      navigate('/settings/ai?returnTo=' + encodeURIComponent(path));
      return;
    }
    setBusy(true);
    setError('');
    setActionsMenuOpen(false);
    try {
      const updated = await ensureDetails(word.id, user.id, true);
      setLocal(updated);
      onChange?.(updated);
      if (showTranslationAfter && updated.example_translation?.trim()) {
        setTranslated(true);
        setMissingTranslationPrompt(false);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError(
          'AI đang tạm giới hạn số lượt gọi (429). Bạn có thể tự nhập ví dụ hoặc thử lại sau ít phút.',
        );
      } else {
        setError((e as Error).message || 'Không thể bổ sung ví dụ bằng AI lúc này.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSaveManual = async () => {
    if (!manualExample.trim()) return;
    setSavingManual(true);
    setError('');
    try {
      const saved = await api.request<ApiWord>('PUT', `/words/${word.id}/notes`, {
        example: manualExample.trim(),
        translation: manualTranslation.trim(),
        synonyms: local.synonyms || '',
      });
      setLocal(saved);
      onChange?.(saved);
      setEditingManual(false);
      setMissingTranslationPrompt(false);
      setActionsMenuOpen(false);
      if (saved.example_translation?.trim()) {
        setTranslated(true);
      }
    } catch (e) {
      setError((e as Error).message || 'Không thể lưu câu ví dụ.');
    } finally {
      setSavingManual(false);
    }
  };

  const toggleTranslation = () => {
    if (translated) {
      setTranslated(false);
      return;
    }
    if (local.example_translation?.trim()) {
      setTranslated(true);
      setMissingTranslationPrompt(false);
    } else {
      // Do NOT call AI implicitly when clicking translate!
      setMissingTranslationPrompt((prev) => !prev);
    }
  };

  const lookupSynonym = async (synTerm: string, buttonEl: HTMLButtonElement) => {
    const normalized = synTerm.trim().toLowerCase();
    if (!normalized) return;

    ensureUserScopedSynonymCache(user?.id);
    activeSynButtonRef.current = buttonEl;
    updatePopoverPosition(buttonEl);

    setActiveSynonym(synTerm);
    setSynonymError('');

    const posNormalized = (word.part_of_speech || '').trim().toLowerCase();
    const cacheKey = `${user?.id ?? 'anon'}:${normalized}:en:${posNormalized}`;
    const cached = synonymLookupCache.get(cacheKey);
    if (cached !== undefined) {
      setSynonymMatch(cached.matched);
      setSynonymLoading(false);
      return;
    }

    const reqId = ++lookupReqIdRef.current;
    setSynonymLoading(true);
    setSynonymMatch(null);
    try {
      const res = await api.getDictionaryEntry(synTerm);
      if (reqId !== lookupReqIdRef.current) return;

      const entries = Array.isArray(res.entries) ? res.entries : [];
      const nonSelfEntries = entries.filter((item) => item.word_id !== word.id);
      const pool = nonSelfEntries.length > 0 ? nonSelfEntries : entries;

      const posMatch = posNormalized
        ? pool.find((item) => (item.part_of_speech || '').trim().toLowerCase() === posNormalized)
        : undefined;
      const chosen = posMatch || pool[0] || null;

      synonymLookupCache.set(cacheKey, { matched: chosen });
      setSynonymMatch(chosen);
    } catch (e) {
      if (reqId !== lookupReqIdRef.current) return;
      setSynonymError((e as Error).message || 'Không thể tra cứu từ đồng nghĩa lúc này.');
    } finally {
      if (reqId === lookupReqIdRef.current) {
        setSynonymLoading(false);
      }
    }
  };

  const openGlobalDictionary = (query: string) => {
    window.dispatchEvent(new CustomEvent('openquiz:open-dictionary', { detail: { query } }));
    setActiveSynonym(null);
  };

  const synonymList = showSynonyms ? parseSynonymItems(local.synonyms) : [];
  const sourceDetail = getExampleSourceDetail(local.example_source);
  const isCentered = variant === 'flashcard';
  const alignClass = isCentered ? 'justify-center text-center' : 'justify-start text-left';

  return (
    <div
      className={`space-y-2 text-sm leading-relaxed relative ${isCentered ? 'text-center' : 'text-left'}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
      }}
    >
      {/* Interactive Synonyms */}
      {synonymList.length > 0 && (
        <div className={`flex items-center gap-1.5 flex-wrap ${alignClass}`}>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Đồng nghĩa:
          </span>
          {synonymList.map((syn) => {
            const isSelected = activeSynonym === syn;
            return (
              <button
                key={syn}
                type="button"
                data-testid={`synonym-chip-${syn}`}
                onClick={(e) => {
                  e.stopPropagation();
                  // Speak ONLY the clicked synonym item immediately inside user gesture
                  playAudio(syn, 'en-US');
                  if (isSelected) {
                    setActiveSynonym(null);
                  } else {
                    void lookupSynonym(syn, e.currentTarget);
                  }
                }}
                aria-expanded={isSelected}
                aria-label={`Từ đồng nghĩa ${syn}`}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border transition cursor-pointer inline-flex items-center gap-1 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                }`}
              >
                <span>{syn}</span>
                <Volume2 className="w-3 h-3 opacity-60" />
              </button>
            );
          })}
        </div>
      )}

      {/* Anchored Synonym Popover via Portal (Never shifts card or example sentence layout) */}
      {activeSynonym &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            role="region"
            data-testid="synonym-popover"
            aria-label={`Chi tiết từ đồng nghĩa ${activeSynonym}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${popoverCoords.top}px`,
              left: `${popoverCoords.left}px`,
              width: `${popoverCoords.width}px`,
            }}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl text-left space-y-2 z-50"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-black text-sm text-slate-900 dark:text-white truncate">
                  {activeSynonym}
                </span>
                {synonymMatch?.part_of_speech && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500">
                    {synonymMatch.part_of_speech}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Phát âm từ đồng nghĩa ${activeSynonym}`}
                  title={`Nghe phát âm ${activeSynonym}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    playAudio(activeSynonym, 'en-US');
                  }}
                  className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                aria-label="Đóng thông tin từ đồng nghĩa"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSynonym(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {synonymLoading && (
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang tra nghĩa lưu sẵn...</span>
              </div>
            )}

            {!synonymLoading && synonymError && (
              <div role="alert" className="text-xs text-rose-600 space-y-1">
                <p>{synonymError}</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeSynButtonRef.current) {
                      void lookupSynonym(activeSynonym, activeSynButtonRef.current);
                    }
                  }}
                  className="underline font-semibold"
                >
                  Thử lại
                </button>
              </div>
            )}

            {!synonymLoading && !synonymError && synonymMatch && (
              <div className="space-y-1">
                {synonymMatch.phonetic && (
                  <div className="text-[11px] font-mono text-slate-400">{synonymMatch.phonetic}</div>
                )}
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {synonymMatch.definition}
                </p>
                {synonymMatch.example && (
                  <p className="text-[11px] italic text-slate-500 dark:text-slate-400">
                    "{synonymMatch.example}"
                  </p>
                )}
                {synonymMatch.example_translation && (
                  <p className="text-[11px] text-slate-400">
                    {synonymMatch.example_translation}
                  </p>
                )}
              </div>
            )}

            {!synonymLoading && !synonymError && !synonymMatch && (
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Chưa có nghĩa lưu sẵn trong từ điển nội bộ
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openGlobalDictionary(activeSynonym);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-[11px] font-bold inline-flex items-center gap-1 transition"
                >
                  <span>Mở Tra từ</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}

      {/* Example Sentence & Controls */}
      {local.example ? (
        <div className="space-y-1.5">
          <div className={`flex items-center gap-2 flex-wrap ${alignClass}`}>
            <p
              data-testid={`word-example-sentence-${word.id}`}
              className="italic text-slate-600 dark:text-slate-300 whitespace-pre-wrap"
            >
              {local.example}
            </p>
            <span className="inline-flex items-center gap-1 shrink-0">
              <button
                type="button"
                aria-label={'Nghe ví dụ cho ' + word.term}
                title="Nghe câu ví dụ"
                onClick={(e) => {
                  e.stopPropagation();
                  playAudio(local.example);
                }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label={'Dịch ví dụ cho ' + word.term}
                title={translated ? 'Ẩn bản dịch' : 'Xem bản dịch tiếng Việt'}
                aria-pressed={translated}
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTranslation();
                }}
                className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 inline-flex items-center gap-1 text-xs font-semibold ${
                  translated
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Languages className="w-4 h-4" />
              </button>
              {sourceDetail && (
                <span
                  title={sourceDetail}
                  className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  Ví dụ đã lưu
                </span>
              )}
              {allowInlineEdit && (
                <button
                  type="button"
                  aria-label={'Tùy chọn ví dụ cho ' + word.term}
                  title="Sửa hoặc tạo lại ví dụ"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionsMenuOpen((prev) => !prev);
                  }}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              )}
            </span>
          </div>

          {actionsMenuOpen && allowInlineEdit && (
            <div className={`flex items-center gap-2 flex-wrap text-xs pt-0.5 ${alignClass}`}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setManualExample(local.example || '');
                  setManualTranslation(local.example_translation || '');
                  setEditingManual(true);
                  setActionsMenuOpen(false);
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold inline-flex items-center gap-1 hover:border-slate-400"
              >
                <Edit3 className="w-3 h-3" />
                <span>Tự sửa ví dụ / bản dịch</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  void requestAiDetails(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold inline-flex items-center gap-1 hover:bg-indigo-100"
              >
                <Sparkles className="w-3 h-3" />
                <span>
                  {capabilities?.ai.configured ? 'Nhờ AI bổ sung' : 'Kết nối AI để bổ sung'}
                </span>
              </button>
            </div>
          )}

          {translated && local.example_translation && (
            <p
              role="note"
              data-testid={`word-example-translation-${word.id}`}
              className="text-slate-500 dark:text-slate-400 text-xs"
            >
              {local.example_translation}
            </p>
          )}

          {missingTranslationPrompt && !local.example_translation?.trim() && (
            <div
              className={`p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2 max-w-md ${
                isCentered ? 'mx-auto' : ''
              }`}
            >
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                Chưa có bản dịch lưu sẵn cho câu ví dụ này.
              </p>
              <div className={`flex items-center gap-2 flex-wrap ${alignClass}`}>
                {allowInlineEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setManualExample(local.example || '');
                      setManualTranslation(local.example_translation || '');
                      setEditingManual(true);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold inline-flex items-center gap-1 hover:bg-white dark:hover:bg-slate-800"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Tự nhập/sửa</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    void requestAiDetails(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>
                    {capabilities?.ai.configured ? 'Nhờ AI bổ sung' : 'Kết nối AI để bổ sung'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        !busy && (
          <div className="space-y-1.5">
            <div className={`flex items-center gap-3 flex-wrap text-xs ${alignClass}`}>
              <span className="text-slate-400">Chưa có câu ví dụ</span>
              {allowInlineEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setManualExample('');
                    setManualTranslation('');
                    setEditingManual((prev) => !prev);
                  }}
                  className="text-slate-700 dark:text-slate-300 underline font-semibold inline-flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{editingManual ? 'Đóng khung nhập' : 'Tự viết ví dụ'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void requestAiDetails(false);
                }}
                className="text-indigo-600 dark:text-indigo-400 underline font-semibold inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>
                  {capabilities?.ai.configured
                    ? 'Nhờ AI bổ sung'
                    : 'Kết nối AI để bổ sung ví dụ'}
                </span>
              </button>
            </div>
          </div>
        )
      )}

      {/* Inline Manual Editor */}
      {editingManual && allowInlineEdit && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2 text-left max-w-md ${
            isCentered ? 'mx-auto' : ''
          }`}
        >
          <textarea
            aria-label={'Ví dụ cho ' + word.term}
            value={manualExample}
            onChange={(e) => setManualExample(e.target.value)}
            placeholder="Nhập câu ví dụ tiếng Anh..."
            rows={2}
            className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          />
          <input
            aria-label={'Bản dịch cho ' + word.term}
            value={manualTranslation}
            onChange={(e) => setManualTranslation(e.target.value)}
            placeholder="Bản dịch tiếng Việt (tuỳ chọn)..."
            className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingManual(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-200/60"
            >
              Huỷ
            </button>
            <button
              type="button"
              disabled={savingManual || !manualExample.trim()}
              onClick={() => void handleSaveManual()}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-50"
            >
              {savingManual ? 'Đang lưu...' : 'Lưu ví dụ'}
            </button>
          </div>
        </div>
      )}

      {busy && (
        <p role="status" className="text-xs text-slate-400 inline-flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          Đang nhờ AI bổ sung ví dụ và bản dịch...
        </p>
      )}

      {error && (
        <div role="alert" className="text-xs text-rose-600 space-y-1">
          <p>{error}</p>
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              void requestAiDetails(translated);
            }}
            className="underline font-semibold"
          >
            Thử lại bằng AI
          </button>
        </div>
      )}
    </div>
  );
}
