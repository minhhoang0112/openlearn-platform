/** Independent backend contract for Anti's FE. UI should not call the original site. */
export interface ApiErrorBody { code: string; message: string; details?: unknown }
export class ApiError extends Error {
  constructor(public status: number, public error: ApiErrorBody, public requestId?: string) { super(error.message); }
}
export type MemoryStatus = 'new' | 'learning' | 'mastered';
export type StudyMode = 'flashcard' | 'learn' | 'write' | 'dictation' | 'quiz' | 'exam' | 'match' | 'comprehensive';

export interface ApiWord {
  id: number; set_id: number; term: string; definition: string; part_of_speech: string;
  phonetic: string; example: string; synonyms: string; image_url: string; position: number;
  status: MemoryStatus; starred: boolean; due_at: string | null;
  example_translation?: string; example_source?: string;
}

export interface SetCard {
  id: number; title: string; description: string; learning_language: string; native_language: string;
  visibility: 'private' | 'public'; tag: string; source: string; content_status: string;
  word_count: number; mastered_count: number; saved: boolean; author: { id: number | null; name: string };
}

export interface PathCard {
  id: number; title: string; description: string; learning_language: string; native_language: string;
  visibility: 'private' | 'public'; tag: string; source: string; content_status: string;
  expected_set_count: number; set_count: number; saved: boolean; author: { id: number | null; name: string };
  sets?: SetCard[];
}

export interface StudySession {
  id: string; set_id: number; mode: StudyMode; settings: Record<string, unknown>;
  status: 'active' | 'completed'; total: number; completed: number; correct: number;
  question: { id: string; word_id: number; type: string; prompt: string | null; phonetic?: string;
    part_of_speech?: string; options?: { id: string; text: string }[]; speech_text?: string } | null;
}

export interface GradedAnswer { correct: boolean; expected: string; points?: number; replayed: boolean; session: StudySession }

export interface UserProfile {
  id: number; email: string; name: string;
  settings: {
    ui_language?: string; native_language?: string; learning_languages?: string[];
    theme?: string; daily_goal?: number; study?: Record<string, unknown>;
  };
  created_at: string;
}

export interface DashboardData {
  user: Pick<UserProfile,'id'|'name'>;
  due_today: number;
  studying_paths: PathCard[];
  studying_sets: SetCard[];
  recommended: { tag: string; items: PathCard[] }[];
  recent: SetCard[];
  activity: { kind: string; resource_id: string; points: number; created_at: string }[];
  promotion: unknown;
}

export interface CourseSummary {
  id: number; title: string; language: string; competence: string; visibility: string; source: string;
}

export interface CourseDetail extends CourseSummary {
  parts: {
    id: number; title: string; position: number;
    lessons: { id: number; title: string; position: number; content_status: string; score?: number; total?: number; completed_at?: string }[];
  }[];
}

export interface CourseLearningStep {
  id: string;
  type: 'vocab' | 'speaking' | 'quiz';
  title: string;
  english?: string;
  vietnamese?: string;
  assessment?: string;
  phrases?: { text: string; translation: string }[];
  questions?: { id: string; type: 'write' | 'choice'; prompt: string; options?: { id: string; text: string }[] }[];
  completed: boolean;
  result?: any;
}

