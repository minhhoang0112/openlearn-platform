import React, { useEffect, useState } from 'react';
import { speechRecognitionAvailable } from '../utils/audio';
import { X, RotateCcw, Sparkles } from 'lucide-react';

export interface StudyPreferences {
  direction: 'term_to_definition' | 'definition_to_term' | 'both';
  answer_mode: 'meaning' | 'synonyms' | 'speech';
  starred_only: boolean;
  unmastered_only: boolean;
  shuffle: boolean;
  adaptive: boolean;
  required_correct?: number;
  max_attempts?: number;
  auto_audio: boolean;
  audio_rate: number;
  voice_uri: string;
  dictation_content: 'word' | 'example';
  question_types: ('write' | 'quiz')[];
  accept_synonyms: boolean;
  auto_advance_on_correct: boolean;
}

export const defaultStudyPreferences: StudyPreferences = {
  direction: 'term_to_definition',
  answer_mode: 'meaning',
  starred_only: false,
  unmastered_only: false,
  shuffle: false,
  adaptive: true,
  required_correct: 2,
  max_attempts: 3,
  auto_audio: false,
  audio_rate: 0.9,
  voice_uri: '',
  dictation_content: 'word',
  question_types: ['write'],
  accept_synonyms: false,
  auto_advance_on_correct: false,
};

