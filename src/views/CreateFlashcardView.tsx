import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { api, ApiWord } from '../api/client';
import {
  ArrowLeft,
  PlusCircle,
  Trash2,
  Upload,
  Save,
  Sparkles,
  BookOpen,
  FileText,
  Loader2
} from 'lucide-react';

interface WordDraft {
  term: string;
  definition: string;
  phonetic: string;
  part_of_speech: string;
  example: string;
}

export const CreateFlashcardView: React.FC = () => {
  const { navigate, goBack } = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('TOEIC');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  const [words, setWords] = useState<WordDraft[]>([
    { term: '', definition: '', phonetic: '', part_of_speech: 'noun', example: '' },
    { term: '', definition: '', phonetic: '', part_of_speech: 'verb', example: '' },
    { term: '', definition: '', phonetic: '', part_of_speech: 'noun', example: '' },
  ]);

  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAddWord = () => {
    setWords((prev) => [
      ...prev,
      { term: '', definition: '', phonetic: '', part_of_speech: 'noun', example: '' }
    ]);
  };

  const handleRemoveWord = (idx: number) => {
    if (words.length <= 1) return;
    setWords((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleWordChange = (idx: number, field: keyof WordDraft, val: string) => {
    setWords((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleParseImport = () => {
    if (!importText.trim()) return;

    const lines = importText.split('\n').filter((l) => l.trim().length > 0);
    const parsed: WordDraft[] = [];

    for (const line of lines) {
      let term = '';
      let definition = '';

      if (line.includes('\t')) {
        const parts = line.split('\t');
        term = parts[0]?.trim() || '';
        definition = parts.slice(1).join(' - ').trim();
      } else if (line.includes(' - ')) {
        const parts = line.split(' - ');
        term = parts[0]?.trim() || '';
        definition = parts.slice(1).join(' - ').trim();
      } else if (line.includes(':')) {
        const parts = line.split(':');
        term = parts[0]?.trim() || '';
        definition = parts.slice(1).join(':').trim();
      } else {
        term = line.trim();
        definition = '';
      }

      if (term) {
        parsed.push({
          term,
          definition,
          phonetic: '',
          part_of_speech: 'noun',
          example: ''
        });
      }
    }

    if (parsed.length > 0) {
      setWords(parsed);
      setShowImport(false);
      setImportText('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Vui lòng nhập tiêu đề bộ thẻ.');
      return;
    }

    const validWords = words.filter((w) => w.term.trim().length > 0);
    if (validWords.length === 0) {
      alert('Vui lòng nhập ít nhất 1 từ vựng.');
      return;
    }

    setSaving(true);
    try {
      const newSet = await api.createSet({
        title: title.trim(),
        description: description.trim(),
        learning_language: 'en',
        native_language: 'vi',
        visibility,
        tag: tag.trim() || 'Chung',
        words: validWords
      });

      navigate(`/study-set/${newSet.id}`);
    } catch (err: any) {
      alert(err?.message || 'Không thể tạo bộ thẻ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => goBack()}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Tạo bộ thẻ từ vựng mới
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tự soạn hoặc dán danh sách từ vựng để học và ôn thi
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowImport(!showImport)}
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 transition"
        >
          <Upload className="w-4 h-4 text-indigo-500" />
          <span>{showImport ? 'Đóng nhập nhanh' : 'Nhập nhanh từ danh sách'}</span>
        </button>
      </div>

      {/* Quick Import Box */}
      {showImport && (
        <div className="p-6 rounded-3xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Dán danh sách từ (Định dạng: Từ vựng - Định nghĩa)
            </span>
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={5}
            placeholder={`candidate - ứng viên, thí sinh\nhire - thuê, tuyển dụng nhân viên\ninterview - phỏng vấn, buổi phỏng vấn`}
            className="w-full p-4 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleParseImport}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              Phân tích và nhập vào bảng
            </button>
          </div>
        </div>
      )}

      {/* Main Set Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Card */}
        <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Tiêu đề bộ thẻ *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Từ vựng TOEIC Chủ đề Marketing & Sales"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Chủ đề / Nhãn
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="TOEIC, IELTS, Giao tiếp..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Mô tả ngắn
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Giới thiệu mục tiêu và nội dung chính của bộ thẻ..."
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Word Rows Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Danh sách từ vựng ({words.length} từ)
            </h3>
            <button
              type="button"
              onClick={handleAddWord}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Thêm dòng từ</span>
            </button>
          </div>

          <div className="space-y-3">
            {words.map((w, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400">Từ số #{idx + 1}</span>
                  {words.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveWord(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                      title="Xóa dòng này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Thuật ngữ (Term) *</label>
                    <input
                      type="text"
                      required
                      value={w.term}
                      onChange={(e) => handleWordChange(idx, 'term', e.target.value)}
                      placeholder="e.g. apprentice"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Định nghĩa (Definition) *</label>
                    <input
                      type="text"
                      required
                      value={w.definition}
                      onChange={(e) => handleWordChange(idx, 'definition', e.target.value)}
                      placeholder="e.g. người học việc"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Phiên âm IPA</label>
                    <input
                      type="text"
                      value={w.phonetic}
                      onChange={(e) => handleWordChange(idx, 'phonetic', e.target.value)}
                      placeholder="e.g. /əˈprentɪs/"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Từ loại</label>
                    <select
                      value={w.part_of_speech}
                      onChange={(e) => handleWordChange(idx, 'part_of_speech', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="noun">Danh từ (Noun)</option>
                      <option value="verb">Động từ (Verb)</option>
                      <option value="adj">Tính từ (Adjective)</option>
                      <option value="adv">Trạng từ (Adverb)</option>
                      <option value="phrase">Cụm từ (Phrase)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Câu ví dụ ngữ cảnh</label>
                  <input
                    type="text"
                    value={w.example}
                    onChange={(e) => handleWordChange(idx, 'example', e.target.value)}
                    placeholder="e.g. The apprentice learned carpentry from his master."
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddWord}
            className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50/20 text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 transition"
          >
            <PlusCircle className="w-4 h-4 text-indigo-500" />
            <span>Thêm từ vựng mới (+ Thẻ)</span>
          </button>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-sm font-bold shadow-md flex items-center gap-2 transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Lưu bộ từ và bắt đầu học</span>
          </button>
        </div>
      </form>
    </div>
  );
};