export interface CourseLearningSession {
  id: string;
  course_id: number;
  lesson_id: number;
  title: string;
  instruction: string;
  index: number;
  total: number;
  status: 'active' | 'completed';
  steps: CourseLearningStep[];
  current: CourseLearningStep | null;
  quiz_draft: { question_id: string; answer?: string; option_id?: string }[];
  grade: { score: number; total: number; results: any[]; completed_at: string } | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CourseLessonActivity {
  key: string;
  title: string;
  scope: 'lesson' | 'topic';
  route: string;
  set_id?: number;
}

export interface CourseLessonActivitiesResponse {
  course_id: number;
  lesson_id: number;
  linked_set: { id: number; title: string } | null;
  activities: CourseLessonActivity[];
  progress: { score: number; total: number; completed_at: string } | null;
  completion_rule: string;
}

export interface StudyOptionsResponse {
  mode: StudyMode;
  defaults: Record<string, unknown>;
  saved: Record<string, unknown>;
  settings: Record<string, unknown>;
  directions: string[];
  answer_modes: string[];
  question_types: string[];
  counts: { total: number; starred: number; unmastered: number };
  subscription_required: boolean;
}

export interface ReadingFullPageQuestion {
  id: string;
  type: 'cloze' | 'choice';
  gap_number?: number;
  prompt: string;
  options?: { id: string; text: string }[];
  draft: string | null;
  feedback: {
    question_id: string;
    correct: boolean;
    answer: string;
    expected: string;
    translation: string;
    explanation: string;
    skipped: boolean;
  } | null;
}

export interface ReadingFullPageResponse {
  id: string;
  passage: string;
  completed: boolean;
  questions: ReadingFullPageQuestion[];
}

export interface ClassItem {
  id: number; name: string; description: string; teacher_id: number; is_owner: boolean;
  member_count?: number; invitation_code?: string;
}

export interface RankingUser {
  rank: number; user_id: number; name: string; points: number;
}

export interface LearningProfile {
  time_budget_minutes: 15 | 30 | 45;
  focus: 'general' | 'system';
  timezone: string;
  preferred_days: number[];
  program_id: number | null;
  is_default: boolean;
  updated_at: string | null;
}

export interface UpdateLearningProfilePayload {
  time_budget_minutes?: 15 | 30 | 45;
  focus?: 'general' | 'system';
  timezone?: string;
  preferred_days?: number[];
}

export interface LearningProgramSummary {
  id: string;
  title: string;
  kind: 'foundation' | 'specialist';
  version: number;
  status: 'pilot' | 'published' | 'draft';
  lesson_count: number;
}

export interface LearningLessonMetadata {
  id: string;
  title: string;
  version: number;
  lesson_kind?: 'lesson' | 'checkpoint';
  estimated_minutes: number;
  objectives: string[];
  recommended_prerequisites: string[];
  completed_at: string | null;
}

export interface LearningProgramDetail extends LearningProgramSummary {
  units: {
    id: string;
    title: string;
    lessons: LearningLessonMetadata[];
  }[];
}

export interface TodayPlanItem {
  id: string;
  kind: 'review' | 'lesson';
  route: string | null;
  estimated_minutes: number;
  status: 'ready' | 'in_progress' | 'completed';
  initial_due_count?: number;
  due_count?: number;
  lesson_id?: string;
  content_version?: number;
  title?: string;
  session_id?: string | null;
}

export interface MistakeSummary {
  total: number;
  active_count: number;
  resolved_count: number;
  due_count: number;
  route: string;
}

export interface TodayPlan {
  plan_id: string;
  local_date: string;
  timezone: string;
  budget_minutes: number;
  items: TodayPlanItem[];
  mistake_summary?: MistakeSummary;
  resume_session_id: string | null;
  resume_route?: string | null;
  resume_lesson_id?: string | null;
  scheduled_day?: boolean | null;
  preferred_days?: number[] | null;
  schedule_policy?: 'preferred_days' | 'legacy_unrestricted';
  status: 'ready' | 'completed' | 'content_exhausted' | 'rest_day';
  message: string | null;
  profile_changes_apply: string;
  created_at: string;
}

export type LearningStepType =
  | 'listen_comprehension'
  | 'vocabulary_in_context'
  | 'grammar_practice'
  | 'pronunciation_practice'
  | 'speaking_task'
  | 'writing_task'
  | 'reflection'
  | 'reading_comprehension';

export type LearningResponseSchema = 'choice' | 'text' | 'acknowledge' | 'self_reflection';

export interface LearningMedia {
  id: string;
  url: string;
  duration_ms: number;
  source: string;
  voice: string;
  human_audio_reviewed: boolean;
  segments: { id: string; start_ms: number; end_ms: number; text?: string }[];
}

export interface LearningStepSummary {
  id: string;
  type: LearningStepType;
  title: string;
  state: 'pending' | 'ready' | 'draft' | 'feedback' | 'completed';
}

export interface LearningStepFeedback {
  assessment_status: 'graded' | 'self_review';
  correct?: boolean | null;
  expected_option_id?: string;
  explanation?: string;
  rubric?: string[];
  message?: string;
  assistance_used?: string[];
  mistake_id?: string;
}

export type MistakeStatus = 'active' | 'resolved';

export interface MistakeItem {
  id: string;
  lesson_id: string;
  content_version: number;
  step_id: string;
  lesson_title: string;
  type: LearningStepType;
  prompt: string;
  wrong_count: number;
  review_count: number;
  correct_streak: number;
  required_correct: number;
  status: MistakeStatus;
  due: boolean;
  due_at: string | null;
  last_wrong_at: string;
  last_reviewed_at: string | null;
  resolved_at: string | null;
}

export interface MistakeDetail extends MistakeItem {
  question: {
    id: string;
    type: string;
    title: string;
    prompt: string;
    response_schema: 'choice';
    options: { id: string; text: string }[];
  };
  hint?: string | null;
  media?: {
    id?: string;
    url: string;
    duration_ms?: number;
    source?: string;
  } | null;
  transcript?: string | null;
  translation?: string | null;
}

export interface MistakeReviewAttempt {
  submission_id: string;
  response: { option_id: string };
  feedback: MistakeReviewFeedback;
  created_at: string;
}

export interface MistakeReviewFeedback {
  assessment_status: 'graded';
  correct: boolean;
  independent: boolean;
  expected_option_id: string;
  explanation: string;
  assistance_used: string[];
  counts_toward_resolution: boolean;
  correct_streak: number;
  required_correct: number;
  resolved: boolean;
  message: string;
}

export interface MistakeReviewResult {
  feedback: MistakeReviewFeedback;
  mistake: MistakeItem & Partial<MistakeDetail>;
  summary: MistakeSummary;
  replayed: boolean;
}

// V2 Progress & History (FE-04)
export interface LearningAiFeedbackCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

export interface LearningAiFeedbackDetail {
  summary: string;
  strengths: string[];
  corrections: LearningAiFeedbackCorrection[];
  suggested_response: string;
  next_practice: string[];
  task_relevance: 'on_topic' | 'partly_on_topic' | 'off_topic' | 'uncertain';
}

export interface LearningAiFeedbackItem {
  id: string;
  session_id: string;
  step_id: string;
  provider: string;
  model: string;
  assessment_status: 'ai_review';
  modality: 'writing_text' | 'speaking_transcript';
  pronunciation_assessed: boolean;
  source_submission_id: string;
  source_text: string;
  feedback: LearningAiFeedbackDetail;
  cached: boolean;
  created_at: string;
  limitations: string[];
}

export interface LearningAudioReviewCapability {
  configured: boolean;
  supported: boolean;
  provider: string | null;
  model: string | null;
  accepted_mime_types: string[];
  max_audio_bytes: number;
  max_base64_chars: number;
  audio_stored: boolean;
}

export interface LearningAudioReviewItem {
  id: string;
  session_id: string;
  step_id: string;
  target: string;
  provider: string | null;
  model: string | null;
  created_at: string;
  mime_type: string;
  audio_bytes: number;
  transcript: string;
  feedback: string;
  improvements: string[];
  needs_clearer_recording: boolean;
  cached: boolean;
  limitations: string[];
  assessment_status: 'ai_audio_review';
  assessment_scope: 'qualitative_audio_feedback';
  pronunciation_score: null;
  proficiency_estimate: null;
  audio_stored: boolean;
}

export interface LearningAudioReviewsResponse {
  capability: LearningAudioReviewCapability;
  items: LearningAudioReviewItem[];
  total: number;
  limit: number;
  offset: number;
}

// V2 Phrases & Study Sets (PHRASE-01 / FE-PHRASE-01)
export interface LearningPhraseItem {
  phrase_index: number;
  text: string;
  translation: string;
  saved: boolean;
  word_id: number | null;
  set_id: number | null;
  route: string | null;
}

export interface LearningPhraseLibrary {
  set_id: number | null;
  title: string | null;
  route: string | null;
  review_route: string | null;
  word_count: number;
  source_links: number;
  due_count: number;
}

export interface LearningStepPhrasesResponse {
  lesson_id: string;
  content_version: number;
  step_id: string;
  items: LearningPhraseItem[];
  library: LearningPhraseLibrary;
}

export interface LearningSavePhrasesResult {
  added_count: number;
  linked_count: number;
  already_saved_count: number;
  reused_count: number;
  items: LearningPhraseItem[];
  library: LearningPhraseLibrary;
}

// MATERIAL-01 / FE-MATERIAL-01 Personal Listening Materials
export interface LearningMaterialCapabilities {
  max_audio_bytes: number;
  max_json_bytes: number;
  accepted_mime_types: string[];
  max_duration_ms: number;
  max_transcript_characters: number;
  private_only: boolean;
  ai_required: boolean;
  external_url_import: boolean;
}

export interface LearningMaterialPlayback {
  revision: number;
  position_ms: number;
  rate: number;
  loop_start_ms: number | null;
  loop_end_ms: number | null;
  loop_enabled: boolean;
  show_transcript: boolean;
  updated_at: string | null;
}

export interface LearningMaterialItem {
  id: string;
  title: string;
  transcript_excerpt?: string;
  transcript?: string;
  translation?: string;
  source_note?: string;
  mime_type: string;
  audio_bytes: number;
  duration_ms: number;
  duration_source: 'wav_header' | 'browser_metadata';
  revision: number;
  created_at: string;
  updated_at: string;
  audio_url: string;
  route: string;
  playback: LearningMaterialPlayback;
  assessment: string;
  replayed?: boolean;
}

export interface LearningMaterialsListResponse {
  items: LearningMaterialItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface LearningMaterialCreatePayload {
  submission_id: string;
  title: string;
  transcript?: string;
  translation?: string;
  source_note?: string;
  audio: {
    mime_type: string;
    data: string; // Base64 without data: prefix
  };
  duration_ms?: number;
}

export interface LearningMaterialUpdatePayload {
  revision: number;
  title?: string;
  transcript?: string;
  translation?: string;
  source_note?: string;
}

export interface LearningMaterialPlaybackPayload {
  revision: number;
  position_ms?: number;
  rate?: number;
  loop_start_ms?: number | null;
  loop_end_ms?: number | null;
  loop_enabled?: boolean;
  show_transcript?: boolean;
}

// MATERIAL-02 / FE-MATERIAL-02 Cues & Dictation
export interface LearningMaterialCue {
  id: string;
  start_ms: number;
  end_ms: number;
  text: string;
  translation?: string;
}

export interface LearningMaterialCuesResponse {
  material_id: string;
  duration_ms: number;
  revision: number;
  cues: LearningMaterialCue[];
  updated_at: string | null;
  limits: {
    max_cues: number;
    max_cue_text_characters: number;
    max_total_text_characters: number;
    max_comparison_tokens: number;
    min_cue_duration_ms: number;
    alignment: string;
    ai_required: boolean;
  };
}

export interface DictationToken {
  token: string;
  matched: boolean;
}

export interface DictationAttemptResult {
  material_id: string;
  submission_id: string;
  cues_revision: number;
  cue: LearningMaterialCue;
  answer: string;
  correct: boolean;
  assisted: boolean;
  gave_up: boolean;
  independent_correct: boolean;
  assessment: 'exact_text_comparison';
  comparison: string;
  expected_tokens: DictationToken[];
  answer_tokens: DictationToken[];
  created_at: string;
  replayed: boolean;
}

export interface DictationAttemptsResponse {
  items: DictationAttemptResult[];
  total: number;
  limit: number;
  offset: number;
  summary: {
    attempts: number;
    independent_correct: number;
    assisted: number;
    gave_up: number;
  };
  assessment: 'exact_text_comparison';
  mastery_assessed: boolean;
}

export interface MaterialDictationPayload {
  submission_id: string;
  cues_revision: number;
  cue_id: string;
  answer: string;
  revealed?: boolean;
  give_up?: boolean;
}

// MATERIAL-03 / FE-MATERIAL-03 Subtitle Import & Export
export interface SubtitleWarning {
  code: 'MARKUP_REMOVED' | 'METADATA_BLOCK_IGNORED' | 'HEADER_METADATA_IGNORED' | 'CUE_SETTINGS_IGNORED' | string;
  count: number;
}

export interface SubtitlePreviewImportPayload {
  format: 'srt' | 'vtt';
  content: string;
}

export interface SubtitlePreviewImportResponse {
  material_id: string;
  format: 'srt' | 'vtt';
  revision: number;
  cues: LearningMaterialCue[];
  warnings: SubtitleWarning[];
  saved: boolean;
  alignment: string;
  translation_generated: boolean;
  limits: {
    max_cues: number;
    max_cue_text_characters: number;
    max_total_text_characters: number;
    max_comparison_tokens: number;
    min_cue_duration_ms: number;
    alignment: string;
    ai_required: boolean;
    max_subtitle_characters: number;
  };
}

export interface SubtitleExportResponse {
  material_id: string;
  revision: number;
  format: 'srt' | 'vtt';
  content: string;
  mime_type: string;
  filename: string;
  cue_count: number;
  translation_included: boolean;
}

export interface SkillProgressItem {
  key: string;
  label: string;
  submitted_tasks: number;
  distinct_tasks: number;
  graded_tasks: number;
  correct: number;
  unassisted_graded: number;
  unassisted_correct: number;
  assisted_graded: number;
  assisted_correct: number;
  unknown_support: number;
  self_review_tasks: number;
  last_practised_at: string | null;
  accuracy_percent: number | null;
  unassisted_accuracy_percent: number | null;
  evidence_status: 'graded_practice' | 'self_review_only' | 'ai_audio_feedback' | 'not_assessed';
  ai_feedback_count?: number;
  ai_audio_review_count?: number;
}

export interface ProgramProgressItem {
  id: string;
  title: string;
  kind: 'foundation' | 'specialist';
  status: string;
  published_lessons: number;
  completed_lessons: number;
  completion_percent: number | null;
}

export interface DailyActivityItem {
  date: string;
  lesson_submissions: number;
  mistake_reviews: number;
}

export interface LearningProgressData {
  scope: string;
  timezone: string;
  generated_at: string;
  window: {
    days: number;
    from_local_date: string;
    to_local_date: string;
  };
  lifetime: {
    sessions_started: number;
    active_sessions: number;
    completed_sessions: number;
    unique_lessons_completed: number;
  };
  programs: ProgramProgressItem[];
  skills: SkillProgressItem[];
  window_activity: {
    lesson_submissions: number;
    mistake_reviews: number;
    active_days: number;
  };
  daily_activity: DailyActivityItem[];
  review_practice: {
    submitted: number;
    correct: number;
    unassisted_correct: number;
  };
  mistakes: MistakeSummary;
  ai_feedback?: {
    reviews_created: number;
    writing: number;
    speaking_transcript: number;
    last_created_at: string | null;
  } | null;
  audio_feedback?: {
    reviews_created: number;
    last_created_at: string | null;
    assessment_scope: string;
    pronunciation_score: null;
  } | null;
  listening_practice?: ListeningPracticeProgress | null;
  limitations: string[];
}

export interface LearningHistoryItem {
  id: string;
  lesson_id: string;
  content_version: number;
  program_id: string;
  title: string;
  status: 'active' | 'completed';
  completed_steps: number;
  total_steps: number;
  submitted_steps: number;
  route: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface LearningEvidenceItem {
  step_id: string;
  type: LearningStepType;
  title: string;
  prompt: string;
  options: { id: string; text: string }[] | null;
  response: any;
  feedback: LearningStepFeedback | null;
  ai_feedback?: LearningAiFeedbackItem | null;
  audio_review_count?: number;
  submitted_at: string;
}

export interface LearningSessionEvidence {
  session_id: string;
  lesson_id: string;
  content_version: number;
  audio_review_count?: number;
  audio_reviews_route?: string;
  items: LearningEvidenceItem[];
}

// V2 Listening & Shadowing (LISTEN-01 / FE-LISTEN)
export interface ListeningCatalogItem {
  lesson_id: string;
  content_version: number;
  program_id: string;
  title: string;
  lesson_kind: 'lesson' | 'checkpoint';
  source: string;
  voice: string;
  sentence_practice_available: boolean;
  sentence_count: number;
  full_audio_url: string;
  full_translation: string;
  transcript: string;
}

export interface ListeningSentenceItem {
  id: string;
  text: string;
  translation: string | null;
  audio_url: string;
  duration_ms: number;
}

export interface ListeningTrackDetail extends ListeningCatalogItem {
  sentence_source: string;
  aligned_to_full_audio: boolean;
  sentences: ListeningSentenceItem[];
  guidance: string[];
}

export interface ListeningSessionSettings {
  mode: 'listen_repeat' | 'shadowing';
  rate: number;
  target_repetitions: number;
}

export interface ListeningSentenceResult {
  sentence_id: string;
  repetitions: number;
  self_reviewed?: boolean;
  reflection?: string | null;
  skipped: boolean;
  assessment: string;
  pronunciation_assessed?: boolean;
  completed_at?: string;
}

export interface ListeningSessionSummary {
  practised_sentences: number;
  skipped_sentences: number;
  repetitions_self_reported: number;
  mastered: boolean;
  pronunciation_assessed: boolean;
}

export interface ListeningSession {
  id: string;
  lesson_id: string;
  content_version: number;
  title: string;
  revision: number;
  status: 'active' | 'completed';
  settings: ListeningSessionSettings;
  cursor: number;
  total_sentences: number;
  current: ListeningSentenceItem | null;
  track: ListeningTrackDetail;
  results: Record<string, ListeningSentenceResult>;
  summary: ListeningSessionSummary | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  replayed?: boolean;
}

export interface ListeningSessionHistoryItem {
  id: string;
  lesson_id: string;
  content_version: number;
  title: string;
  status: 'active' | 'completed';
  cursor: number;
  route: string;
  settings: ListeningSessionSettings;
  summary: ListeningSessionSummary;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ListeningPracticeProgress {
  sessions_started: number;
  completed_sessions: number;
  active_sessions: number;
  practised_sentences: number;
  skipped_sentences: number;
  repetitions_self_reported: number;
  last_practised_at: string | null;
  resume_session_id: string | null;
  resume_route: string | null;
  route: string;
  assessment: string;
  listening_accuracy: number | null;
  pronunciation_score: number | null;
}

export interface LearningCurrentStep {
  id: string;
  type: LearningStepType;
  title: string;
  prompt: string;
  response_schema: LearningResponseSchema;
  state: 'ready' | 'draft' | 'feedback' | 'completed';
  media?: LearningMedia;
  instruction?: string;
  options?: { id: string; text: string }[];
  phrases?: { text: string; translation: string }[];
  target?: string;
  guidance?: string;
  model?: string;
  rubric?: string[];
  draft?: any;
  feedback?: LearningStepFeedback | null;
}

export interface LearningCheckpointSummary {
  scope: 'local_unit_review';
  graded_total: number;
  graded_submitted: number;
  correct: number;
  unassisted_correct: number;
  minimum_correct: number;
  passed: boolean;
  status: 'passed' | 'review_needed' | 'incomplete';
  recommended_lesson_ids: string[];
  open_tasks_assessment: string;
  proficiency_estimate: null;
}

export interface LearningSessionSummary {
  completed: boolean;
  mastered: boolean;
  graded_correct: number;
  graded_total: number;
  open_tasks: number;
  checkpoint?: LearningCheckpointSummary | null;
}

export interface LearningSession {
  id: string;
  lesson_id: string;
  program_id: string;
  lesson_kind?: 'lesson' | 'checkpoint';
  title: string;
  objectives: string[];
  content_version: number;
  revision: number;
  status: 'active' | 'completed';
  cursor: number;
  steps: LearningStepSummary[];
  current: LearningCurrentStep | null;
  completed_steps: number;
  total_steps: number;
  media: LearningMedia;
  transcript: string;
  translation: string;
  provenance: string;
  results: Record<string, LearningStepFeedback>;
  summary: LearningSessionSummary | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export class OpenQuizApi {
  private pendingStarts = new Map<string,Promise<StudySession>>();
  constructor(public baseUrl = '/api/v1') {}

  async request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    const response = await fetch(this.baseUrl + path, {
      method, credentials: 'include', signal,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? { 'X-Requested-With': 'OpenQuiz' } : {})
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const envelope = await response.json();
    if (!response.ok) {
      throw new ApiError(response.status, envelope.error ?? { code: 'HTTP_ERROR', message: response.statusText }, envelope.request_id);
    }
    return envelope.data as T;
  }

  // Auth
  register(email: string, password: string, name: string) { return this.request<UserProfile>('POST', '/auth/register', { email, password, name }); }
  login(email: string, password: string) { return this.request<UserProfile>('POST', '/auth/login', { email, password }); }
  logout() { return this.request('POST', '/auth/logout', {}); }
  me() { return this.request<UserProfile>('GET', '/me'); }
  capabilities() { return this.request<{ai: {configured: boolean; pronunciation_audio: boolean}; [key: string]: unknown}>('GET', '/capabilities'); }

  // Dashboard & Search
  dashboard() { return this.request<DashboardData>('GET', '/dashboard'); }
  async search(q: string) {
    const data = await this.request<{sets: {items: SetCard[]}; paths: {items: PathCard[]}}>('GET', `/search?q=${encodeURIComponent(q)}`);
    return {sets: data.sets.items, paths: data.paths.items};
  }
  async dictionary(q: string) {
    const data = await this.request<{items: ApiWord[]; source: string}>('GET', `/dictionary?q=${encodeURIComponent(q)}`);
    return {words: data.items, source: data.source};
  }

  // Sets & Words
  getSets(filter?: string) { return this.request<{ items: SetCard[] }>('GET', `/sets?limit=100&learning_language=en${filter ? `&filter=${encodeURIComponent(filter)}` : ''}`); }
  getSet(id: number) { return this.request<SetCard & { words: ApiWord[] }>('GET', `/sets/${id}`); }
  createSet(data: { title: string; description?: string; learning_language?: string; native_language?: string; visibility?: string; tag?: string; words: Partial<ApiWord>[] }) {
    return this.request<SetCard>('POST', '/sets', data);
  }
  importSet(data: { title: string; description?: string; words: Partial<ApiWord>[] }) {
    return this.request<SetCard>('POST', '/sets/import', data);
  }
  wordProgress(id: number, progress: { status?: MemoryStatus; starred?: boolean; quality?: number }) {
    return this.request('PATCH', `/words/${id}/progress`, progress);
  }
  getSetProgress(setId: number) {
    return this.request<{ total: number; new: number; learning: number; mastered: number; words: ApiWord[] }>('GET', `/sets/${setId}/progress`);
  }
  resetSetProgress(setId: number) {
    return this.request('POST', `/sets/${setId}/progress/reset`, { confirm: true });
  }

  // Paths
  getPath(id: number) { return this.request<PathCard>('GET', `/paths/${id}`); }
  getPaths(filter?: string, tag?: string) {
    const query = new URLSearchParams({learning_language:'en', limit:'100'});
    if (filter) query.set('filter',filter);
    if (tag) query.set('tag',tag);
    return this.request<{ items: PathCard[] }>('GET', `/paths?${query}`);
  }

  // Bookmarks
  save(kind: 'set' | 'path' | 'word', id: number, saved: boolean) {
    return this.request('PUT', `/bookmarks/${kind}/${id}`, { saved });
  }

  // Study Sessions
  startStudy(setId: number, mode: StudyMode, settings: Record<string, unknown> = {}) {
    const key=JSON.stringify([setId,mode,settings]);
    const existing=this.pendingStarts.get(key);if(existing)return existing;
    const promise=this.request<StudySession>('POST', '/study/sessions', { set_id: setId, mode, settings });
    this.pendingStarts.set(key,promise);
    void promise.then(()=>this.pendingStarts.delete(key),()=>this.pendingStarts.delete(key));
    return promise;
  }
  resumeStudy(id: string) {
    return this.request<StudySession>('GET', `/study/sessions/${encodeURIComponent(id)}`);
  }
  answer(sessionId: string, questionId: string, answer: string, extra: { option_id?: string; known?: boolean; skip?: boolean } = {}) {
    return this.request<GradedAnswer>('POST', `/study/sessions/${encodeURIComponent(sessionId)}/answers`, { question_id: questionId, answer, ...extra });
  }
  getQuestions(sessionId: string) {
    return this.request<{ questions: { id: string; type: string; prompt: string; options?: { id: string; text: string }[] }[] }>('GET', `/study/sessions/${encodeURIComponent(sessionId)}/questions`);
  }
  async submitExam(sessionId: string, answers: { question_id: string; answer?: string; option_id?: string }[]) {
    const data = await this.request<{session: StudySession; results: {question_id: string; correct: boolean; expected: string}[]}>('POST', `/study/sessions/${encodeURIComponent(sessionId)}/submit`, { answers: answers.map(a=>({...a,answer:a.answer ?? ''})) });
    return {score:data.session.correct,total:data.session.total,results:data.results};
  }
  async getMatchPairs(sessionId: string) {
    return this.request<{terms: {id: string; text: string}[]; definitions: {id: string; text: string}[]}>('GET', `/study/sessions/${encodeURIComponent(sessionId)}/match`);
  }

  // SRS
  async getSrsSummary() {
    const data = await this.request<{due: number; tracked: number; learning: number; mastered: number; forecast: {date:string;count:number}[]}>('GET', '/srs/summary');
    return {...data,due_count:data.due,total_reviewed:data.tracked};
  }
  getSrsQueue(options: { set_id?: number; path_id?: number; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (options.set_id) params.set('set_id', String(options.set_id));
    if (options.path_id) params.set('path_id', String(options.path_id));
    if (options.limit) params.set('limit', String(options.limit));
    return this.request<{ items: ApiWord[] }>('GET', `/srs/queue?${params.toString()}`);
  }

  // Comprehensive 5-word 5-step mode
  getLessons(setId: number) {
    return this.request<{ set_id: number; words_per_lesson: number; step_names: string[]; lessons: { index: number; word_ids: number[]; terms: string[]; completed_steps: number; completed: boolean }[] }>('GET', `/sets/${setId}/lessons`);
  }
  getLesson(setId: number, lessonIndex: number) {
    return this.request<{ set_id: number; lesson_index: number; words: ApiWord[]; steps: { index: number; name: string; completed: boolean; available: boolean }[]; completed: boolean }>('GET', `/sets/${setId}/lessons/${lessonIndex}`);
  }
  startLessonStep(setId: number, lessonIndex: number, stepIndex: number) {
    return this.request<{ lesson_index: number; step_index: number; session?: StudySession; action?: string }>('POST', `/sets/${setId}/lessons/${lessonIndex}/steps/${stepIndex}/start`, {});
  }
  completeLessonStep(setId: number, lessonIndex: number, stepIndex: number, evidence: Record<string, unknown>) {
    return this.request('POST', `/sets/${setId}/lessons/${lessonIndex}/steps/${stepIndex}/complete`, evidence);
  }

  // Study Options
  getStudyOptions(setId: number, mode: StudyMode) {
    return this.request<StudyOptionsResponse>('GET', `/study/options?set_id=${encodeURIComponent(setId)}&mode=${encodeURIComponent(mode)}`);
  }

  // Reading Full-Page
  getReadingQuestions(attemptId: string) {
    return this.request<ReadingFullPageResponse>('GET', `/exercise-attempts/${encodeURIComponent(attemptId)}/questions`);
  }
  saveReadingDrafts(attemptId: string, answers: { question_id: string; answer: string | null }[]) {
    return this.request<{ id: string; saved: boolean; drafts: Record<string, string> }>('PUT', `/exercise-attempts/${encodeURIComponent(attemptId)}/drafts`, { answers });
  }
  submitReading(attemptId: string, answers: { question_id: string; answer?: string; skip?: boolean }[]) {
    return this.request<ReadingFullPageResponse & { results: { question_id: string; correct: boolean; answer: string; expected: string; translation: string; explanation: string; skipped: boolean }[]; replayed: boolean }>('POST', `/exercise-attempts/${encodeURIComponent(attemptId)}/submit`, { answers });
  }

  // Courses
  getCourses(language = '', competence = '') {
    return this.request<{ items: CourseSummary[] }>('GET', `/courses?language=${encodeURIComponent(language)}&competence=${encodeURIComponent(competence)}`);
  }
  getCourse(id: number) {
    return this.request<CourseDetail>('GET', `/courses/${id}`);
  }
  getCourseLessonActivities(lessonId: number) {
    return this.request<CourseLessonActivitiesResponse>('GET', `/course-lessons/${encodeURIComponent(lessonId)}/activities`);
  }
  startCourseLessonSession(lessonId: number, resume = true) {
    return this.request<CourseLearningSession & { replayed: boolean }>('POST', `/course-lessons/${encodeURIComponent(lessonId)}/sessions`, { resume });
  }
  getCourseLearningSession(sessionId: string) {
    return this.request<CourseLearningSession>('GET', `/course-learning-sessions/${encodeURIComponent(sessionId)}`);
  }
  saveCourseQuizDraft(sessionId: string, answers: { question_id: string; answer?: string; option_id?: string }[]) {
    return this.request<CourseLearningSession>('PUT', `/course-learning-sessions/${encodeURIComponent(sessionId)}/draft`, { answers });
  }
  completeCourseLessonStep(sessionId: string, stepId: string, payload: Record<string, unknown>) {
    return this.request<CourseLearningSession & { feedback: any; replayed: boolean }>('POST', `/course-learning-sessions/${encodeURIComponent(sessionId)}/steps/${encodeURIComponent(stepId)}/complete`, payload);
  }

  // Classes & LMS
  async getClasses() {
    const data = await this.request<{items: {id:number;name:string;description:string;owner_id:number;role:string;join_code?:string;member_count:number}[]}>('GET', '/classes');
    return {items:data.items.map(c=>({...c,teacher_id:c.owner_id,is_owner:c.role==='teacher',invitation_code:c.join_code}))};
  }
  async getClass(id: number) {
    const data = await this.request<{id:number;name:string;description:string;owner_id:number;role:string;join_code?:string;members:{id:number;name:string;role:string}[];assignments:{id:number;title:string;set_id:number;due_at:string;completed:boolean}[]}>('GET', `/classes/${id}`);
    return {...data,teacher_id:data.owner_id,is_owner:data.role==='teacher',invitation_code:data.join_code,member_count:data.members.length,members:data.members.map(m=>({...m,user_id:m.id}))};
  }
  createClass(name: string, description = '') {
    return this.request<ClassItem>('POST', '/classes', { name, description });
  }
  async joinClass(invitation_code: string) {
    const data=await this.request<{id:number}>('POST', '/classes/join', { code: invitation_code });
    return {class_id:data.id};
  }

  // Ranking
  async getRanking(period = 'week') {
    const data = await this.request<{items:{id:number;name:string;points:number}[]}>('GET', `/ranking?period=${encodeURIComponent(period)}`);
    return {items:data.items.map((u,i)=>({...u,user_id:u.id,rank:i+1}))};
  }

  // AI & Feedback
  generate(setId: number, kind: string, instruction = '', transcript = '') {
    return this.request<{id:string;kind:string;result: Record<string,unknown>}>('POST', '/ai/generate', { set_id: setId, kind, instruction, transcript });
  }
  feedback(category: string, content: string) {
    return this.request('POST', '/feedback', { category, message: content });
  }

  // V2 Learning Profile (FE-02a)
  getLearningProfile() {
    return this.request<LearningProfile>('GET', '/learning/profile');
  }
  updateLearningProfile(payload: UpdateLearningProfilePayload) {
    return this.request<LearningProfile>('PUT', '/learning/profile', payload);
  }

  // V2 Curriculum & Sessions (FE-02b)
  getLearningPrograms() {
    return this.request<{ items: LearningProgramSummary[] }>('GET', '/learning/programs');
  }
  getLearningProgram(id: string) {
    return this.request<LearningProgramDetail>('GET', `/learning/programs/${encodeURIComponent(id)}`);
  }
  getTodayPlan() {
    return this.request<TodayPlan>('GET', '/learning/today');
  }
  startLearningSession(lessonId: string, resume = true) {
    return this.request<LearningSession & { replayed: boolean }>('POST', '/learning/sessions', { lesson_id: lessonId, resume });
  }
  getLearningSession(sessionId: string) {
    return this.request<LearningSession>('GET', `/learning/sessions/${encodeURIComponent(sessionId)}`);
  }
  saveLearningDraft(sessionId: string, payload: { step_id: string; revision: number; response: any }) {
    return this.request<LearningSession>('PUT', `/learning/sessions/${encodeURIComponent(sessionId)}/draft`, payload);
  }
  submitLearningStep(sessionId: string, payload: { step_id: string; revision: number; submission_id: string; response: any; assistance_used?: string[] }) {
    return this.request<{ feedback: LearningStepFeedback; session: LearningSession; replayed: boolean }>('POST', `/learning/sessions/${encodeURIComponent(sessionId)}/submit`, payload);
  }
  advanceLearningSession(sessionId: string, payload: { step_id: string; revision: number }) {
    return this.request<LearningSession>('POST', `/learning/sessions/${encodeURIComponent(sessionId)}/advance`, payload);
  }

  // V2 Mistake Notebook (FE-03)
  getMistakes(params?: { status?: 'active' | 'resolved' | 'all'; due_only?: boolean; limit?: number; offset?: number }) {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.due_only !== undefined) q.set('due_only', String(params.due_only));
    if (params?.limit !== undefined) q.set('limit', String(params.limit));
    if (params?.offset !== undefined) q.set('offset', String(params.offset));
    const qs = q.toString();
    return this.request<{ items: MistakeItem[]; total: number; limit: number; offset: number; summary: MistakeSummary }>('GET', `/learning/mistakes${qs ? `?${qs}` : ''}`);
  }

  getMistake(id: string) {
    return this.request<MistakeDetail>('GET', `/learning/mistakes/${encodeURIComponent(id)}`);
  }

  getMistakeReviews(id: string, params?: { limit?: number; offset?: number }) {
    const q = new URLSearchParams();
    if (params?.limit !== undefined) q.set('limit', String(params.limit));
    if (params?.offset !== undefined) q.set('offset', String(params.offset));
    const qs = q.toString();
    return this.request<{ items: MistakeReviewAttempt[]; total: number; limit: number; offset: number }>('GET', `/learning/mistakes/${encodeURIComponent(id)}/reviews${qs ? `?${qs}` : ''}`);
  }

  submitMistakeReview(id: string, payload: { submission_id: string; response: { option_id: string }; assistance_used?: string[] }) {
    return this.request<MistakeReviewResult>('POST', `/learning/mistakes/${encodeURIComponent(id)}/reviews`, payload);
  }

  // V2 Progress & History (FE-04)
  getLearningProgress(days = 30) {
    return this.request<LearningProgressData>('GET', `/learning/progress?days=${encodeURIComponent(days)}`);
  }

  getLearningHistory(params?: { status?: 'all' | 'active' | 'completed'; program_id?: string; limit?: number; offset?: number }) {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.program_id) q.set('program_id', params.program_id);
    if (params?.limit !== undefined) q.set('limit', String(params.limit));
    if (params?.offset !== undefined) q.set('offset', String(params.offset));
    const qs = q.toString();
    return this.request<{ items: LearningHistoryItem[]; total: number; limit: number; offset: number }>('GET', `/learning/history${qs ? `?${qs}` : ''}`);
  }