export function StudyPreferencesDialog({
  value,
  dictation,
  counts,
  onSave,
  onClose,
  onReset,
  busy,
}: {
  value: StudyPreferences;
  dictation: boolean;
  counts?: { total: number; starred: number; unmastered: number };
  onSave: (value: StudyPreferences) => void;
  onClose: () => void;
  onReset: () => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const update = () =>
      setVoices(window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en')));
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);

  const patch = (next: Partial<StudyPreferences>) =>
    setDraft((current) => ({ ...current, ...next }));

  const hasStarred = (counts?.starred ?? 0) > 0;
  const unmasteredCount = counts?.unmastered ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center animate-fadeIn"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Cài đặt học tập"
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6 shadow-2xl text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching source-study-settings.png */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Cài đặt học tập
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tùy chỉnh cách bạn muốn học và kiểm tra
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
            aria-label="Đóng cài đặt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!dictation && (
          <>
            {/* Chế độ trả lời */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-900 dark:text-white block">
                Chế độ trả lời
              </label>
              <div className="space-y-2">
                {[
                  { value: 'term_to_definition', label: 'Hỏi tiếng Anh, trả lời tiếng Việt' },
                  { value: 'definition_to_term', label: 'Hỏi tiếng Việt, trả lời tiếng Anh' },
                  { value: 'both', label: 'Luyện cả hai chiều (Cần 2 lần đúng mỗi chiều)' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-xs font-semibold cursor-pointer transition ${
                      draft.direction === opt.value
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="study_direction"
                      value={opt.value}
                      checked={draft.direction === opt.value}
                      onChange={() => patch({ direction: opt.value as StudyPreferences['direction'] })}
                      className="text-indigo-600 w-4 h-4"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Trả lời bằng */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-900 dark:text-white block">
                Trả lời bằng
              </label>
              <select
                aria-label="Kiểu câu trả lời"
                value={draft.answer_mode}
                onChange={(e) => patch({ answer_mode: e.target.value as StudyPreferences['answer_mode'] })}
                className="block w-full border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs font-medium bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="meaning">Nhập nghĩa / từ</option>
                <option value="synonyms">Trả lời bằng từ đồng nghĩa</option>
                <option value="speech" disabled={!speechRecognitionAvailable()}>
                  Trả lời bằng cách phát âm (giọng nói)
                </option>
              </select>
            </div>

            {/* Loại câu hỏi */}
            <fieldset className="space-y-2">
              <legend className="text-xs font-black text-slate-900 dark:text-white mb-1">
                Loại câu hỏi
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { type: 'write', label: 'Điền từ (Fill in the blank)' },
                  { type: 'quiz', label: 'Trắc nghiệm 4 đáp án' },
                ].map(({ type, label }) => (
                  <label
                    key={type}
                    className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <input
                      type="checkbox"
                      checked={draft.question_types.includes(type as 'write' | 'quiz')}
                      disabled={draft.answer_mode === 'speech' && type === 'quiz'}
                      onChange={(e) =>
                        patch({
                          question_types: e.target.checked
                            ? [...draft.question_types, type as 'write' | 'quiz']
                            : draft.question_types.filter((item) => item !== type),
                        })
                      }
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              {!draft.question_types.length && (
                <p role="alert" className="text-xs text-rose-600 font-bold">
                  * Phải chọn ít nhất một loại câu hỏi
                </p>
              )}
            </fieldset>

            {/* Tuỳ chọn trả lời */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-900 dark:text-white block">
                Tuỳ chọn trả lời
              </label>
              <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <input
                  type="checkbox"
                  checked={draft.accept_synonyms}
                  onChange={(e) => patch({ accept_synonyms: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Chấp nhận từ đồng nghĩa làm đáp án
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Khi bật, bạn có thể trả lời bằng bất kỳ từ đồng nghĩa nào đã lưu
                  </span>
                </div>
              </label>
            </div>
          </>
        )}

        {dictation && (
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-900 dark:text-white block">
              Nội dung nghe chép
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`p-3 rounded-2xl border text-xs font-bold text-center cursor-pointer transition ${
                  draft.dictation_content === 'word'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="dictation_type"
                  checked={draft.dictation_content === 'word'}
                  onChange={() => patch({ dictation_content: 'word' })}
                  className="sr-only"
                />
                <span>Nghe và viết từ</span>
              </label>
              <label
                className={`p-3 rounded-2xl border text-xs font-bold text-center cursor-pointer transition ${
                  draft.dictation_content === 'example'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="dictation_type"
                  checked={draft.dictation_content === 'example'}
                  onChange={() => patch({ dictation_content: 'example' })}
                  className="sr-only"
                />
                <span>Nghe chép ví dụ</span>
              </label>
            </div>
          </div>
        )}

        {/* Lọc từ vựng matching source-study-settings.png */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-900 dark:text-white block">
            Lọc từ vựng
          </label>
          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={draft.starred_only}
                  onChange={(e) => patch({ starred_only: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Chỉ học từ đánh dấu sao
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                {hasStarred ? `(${counts?.starred} từ)` : '* Chưa có từ nào có sao'}
              </span>
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={draft.unmastered_only}
                  onChange={(e) => patch({ unmastered_only: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Chỉ học từ chưa thuộc
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                ({unmasteredCount} từ)
              </span>
            </label>
          </div>
        </div>

        {/* Thứ tự học */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-900 dark:text-white block">
            Thứ tự học
          </label>
          <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <input
              type="checkbox"
              checked={!draft.shuffle}
              onChange={(e) => patch({ shuffle: !e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span>Học theo thứ tự (không xáo trộn)</span>
          </label>
        </div>

        {/* Tuỳ chọn hành vi */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-900 dark:text-white block">
            Tuỳ chọn hành vi
          </label>
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={draft.auto_advance_on_correct}
                onChange={(e) => patch({ auto_advance_on_correct: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded mt-0.5"
              />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Tự động tiếp tục khi trả lời đúng
                </span>
                <span className="text-[11px] text-slate-400">
                  Khi bật, tự động chuyển sang câu tiếp theo sau 1.2 giây
                </span>
              </div>
            </label>

            {!dictation && (
              <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <input
                  type="checkbox"
                  checked={draft.adaptive}
                  onChange={(e) => patch({ adaptive: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Ôn lại thích nghi (Cần 2 lần đúng liên tiếp để ghi nhớ)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Câu sai được xếp vào cuối hàng đợi ôn lại (tối đa 3 lượt)
                  </span>
                </div>
              </label>
            )}

            <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={draft.auto_audio}
                onChange={(e) => patch({ auto_audio: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span>Tự động phát âm thanh khi mở câu hỏi</span>
            </label>
          </div>
        </div>

        {/* Audio settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Tốc độ đọc: {draft.audio_rate}×
            </span>
            <input
              aria-label="Tốc độ đọc"
              className="w-full accent-indigo-600"
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={draft.audio_rate}
              onChange={(e) => patch({ audio_rate: Number(e.target.value) })}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Giọng đọc</span>
            <select
              aria-label="Giọng đọc"
              value={draft.voice_uri}
              onChange={(e) => patch({ voice_uri: e.target.value })}
              className="block w-full border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs bg-transparent"
            >
              <option value="">Tiếng Anh mặc định</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Buttons matching source-study-settings.png */}
        <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={busy || !draft.question_types.length}
            onClick={() =>
              onSave({
                ...draft,
                required_correct: 2,
                max_attempts: 3,
                ...(draft.answer_mode === 'speech'
                  ? { question_types: ['write'] as ('write' | 'quiz')[] }
                  : {}),
              })
            }
            className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition shadow-sm disabled:opacity-50"
          >
            {busy ? 'Đang lưu...' : 'Áp dụng'}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onReset}
            className="w-full py-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-50 dark:hover:bg-rose-950/30 transition flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset tiến độ học</span>
          </button>
        </div>
      </section>
    </div>
  );
}
