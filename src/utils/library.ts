import { VocabSet, WordItem } from '../types';
import { Course } from '../data/catalog';

export const LIBRARY_KEY = 'openquiz.library.v1';
export function readLibrary(): VocabSet[] {
  try {
    const data = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
    return Array.isArray(data) ? data.filter(s => typeof s?.id === 'string' && typeof s?.title === 'string' && Array.isArray(s.words) && s.words.length && s.words.every(w => typeof w?.id === 'string' && typeof w?.term === 'string' && typeof w?.definition === 'string')) : [];
  } catch { return []; }
}
export function saveSet(set: VocabSet) {
  const sets = readLibrary();
  localStorage.setItem(LIBRARY_KEY, JSON.stringify([...sets.filter(s => s.id !== set.id), set]));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('openquiz-library-updated'));
}
export function parseImport(text: string, fileName: string, course?: Course): VocabSet {
  let title = course?.title || fileName.replace(/\.[^.]+$/, '');
  let rows: unknown[];
  let importedLanguage = 'en';
  if (fileName.toLowerCase().endsWith('.json')) {
    const data = JSON.parse(text);
    rows = Array.isArray(data) ? data : data.words;
    if (!course && typeof data.title === 'string') title = data.title;
    if (['en', 'zh', 'ko', 'ja'].includes(data.language)) importedLanguage = data.language;
  } else {
    const delimiter = fileName.toLowerCase().endsWith('.tsv') ? '\t' : ',';
    const records: string[][] = [];
    let row: string[] = [], value = '', quoted = false;
    const input = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      if (char === '"') {
        if (quoted && input[i + 1] === '"') { value += '"'; i++; }
        else quoted = !quoted;
      } else if (!quoted && (char === delimiter || char === '\n')) {
        row.push(value.replace(/\r$/, '')); value = '';
        if (char === '\n') { records.push(row); row = []; }
      } else value += char;
    }
    if (quoted) throw new Error('CSV: dấu ngoặc kép chưa đóng / Unclosed quote.');
    if (value || row.length) { row.push(value.replace(/\r$/, '')); records.push(row); }
    if (['term', 'word', 'từ', 'từ vựng'].includes(records[0]?.[0]?.trim().toLowerCase())) records.shift();
    rows = records.filter(r => r.some(c => c.trim())).map(([term, definition, phonetic, example]) => ({ term, definition, phonetic, example }));
  }
  if (!Array.isArray(rows) || !rows.length) throw new Error('Tệp chưa có từ vựng / No vocabulary found.');
  if (rows.length > 20000) throw new Error('Tối đa 20.000 từ mỗi tệp / Maximum 20,000 words.');
  const language = course?.language || importedLanguage;
  const locale = { en: 'en-US', zh: 'zh-CN', ko: 'ko-KR', ja: 'ja-JP' }[language];
  const id = course?.id || `import-${crypto.randomUUID()}`;
  const words: WordItem[] = rows.map((value, i) => {
    const r = value as Record<string, unknown>;
    if (typeof r?.term !== 'string' || !r.term.trim() || typeof r?.definition !== 'string' || !r.definition.trim()) throw new Error(`Dòng ${i + 1}: cần term và definition / Both fields are required.`);
    return { id: `${id}-${i}`, term: r.term.trim(), definition: r.definition.trim(), phonetic: typeof r.phonetic === 'string' ? r.phonetic : undefined, example: typeof r.example === 'string' ? r.example : undefined, status: 'new', language: locale };
  });
  return { id, title, words, language, description: 'Imported vocabulary', category: 'Imported', level: course?.level };
}