  getLearningSessionEvidence(sessionId: string) {
    return this.request<LearningSessionEvidence>('GET', `/learning/sessions/${encodeURIComponent(sessionId)}/evidence`);
  }

  // V2 AI Feedback (AI-01)
  getLearningSessionAiFeedback(sessionId: string) {
    return this.request<{ items: LearningAiFeedbackItem[] }>('GET', `/learning/sessions/${encodeURIComponent(sessionId)}/ai-feedback`);
  }

  requestLearningStepAiFeedback(sessionId: string, stepId: string) {
    return this.request<LearningAiFeedbackItem>('POST', `/learning/sessions/${encodeURIComponent(sessionId)}/steps/${encodeURIComponent(stepId)}/ai-feedback`, {});
  }

  // V2 Audio Reviews (AUDIO-01 / FE-AUDIO-01)
  getLearningSessionAudioReviews(sessionId: string, params?: { limit?: number; offset?: number }) {
    const q = new URLSearchParams();
    if (params?.limit !== undefined) q.set('limit', String(params.limit));
    if (params?.offset !== undefined) q.set('offset', String(params.offset));
    const qs = q.toString();
    return this.request<LearningAudioReviewsResponse>('GET', `/learning/sessions/${encodeURIComponent(sessionId)}/audio-reviews${qs ? `?${qs}` : ''}`);
  }

