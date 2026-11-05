import { api, ApiError } from './client';

export type ToeicModule = 'grammar' | 'vocabulary' | 'listening' | 'reading' | 'pronunciation';
export type ToeicSessionModule = ToeicModule | 'checkpoint' | 'review';

export interface ToeicCatalogPhase {
  id: number;
  title: string;
  suggested_weeks?: [number, number];
  objective?: string;
  status: 'implemented' | 'planned';
  available?: boolean;
}

export interface ToeicCatalog {
  id: string;
  title: string;
  engine: string;
  content_version: string;
  phases: ToeicCatalogPhase[];
  total_units: number;
  total_checkpoints: number;
  vocabulary_items: number;
  unique_terms: number;
  modules: string[];
  core_modules: string[];
  assessment: string;
  audio: string;
  ai_required: boolean;
  description: string;
  supplemental: {
    title: string;
    href: string;
    counts_toward_completion: boolean;
  };
}

export interface ToeicProfile {
  enrolled_at: string | null;
  daily_minutes: 30 | 45 | 60 | 90 | 120;
  new_words_per_day: number;
  target_score: number | null;
}

export interface ToeicRoadmapUnit {
  id: string;
  title: string;
  phase: number;
  week: number;
  vocabulary_items?: number;
  core_modules?: string[];
  completed_modules?: string[];
  status: 'locked' | 'available' | 'in_progress' | 'completed' | 'needs_review';
  unlocked: boolean;
  active_sessions?: { id: string; module: string; revision: number }[];
  optional_modules?: string[];
  checkpoint?: boolean;
  session_id?: string | null;
  pass_ratio?: number;
}

export interface ToeicRoadmap {
  course: ToeicCatalog;
  profile: ToeicProfile;
  items: ToeicRoadmapUnit[];
  completed_units: number;
  next: (ToeicRoadmapUnit & { recommended_module?: string | null }) | null;
}

export interface ToeicToday {
  profile: ToeicProfile;
  next: (ToeicRoadmapUnit & { recommended_module: string | null }) | null;
  due_words: number;
  completed_units: number;
  total_units: number;
  suggested_minutes: { review: number; next_unit: number; listening: number };
  calendar_deadline: null;
}

export interface ToeicUnitWord {
  id: number;
  term: string;
  definition: string;
  part_of_speech: string;
  phonetic: string | null;
}

export interface ToeicUnitDetail {
  id: string;
  title: string;
  phase: number;
  week: number;
  rule: string;
  vocabulary: ToeicUnitWord[];
  phrases: { english: string; vietnamese: string }[];
  dialogue: { week: number; turns: ['A' | 'B', string, string][] } | null;
  pronunciation?: { week: number; topic: string; tip: string; pairs: [string, string, string][] };
  core_modules: string[];
  optional_modules: string[];
  preview: boolean;
}

export interface ToeicTaskOption {
  id: string;
  text: string;
}

export interface ToeicTaskToken {
  id: string;
  text: string;
}

export interface ToeicTask {
  id: string;
  type: 'choice' | 'listen_choice' | 'dictation' | 'vocabulary_write' | 'arrange';
  prompt: string;
  passage?: string;
  english?: string;
  word_id?: number;
  options?: ToeicTaskOption[];
  tokens?: ToeicTaskToken[];
  can_listen: boolean;
  assisted: boolean;
}

export interface ToeicSessionFeedback {
  correct: boolean;
  verdict: string;
  assisted: boolean;
  expected: string;
  explanation: string;
  requires_retry: boolean;
}

export interface ToeicSessionView {
  id: string;
  engine: 'toeic_foundation_v1';
  unit_id: string;
  module: ToeicSessionModule;
  content_version: string;
  revision: number;
  status: 'active' | 'passed' | 'needs_review';
  current: ToeicTask | null;
  feedback: ToeicSessionFeedback | null;
  index: number;
  total: number;
  base_total: number;
  completed_questions: number;
  first_correct: number;
  first_attempt_ratio: number;
  attempts: number;
  completed_at: string | null;
  pass_ratio: number | null;
  mastery_label: 'module_completed_not_long_term_retention';
  help?: {
    answer: string;
    explanation: string;
    requires_unassisted_retry: boolean;
  };
}

export interface ToeicVocabularyItem {
  id: number;
  term: string;
  definition: string;
  part_of_speech: string;
  phonetic: string | null;
  unit_id: string;
  phase: number;
  week: number;
  progress: {
    status: 'new' | 'learning' | 'mastered';
    due_at: string | null;
    repetitions: number;
  };
}

