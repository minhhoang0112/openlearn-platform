// Names observed on the public landing page. Lesson bodies are not public there.
export type CourseLanguage = 'en' | 'zh' | 'ko' | 'ja';
export interface Course { id: string; title: string; language: CourseLanguage; level: string }
export const languages = [
  { id: 'en', vi: 'Tiếng Anh', en: 'English', flag: '🇬🇧' },
  { id: 'zh', vi: 'Tiếng Trung', en: 'Chinese', flag: '🇨🇳' },
  { id: 'ko', vi: 'Tiếng Hàn', en: 'Korean', flag: '🇰🇷' },
  { id: 'ja', vi: 'Tiếng Nhật', en: 'Japanese', flag: '🇯🇵' },
] as const;
export const catalog: Course[] = [
  { id: 'vocabulary-in-use-advanced', title: 'Vocabulary in Use Advanced', language: 'en', level: 'Advanced' },
  { id: 'vocabulary-in-use-intermediate', title: 'Vocabulary in Use Pre-Intermediate & Intermediate', language: 'en', level: 'Intermediate' },
  { id: 'ielts-reading', title: 'Vocabulary for IELTS Reading', language: 'en', level: 'IELTS' },
  { id: 'toeic-600', title: '600 TOEIC Words', language: 'en', level: 'TOEIC' },
  { id: 'english-for-work', title: 'English for Work', language: 'en', level: 'Business' },
  ...['I', 'II', 'III', 'IV', 'V', 'VI'].map((n, i) => ({ id: `hsk-${i + 1}`, title: `HSK ${n}`, language: 'zh' as const, level: `HSK ${i + 1}` })),
  ...['I (Level 1–2)', 'II (Level 3–4)', 'II (Level 5–6)'].map((n, i) => ({ id: `topik-${i + 1}`, title: `TOPIK ${n}`, language: 'ko' as const, level: ['Beginner', 'Intermediate', 'Advanced'][i] })),
  ...[5, 4, 3, 2, 1].map(n => ({ id: `jlpt-n${n}`, title: `JLPT N${n}`, language: 'ja' as const, level: `N${n}` })),
];