  requestLearningStepAudioReview(sessionId: string, stepId: string, payload: { submission_id: string; audio: { mime_type: string; data: string } }) {
    return this.request<LearningAudioReviewItem>('POST', `/learning/sessions/${encodeURIComponent(sessionId)}/steps/${encodeURIComponent(stepId)}/audio-reviews`, payload);
  }

  deleteLearningSessionAudioReview(sessionId: string, reviewId: string) {
    return this.request<{ deleted: boolean }>('DELETE', `/learning/sessions/${encodeURIComponent(sessionId)}/audio-reviews/${encodeURIComponent(reviewId)}`);
  }

  // V2 Phrases & Study Sets (PHRASE-01 / FE-PHRASE-01)
  getLearningPhraseLibrary() {
    return this.request<LearningPhraseLibrary>('GET', '/learning/phrase-library');
  }

  getLearningStepPhrases(sessionId: string, stepId: string) {
    return this.request<LearningStepPhrasesResponse>('GET', `/learning/sessions/${encodeURIComponent(sessionId)}/steps/${encodeURIComponent(stepId)}/phrases`);
  }

  saveLearningStepPhrases(sessionId: string, stepId: string, phraseIndexes: number[]) {
    return this.request<LearningSavePhrasesResult>('POST', `/learning/sessions/${encodeURIComponent(sessionId)}/steps/${encodeURIComponent(stepId)}/phrases`, { phrase_indexes: phraseIndexes });
  }