export interface ToeicVocabularyResponse {
  items: ToeicVocabularyItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface ToeicMistakeItem {
  task_id: string;
  type: string;
  prompt: string;
  word_id: number | null;
  unit_id: string;
  module: string;
  session_id: string;
  resolved: boolean;
}

export interface ToeicMistakesResponse {
  items: ToeicMistakeItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface ToeicListenResponse {
  text: string;
  lang: string;
  audio_source: string;
  assessment: string;
}

export const posLabelMap: Record<string, string> = {
  noun: 'Danh từ (n)',
  verb: 'Động từ (v)',
  adjective: 'Tính từ (adj)',
  adverb: 'Trạng từ (adv)',
  pronoun: 'Đại từ (pron)',
  preposition: 'Giới từ (prep)',
  conjunction: 'Liên từ (conj)',
  determiner: 'Từ hạn định (det)',
  'possessive determiner': 'Tính từ sở hữu',
  'modal verb': 'Động từ khuyết thiếu',
  numeral: 'Số từ',
  'noun / verb': 'Danh từ / Động từ',
  'preposition / conjunction': 'Giới từ / Liên từ',
};

export function getPosLabel(pos?: string | null): string {
  if (!pos) return '';
  return posLabelMap[pos.toLowerCase().trim()] || pos;
}

export const toeicApi = {
  getCatalog() {
    return api.request<ToeicCatalog>('GET', '/toeic-foundation');
  },

  enroll() {
    return api.request<ToeicProfile>('POST', '/toeic-foundation/enroll', {});
  },

  updateProfile(body: Partial<Pick<ToeicProfile, 'daily_minutes' | 'new_words_per_day' | 'target_score'>>) {
    return api.request<ToeicProfile>('PUT', '/toeic-foundation/profile', body);
  },

  getRoadmap() {
    return api.request<ToeicRoadmap>('GET', '/toeic-foundation/roadmap');
  },

  getToday() {
    return api.request<ToeicToday>('GET', '/toeic-foundation/today');
  },

  getUnit(id: string) {
    return api.request<ToeicUnitDetail>('GET', `/toeic-foundation/units/${encodeURIComponent(id)}`);
  },

  getVocabulary(params?: { phase?: number; week?: number; due?: boolean; limit?: number; offset?: number }) {
    const q = new URLSearchParams();
    if (params?.phase !== undefined) q.set('phase', String(params.phase));
    if (params?.week !== undefined) q.set('week', String(params.week));
    if (params?.due) q.set('due', 'true');
    if (params?.limit !== undefined) q.set('limit', String(params.limit));
    if (params?.offset !== undefined) q.set('offset', String(params.offset));
    const qs = q.toString();
    return api.request<ToeicVocabularyResponse>('GET', `/toeic-foundation/vocabulary${qs ? `?${qs}` : ''}`);
  },

  startUnitSession(unitId: string, body: { module: ToeicModule; resume?: boolean }) {
    return api.request<ToeicSessionView>('POST', `/toeic-foundation/units/${encodeURIComponent(unitId)}/sessions`, body);
  },

  startCheckpointSession(week: number, body?: { resume?: boolean }) {
    return api.request<ToeicSessionView>('POST', `/toeic-foundation/checkpoints/${encodeURIComponent(week)}/sessions`, body ?? {});
  },

  startReviewSession(body?: { limit?: number; resume?: boolean }) {
    return api.request<ToeicSessionView>('POST', '/toeic-foundation/review/sessions', body ?? {});
  },

  getSession(id: string) {
    return api.request<ToeicSessionView>('GET', `/toeic-foundation/sessions/${encodeURIComponent(id)}`);
  },

  listenSession(id: string, revision: number) {
    return api.request<ToeicListenResponse>('POST', `/toeic-foundation/sessions/${encodeURIComponent(id)}/listen`, { revision });
  },

  helpSession(id: string, revision: number) {
    return api.request<ToeicSessionView>('POST', `/toeic-foundation/sessions/${encodeURIComponent(id)}/help`, { revision });
  },

  answerSession(
    id: string,
    body: {
      revision: number;
      option_id?: string;
      answer?: string;
      token_ids?: string[];
      action?: 'continue';
    }
  ) {
    return api.request<ToeicSessionView>('POST', `/toeic-foundation/sessions/${encodeURIComponent(id)}/answer`, body);
  },

  getMistakes(params?: { limit?: number; offset?: number }) {
    const q = new URLSearchParams();
    if (params?.limit !== undefined) q.set('limit', String(params.limit));
    if (params?.offset !== undefined) q.set('offset', String(params.offset));
    const qs = q.toString();
    return api.request<ToeicMistakesResponse>('GET', `/toeic-foundation/mistakes${qs ? `?${qs}` : ''}`);
  },
};