  // V2 Listening & Shadowing (LISTEN-01 / FE-LISTEN)
  getListeningCatalog() {
    return this.request<{ items: ListeningCatalogItem[] }>('GET', '/learning/listening');
  }

  getListeningTrack(lessonId: string) {
    return this.request<ListeningTrackDetail>('GET', `/learning/listening/${encodeURIComponent(lessonId)}`);
  }

  startListeningSession(lessonId: string, settings?: Partial<ListeningSessionSettings>, resume = true) {
    return this.request<ListeningSession & { replayed: boolean }>('POST', '/learning/listening/sessions', { lesson_id: lessonId, resume, settings });
  }

  getListeningSessions(params?: { lesson_id?: string; limit?: number; offset?: number }) {
    const q = new URLSearchParams();
    if (params?.lesson_id) q.set('lesson_id', params.lesson_id);
    if (params?.limit !== undefined) q.set('limit', String(params.limit));
    if (params?.offset !== undefined) q.set('offset', String(params.offset));
    const qs = q.toString();
    return this.request<{ items: ListeningSessionHistoryItem[]; total: number; limit: number; offset: number }>('GET', `/learning/listening/sessions${qs ? `?${qs}` : ''}`);
  }

  getListeningSession(sessionId: string) {
    return this.request<ListeningSession>('GET', `/learning/listening/sessions/${encodeURIComponent(sessionId)}`);
  }

  completeListeningSentence(sessionId: string, sentenceId: string, payload: { revision: number; submission_id: string; repetitions?: number; self_reviewed?: boolean; reflection?: string; skip?: boolean }) {
    return this.request<{ session: ListeningSession; result: ListeningSentenceResult; replayed: boolean }>('POST', `/learning/listening/sessions/${encodeURIComponent(sessionId)}/sentences/${encodeURIComponent(sentenceId)}/complete`, payload);
  }

  // Personal Listening Materials (MATERIAL-01 / FE-MATERIAL-01)
  getLearningMaterialCapabilities() {
    return this.request<LearningMaterialCapabilities>('GET', '/learning/materials/capabilities');
  }

  getLearningMaterials(params?: { q?: string; limit?: number; offset?: number }) {
    const q = new URLSearchParams();
    if (params?.q) q.set('q', params.q);
    if (params?.limit !== undefined) q.set('limit', String(params.limit));
    if (params?.offset !== undefined) q.set('offset', String(params.offset));
    const qs = q.toString();
    return this.request<LearningMaterialsListResponse>('GET', `/learning/materials${qs ? `?${qs}` : ''}`);
  }

  createLearningMaterial(payload: LearningMaterialCreatePayload) {
    return this.request<LearningMaterialItem & { replayed: boolean }>('POST', '/learning/materials', payload);
  }

  getLearningMaterial(id: string) {
    return this.request<LearningMaterialItem>('GET', `/learning/materials/${encodeURIComponent(id)}`);
  }

  updateLearningMaterial(id: string, payload: LearningMaterialUpdatePayload) {
    return this.request<LearningMaterialItem>('PATCH', `/learning/materials/${encodeURIComponent(id)}`, payload);
  }

  updateLearningMaterialPlayback(id: string, payload: LearningMaterialPlaybackPayload) {
    return this.request<LearningMaterialPlayback>('PUT', `/learning/materials/${encodeURIComponent(id)}/playback`, payload);
  }

  deleteLearningMaterial(id: string) {
    return this.request<{ deleted: boolean }>('DELETE', `/learning/materials/${encodeURIComponent(id)}`);
  }

  // Material Cues & Dictation (MATERIAL-02 / FE-MATERIAL-02)
  getMaterialCues(materialId: string) {
    return this.request<LearningMaterialCuesResponse>('GET', `/learning/materials/${encodeURIComponent(materialId)}/cues`);
  }

  updateMaterialCues(materialId: string, payload: { revision: number; cues: LearningMaterialCue[] }) {
    return this.request<LearningMaterialCuesResponse>('PUT', `/learning/materials/${encodeURIComponent(materialId)}/cues`, payload);
  }

  submitMaterialDictation(materialId: string, payload: MaterialDictationPayload) {
    return this.request<DictationAttemptResult>('POST', `/learning/materials/${encodeURIComponent(materialId)}/dictation-attempts`, payload);
  }

  getMaterialDictationAttempts(materialId: string, params?: { limit?: number; offset?: number }) {
    const q = new URLSearchParams();
    if (params?.limit !== undefined) q.set('limit', String(params.limit));
    if (params?.offset !== undefined) q.set('offset', String(params.offset));
    const qs = q.toString();
    return this.request<DictationAttemptsResponse>('GET', `/learning/materials/${encodeURIComponent(materialId)}/dictation-attempts${qs ? `?${qs}` : ''}`);
  }

  // Material Subtitles (MATERIAL-03 / FE-MATERIAL-03)
  previewMaterialSubtitles(materialId: string, payload: SubtitlePreviewImportPayload) {
    return this.request<SubtitlePreviewImportResponse>('POST', `/learning/materials/${encodeURIComponent(materialId)}/cues/preview-import`, payload);
  }

  exportMaterialSubtitles(materialId: string, format: 'srt' | 'vtt' = 'vtt') {
    return this.request<SubtitleExportResponse>('GET', `/learning/materials/${encodeURIComponent(materialId)}/cues/export?format=${encodeURIComponent(format)}`);
  }
}

export const api = new OpenQuizApi();
