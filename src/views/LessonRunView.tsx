import React, { useEffect, useState, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  BookOpen,
  Mic,
  Square,
  Eye,
  EyeOff,
  Headphones,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  Trophy,
  Award,
  Home,
  BookX,
  Trash2,
  BookmarkCheck,
  BookmarkPlus,
  FolderPlus,
  CheckSquare,
  Repeat,
  ChevronRight
} from 'lucide-react';
import {
  api,
  LearningSession,
  LearningStepFeedback,
  LearningCurrentStep,
  LearningAiFeedbackItem,
  LearningAudioReviewCapability,
  LearningAudioReviewItem,
  LearningPhraseItem,
  LearningPhraseLibrary
} from '../api/client';
import { useRouter } from '../context/RouterContext';

export const LessonRunView: React.FC = () => {
  const { path, navigate } = useRouter();

  // Extract sessionId from path (/lesson-run/:id)
  const sessionIdMatch = path.match(/^\/lesson-run\/([a-zA-Z0-9-]+)/);
  const sessionId = sessionIdMatch ? sessionIdMatch[1] : '';

  const [session, setSession] = useState<LearningSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current step local states
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<string>('');
  const [selfReviewed, setSelfReviewed] = useState<boolean>(false);
  const [acknowledged, setAcknowledged] = useState<boolean>(false);
  const [reflectionText, setReflectionText] = useState<string>('');

  // Assistance toggles (Logs assistance_used to BE)
  const [showTranscript, setShowTranscript] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const assistanceUsedRef = useRef<Set<string>>(new Set());

  // Autosave / Draft states
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  // Local Voice Recording (for pronunciation & speaking practice without fake AI grading claims)
  const isMountedRef = useRef(true);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordedAudioUrlRef = useRef<string | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const revokeRecordedAudio = () => {
    if (recordedAudioUrlRef.current) {
      URL.revokeObjectURL(recordedAudioUrlRef.current);
      recordedAudioUrlRef.current = null;
    }
  };

  // Unique client submission UUID for idempotency
  const currentSubmissionIdRef = useRef<string>(crypto.randomUUID());
  const sessionIdRef = useRef<string | null>(sessionId);
  sessionIdRef.current = sessionId;

  // Program lessons title lookup & review navigation
  const [programLessonMap, setProgramLessonMap] = useState<Record<string, string>>({});
  const [startingReviewLessonId, setStartingReviewLessonId] = useState<string | null>(null);

  // AI Feedback (AI-01)
  const [aiFeedbackMap, setAiFeedbackMap] = useState<Record<string, LearningAiFeedbackItem>>({});
  const [requestingAiStepId, setRequestingAiStepId] = useState<string | null>(null);
  const [aiFeedbackError, setAiFeedbackError] = useState<{ stepId: string; message: string; retryAfter?: number } | null>(null);

  // Audio Review (AUDIO-01 / FE-AUDIO-01 / FE-AUDIO-02)
  const [audioCapability, setAudioCapability] = useState<LearningAudioReviewCapability | null>(null);
  const [audioReviewsMap, setAudioReviewsMap] = useState<Record<string, LearningAudioReviewItem>>({});
  const [requestingAudioStepId, setRequestingAudioStepId] = useState<string | null>(null);
  const [audioReviewError, setAudioReviewError] = useState<{ stepId: string; message: string; retryAfter?: number } | null>(null);
  const [deletingAudioReviewId, setDeletingAudioReviewId] = useState<string | null>(null);
  const audioReviewSubmissionIdRef = useRef<string>(crypto.randomUUID());

  // Phrases & Study Sets (PHRASE-01 / FE-PHRASE-01)
  const [phraseItems, setPhraseItems] = useState<LearningPhraseItem[]>([]);
  const [phraseLibrary, setPhraseLibrary] = useState<LearningPhraseLibrary | null>(null);
  const [loadingPhrases, setLoadingPhrases] = useState(false);
  const [savingPhrases, setSavingPhrases] = useState(false);
  const [selectedPhraseIndexes, setSelectedPhraseIndexes] = useState<number[]>([]);
  const [phraseSaveResult, setPhraseSaveResult] = useState<{
    addedCount: number;
    linkedCount: number;
    reusedCount: number;
    alreadySavedCount: number;
  } | null>(null);
  const [phraseSaveError, setPhraseSaveError] = useState<string | null>(null);

  // Load session (with session guard)
  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    const targetSessionId = sessionId;
    try {
      const data = await api.getLearningSession(targetSessionId);
      if (!isMountedRef.current || sessionIdRef.current !== targetSessionId) return;
      setSession(data);
      initializeStepStates(data.current);
    } catch (err) {
      if (!isMountedRef.current || sessionIdRef.current !== targetSessionId) return;
      setError((err as Error).message || 'Không thể tải phiên bài học.');
    } finally {
      if (isMountedRef.current && sessionIdRef.current === targetSessionId) {
        setLoading(false);
      }
    }
  }, [sessionId]);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  // Clean up media streams, active recording, and object URLs on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      revokeRecordedAudio();
      recordedBlobRef.current = null;
    };
  }, []);

  // Load program titles for recommended review items
  useEffect(() => {
    if (session?.program_id) {
      api.getLearningProgram(session.program_id)
        .then((prog) => {
          const map: Record<string, string> = {};
          if (prog?.units) {
            for (const unit of prog.units) {
              for (const l of unit.lessons) {
                map[l.id] = l.title;
              }
            }
          }
          setProgramLessonMap(map);
        })
        .catch(() => {});
    }
  }, [session?.program_id]);

  // Start review lesson from checkpoint recommendations
  const handleStartReviewLesson = async (recId: string) => {
    setStartingReviewLessonId(recId);
    try {
      const newSession = await api.startLearningSession(recId, false);
      navigate(`/lesson-run/${newSession.id}`);
    } catch (err) {
      setError((err as Error).message || 'Không thể bắt đầu bài ôn');
      setStartingReviewLessonId(null);
    }
  };

  // Reset session-specific state when sessionId changes (FE-AUDIO-02)
  useEffect(() => {
    sessionIdRef.current = sessionId;
    setAudioReviewsMap({});
    setAiFeedbackMap({});
    setAudioCapability(null);
    setAudioReviewError(null);
    setAiFeedbackError(null);
    setRequestingAudioStepId(null);
    setRequestingAiStepId(null);
    revokeRecordedAudio();
    setRecordedAudioUrl(null);
    setRecordedBlob(null);
    recordedBlobRef.current = null;
    setIsRecording(false);
    setPhraseItems([]);
    setPhraseLibrary(null);
    setSelectedPhraseIndexes([]);
    setPhraseSaveResult(null);
    setPhraseSaveError(null);
  }, [sessionId]);

  // Restore saved AI feedback and Audio Reviews for this session (FE-AUDIO-02: newest-first & session guard)
  useEffect(() => {
    if (!sessionId) return;
    const targetSessionId = sessionId;

    api.getLearningSessionAiFeedback(targetSessionId)
      .then((res) => {
        if (!isMountedRef.current || sessionIdRef.current !== targetSessionId) return;
        const map: Record<string, LearningAiFeedbackItem> = {};
        if (res?.items) {
          // res.items is ordered newest-first; keep the first (newest) item for each step
          for (const item of res.items) {
            if (!map[item.step_id]) {
              map[item.step_id] = item;
            }
          }
        }
        setAiFeedbackMap(map);
      })
      .catch(() => {});

    api.getLearningSessionAudioReviews(targetSessionId)
      .then((res) => {
        if (!isMountedRef.current || sessionIdRef.current !== targetSessionId) return;
        if (res?.capability) setAudioCapability(res.capability);
        const map: Record<string, LearningAudioReviewItem> = {};
        if (res?.items) {
          // res.items is ordered newest-first; keep the first (newest) item for each step (FE-AUDIO-02)
          for (const item of res.items) {
            if (!map[item.step_id]) {
              map[item.step_id] = item;
            }
          }
        }
        setAudioReviewsMap(map);
      })
      .catch(() => {});
  }, [sessionId]);

  // Request AI qualitative feedback on learner's submitted writing or speech transcript
  const handleRequestAiFeedback = async (stepId: string) => {
    if (!session || requestingAiStepId) return;
    const currentSessionId = session.id;
    setRequestingAiStepId(stepId);
    setAiFeedbackError(null);
    try {
      const item = await api.requestLearningStepAiFeedback(currentSessionId, stepId);
      if (isMountedRef.current && sessionIdRef.current === currentSessionId) {
        setAiFeedbackMap((prev) => ({ ...prev, [stepId]: item }));
      }
    } catch (err: any) {
      if (!isMountedRef.current || sessionIdRef.current !== currentSessionId) return;
      const msg = err.error?.message || err.message || 'Không thể lấy nhận xét AI vào lúc này.';
      const retryAfter = err.error?.details?.retry_after_seconds;
      setAiFeedbackError({ stepId, message: msg, retryAfter });
    } finally {
      if (isMountedRef.current && sessionIdRef.current === currentSessionId) {
        setRequestingAiStepId(null);
      }
    }
  };

  // Request qualitative AI audio review on learner's recorded voice (FE-AUDIO-01 / FE-AUDIO-02)
  const handleRequestAudioReview = async (stepId: string) => {
    if (!session || requestingAudioStepId) return;
    const currentSessionId = session.id;
    const blob = recordedBlobRef.current || recordedBlob;
    if (!blob) {
      setAudioReviewError({ stepId, message: 'Chưa có bản thu âm. Hãy thu âm trước khi gửi AI nhận xét.' });
      return;
    }
    if (blob.size < 44 || blob.size > 450000) {
      setAudioReviewError({
        stepId,
        message: 'Kích thước bản thu không hợp lệ (cần từ 44 đến 450.000 byte). Hãy thu một câu ngắn khoảng 2-10 giây.'
      });
      return;
    }

    setRequestingAudioStepId(stepId);
    setAudioReviewError(null);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            const result = reader.result as string;
            const commaIndex = result.indexOf(',');
            const base64 = commaIndex >= 0 ? result.slice(commaIndex + 1) : result;
            resolve(base64);
          } catch (e) {
            reject(e);
          }
        };
        reader.onerror = () => reject(new Error('Không thể đọc dữ liệu âm thanh.'));
        reader.readAsDataURL(blob);
      });

      const rawMime = (blob.type || 'audio/webm').split(';')[0].trim().toLowerCase();
      const mimeType = rawMime || 'audio/webm';

      const payload = {
        submission_id: audioReviewSubmissionIdRef.current,
        audio: {
          mime_type: mimeType,
          data: base64Data
        }
      };

      const review = await api.requestLearningStepAudioReview(currentSessionId, stepId, payload);
      if (isMountedRef.current && sessionIdRef.current === currentSessionId && review.session_id === currentSessionId) {
        setAudioReviewsMap((prev) => ({ ...prev, [review.step_id]: review }));
      }
    } catch (err: any) {
      if (!isMountedRef.current || sessionIdRef.current !== currentSessionId) return;
      const msg = err.error?.message || err.message || 'Không thể lấy nhận xét phát âm vào lúc này.';
      const retryAfter = err.error?.details?.retry_after_seconds;
      setAudioReviewError({ stepId, message: msg, retryAfter });
    } finally {
      if (isMountedRef.current && sessionIdRef.current === currentSessionId) {
        setRequestingAudioStepId(null);
      }
    }
  };

  // Delete own saved audio review (FE-AUDIO-01 / FE-AUDIO-02: re-fetch to restore previous review)
  const handleDeleteAudioReview = async (reviewId: string, stepId: string) => {
    if (!session || deletingAudioReviewId) return;
    const currentSessionId = session.id;
    setDeletingAudioReviewId(reviewId);
    try {
      await api.deleteLearningSessionAudioReview(currentSessionId, reviewId);
      if (isMountedRef.current && sessionIdRef.current === currentSessionId) {
        // Re-fetch reviews to restore any previous review for this step (FE-AUDIO-02)
        const res = await api.getLearningSessionAudioReviews(currentSessionId).catch(() => null);
        if (isMountedRef.current && sessionIdRef.current === currentSessionId) {
          const map: Record<string, LearningAudioReviewItem> = {};
          if (res?.items) {
            for (const item of res.items) {
              if (!map[item.step_id]) {
                map[item.step_id] = item;
              }
            }
          }
          setAudioReviewsMap(map);
        }
      }
    } catch (err: any) {
      if (isMountedRef.current && sessionIdRef.current === currentSessionId) {
        alert((err as Error).message || 'Không thể xóa nhận xét.');
      }
    } finally {
      if (isMountedRef.current && sessionIdRef.current === currentSessionId) {
        setDeletingAudioReviewId(null);
      }
    }
  };

  // Fetch vocabulary phrases preview (PHRASE-01 / FE-PHRASE-01)
  const fetchStepPhrases = useCallback(async (targetSessionId: string, stepId: string) => {
    setLoadingPhrases(true);
    setPhraseSaveError(null);
    try {
      const res = await api.getLearningStepPhrases(targetSessionId, stepId);
      if (!isMountedRef.current || sessionIdRef.current !== targetSessionId) return;
      setPhraseItems(res.items);
      setPhraseLibrary(res.library);
      // Default to selecting all unsaved phrases
      const unsaved = res.items.filter((it) => !it.saved).map((it) => it.phrase_index);
      setSelectedPhraseIndexes(unsaved);
    } catch {
      // Step may not have phrases or not reached yet
    } finally {
      if (isMountedRef.current && sessionIdRef.current === targetSessionId) {
        setLoadingPhrases(false);
      }
    }
  }, []);

  useEffect(() => {
    if (session?.id && session?.current?.type === 'vocabulary_in_context') {
      void fetchStepPhrases(session.id, session.current.id);
    }
  }, [session?.id, session?.current?.id, session?.current?.type, fetchStepPhrases]);

  const handleTogglePhraseSelect = (index: number) => {
    setSelectedPhraseIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleSelectAllPhrases = () => {
    const unsaved = phraseItems.filter((it) => !it.saved).map((it) => it.phrase_index);
    setSelectedPhraseIndexes(unsaved);
  };

  const handleDeselectAllPhrases = () => {
    setSelectedPhraseIndexes([]);
  };

  const handleSavePhrases = async () => {
    if (!session || !session.current || savingPhrases || selectedPhraseIndexes.length === 0) return;
    const currentSessionId = session.id;
    const stepId = session.current.id;
    setSavingPhrases(true);
    setPhraseSaveError(null);
    try {
      const res = await api.saveLearningStepPhrases(currentSessionId, stepId, selectedPhraseIndexes);
      if (!isMountedRef.current || sessionIdRef.current !== currentSessionId) return;
      setPhraseItems(res.items);
      setPhraseLibrary(res.library);
      setPhraseSaveResult({
        addedCount: res.added_count,
        linkedCount: res.linked_count,
        reusedCount: res.reused_count,
        alreadySavedCount: res.already_saved_count
      });
      // Filter out newly saved indexes from selection
      setSelectedPhraseIndexes((prev) =>
        prev.filter((idx) => !res.items.find((it) => it.phrase_index === idx && it.saved))
      );
      // Refresh SRS badge in sidebar/layout
      window.dispatchEvent(new CustomEvent('openquiz:srs-updated'));
    } catch (err: any) {
      if (!isMountedRef.current || sessionIdRef.current !== currentSessionId) return;
      const code = err.error?.code;
      const msg = err.error?.message || err.message || 'Không thể lưu cụm từ vào lúc này.';
      if (code === 'PHRASE_COLLECTION_CHANGED') {
        setPhraseSaveError('Bộ cụm từ đã thay đổi quyền truy cập. Hãy đặt lại chế độ riêng tư (Private) trong cài đặt bộ thẻ trước khi lưu thêm.');
      } else if (code === 'PHRASE_LINK_CHANGED') {
        setPhraseSaveError('Cụm từ đã lưu nằm trong bộ có quyền truy cập khác. Hãy kiểm tra lại bộ thẻ.');
      } else {
        setPhraseSaveError(msg);
      }
    } finally {
      if (isMountedRef.current && sessionIdRef.current === currentSessionId) {
        setSavingPhrases(false);
      }
    }
  };

  const formatReviewDateTime = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  // Initialize inputs when step changes
  const initializeStepStates = (current: LearningCurrentStep | null) => {
    currentSubmissionIdRef.current = crypto.randomUUID();
    setAiFeedbackError(null);
    setAudioReviewError(null);
    audioReviewSubmissionIdRef.current = crypto.randomUUID();
    assistanceUsedRef.current.clear();
    setShowTranscript(false);
    setShowTranslation(false);
    setShowModel(false);
    revokeRecordedAudio();
    setRecordedAudioUrl(null);
    setRecordedBlob(null);
    recordedBlobRef.current = null;
    setIsRecording(false);
    setPhraseSaveResult(null);
    setPhraseSaveError(null);

    if (!current) return;

    if (current.draft) {
      if (current.response_schema === 'choice') {
        setSelectedOption(current.draft.option_id ?? null);
      } else if (current.response_schema === 'text') {
        setTextInput(current.draft.text ?? '');
        setSelfReviewed(current.draft.self_reviewed ?? false);
      } else {
        setAcknowledged(current.draft.acknowledged ?? false);
        setReflectionText(current.draft.reflection ?? '');
      }
    } else {
      setSelectedOption(null);
      setTextInput('');
      setSelfReviewed(false);
      setAcknowledged(false);
      setReflectionText('');
    }
  };

  // Trigger confetti if completed
  useEffect(() => {
    if (session?.status === 'completed') {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    }
  }, [session?.status]);

  // Audio playback controls
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // Keyboard controls:
  // - Enter: submit if ready, or advance if feedback is shown
  // - Single Ctrl: play audio
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Single Ctrl (not Ctrl+C, Ctrl+V, etc.)
      if (e.key === 'Control' && !e.altKey && !e.shiftKey && !e.metaKey) {
        togglePlayAudio();
        return;
      }

      if (e.key === 'Enter') {
        // Do not trigger if inside multiline textarea unless Ctrl+Enter
        if (e.target instanceof HTMLTextAreaElement && !e.ctrlKey) {
          return;
        }

        if (session?.current?.feedback) {
          void handleAdvance();
        } else if (isSubmitReady()) {
          void handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, selectedOption, textInput, selfReviewed, acknowledged]);

  // Audio Recording feature for speaking/pronunciation self-check
  const startRecording = async () => {
    try {
      revokeRecordedAudio();
      setRecordedAudioUrl(null);
      setRecordedBlob(null);
      recordedBlobRef.current = null;
      setAudioReviewError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        recordingStreamRef.current = null;
        if (!isMountedRef.current) return;
        revokeRecordedAudio();
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        recordedBlobRef.current = blob;
        setRecordedBlob(blob);
        audioReviewSubmissionIdRef.current = crypto.randomUUID();
        setAudioReviewError(null);
        const url = URL.createObjectURL(blob);
        recordedAudioUrlRef.current = url;
        setRecordedAudioUrl(url);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((t) => t.stop());
        recordingStreamRef.current = null;
      }
      setIsRecording(false);
      alert('Không thể truy cập microphone. Vui lòng cấp quyền trong trình duyệt.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      setIsRecording(false);
    }
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((t) => t.stop());
      recordingStreamRef.current = null;
    }
  };

  // Assistance logging
  const toggleAssistance = (type: 'transcript' | 'translation' | 'model') => {
    if (type === 'transcript') {
      setShowTranscript((prev) => !prev);
      assistanceUsedRef.current.add('transcript');
    } else if (type === 'translation') {
      setShowTranslation((prev) => !prev);
      assistanceUsedRef.current.add('translation');
    } else if (type === 'model') {
      setShowModel((prev) => !prev);
      assistanceUsedRef.current.add('model');
    }
  };

  // Draft autosave with debounce
  const draftTimer = useRef<number | null>(null);
  const queueDraftSave = (responseObj: any) => {
    if (!session || !session.current || session.current.feedback) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);

    draftTimer.current = window.setTimeout(async () => {
      setSavingDraft(true);
      try {
        const updated = await api.saveLearningDraft(session.id, {
          step_id: session.current!.id,
          revision: session.revision,
          response: responseObj,
        });
        setSession(updated);
      } catch (err: any) {
        if (err.status === 409) {
          // Re-fetch to synchronize revision without wiping local inputs
          await fetchSession();
        }
      } finally {
        setSavingDraft(false);
      }
    }, 600);
  };

  // Submit step
  const isSubmitReady = () => {
    if (!session?.current) return false;
    const { response_schema } = session.current;
    if (response_schema === 'choice') return Boolean(selectedOption);
    if (response_schema === 'text') return Boolean(textInput.trim() && selfReviewed);
    if (response_schema === 'acknowledge') return true;
    if (response_schema === 'self_reflection') return true;
    return false;
  };

  const handleSubmit = async () => {
    if (!session || !session.current || submitting) return;
    setSubmitting(true);
    setError(null);

    let responsePayload: any = {};
    if (session.current.response_schema === 'choice') {
      responsePayload = { option_id: selectedOption };
    } else if (session.current.response_schema === 'text') {
      responsePayload = { text: textInput.trim(), self_reviewed: selfReviewed };
    } else if (session.current.response_schema === 'self_reflection') {
      responsePayload = { acknowledged: true, ...(reflectionText.trim() ? { reflection: reflectionText.trim() } : {}) };
    } else {
      responsePayload = { acknowledged: true };
    }

    const assistanceUsed = Array.from(assistanceUsedRef.current).slice(0, 3);

    try {
      const res = await api.submitLearningStep(session.id, {
        step_id: session.current.id,
        revision: session.revision,
        submission_id: currentSubmissionIdRef.current,
        response: responsePayload,
        assistance_used: assistanceUsed,
      });

      // Update session with new revision and feedback
      setSession(res.session);
    } catch (err: any) {
      if (err.status === 409 && err.error?.code === 'REVISION_CONFLICT') {
        setError('Phiên bị lệch trạng thái. Đang đồng bộ lại...');
        await fetchSession();
      } else {
        setError(err.message || 'Không thể nộp bước học. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Advance to next step
  const handleAdvance = async () => {
    if (!session || !session.current || advancing) return;
    setAdvancing(true);
    setError(null);

    try {
      const updated = await api.advanceLearningSession(session.id, {
        step_id: session.current.id,
        revision: session.revision,
      });
      setSession(updated);
      initializeStepStates(updated.current);
    } catch (err: any) {
      setError(err.message || 'Không thể chuyển tiếp bước học.');
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-semibold">Đang chuẩn bị phiên học V2...</p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="max-w-2xl mx-auto p-6 md:p-8 mt-12">
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-3xl text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-600 dark:text-rose-400 mx-auto" />
          <h3 className="font-bold text-slate-900 dark:text-white">Không thể kết nối phiên học</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => void fetchSession()}
              className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-2xl"
            >
              Thử lại
            </button>
            <button
              onClick={() => navigate('/today')}
              className="px-5 py-2.5 border rounded-2xl text-sm font-bold"
            >
              Về Hôm nay
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  // Render Completed Summary State
  if (session.status === 'completed' || !session.current) {
    const checkpoint = session.summary?.checkpoint;

    // Special Checkpoint Review Completion Card
    if (checkpoint) {
      const isPassed = checkpoint.passed;
      const unassistedMet = checkpoint.unassisted_correct >= checkpoint.minimum_correct;
      const hasRecommendations = checkpoint.recommended_lesson_ids && checkpoint.recommended_lesson_ids.length > 0;

      return (
        <div className="max-w-3xl mx-auto p-6 md:p-12 space-y-6 animate-fade-in pb-20">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
            {/* Header Icon & Status Badge */}
            <div className="text-center space-y-4">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner ${
                  isPassed
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-300'
                }`}
              >
                {isPassed ? (
                  <Award className="w-10 h-10 stroke-[2.2]" />
                ) : (
                  <RotateCcw className="w-10 h-10 stroke-[2.2]" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                      isPassed
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {isPassed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Đạt tiêu chí ôn chặng</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Nên ôn lại bài học</span>
                      </>
                    )}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    {session.title}
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                  {isPassed
                    ? `Chúc mừng! Bạn đã đạt tiêu chí ${session.title}`
                    : `Hoàn tất ${session.title} — Cần củng cố thêm`}
                </h1>

                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                  {isPassed
                    ? `Bạn đã hoàn tất ${session.total_steps} bước ôn tập và đạt chỉ số ghi nhớ độc lập tốt (${checkpoint.unassisted_correct}/${checkpoint.graded_total} câu đúng không dùng trợ giúp, tiêu chuẩn tối thiểu: ${checkpoint.minimum_correct}/${checkpoint.graded_total}).`
                    : `Bạn đã làm xong toàn bộ câu hỏi ôn chặng. Cần tối thiểu ${checkpoint.minimum_correct}/${checkpoint.graded_total} câu đúng độc lập để đạt tiêu chí ôn chặng (Hiện đạt: ${checkpoint.unassisted_correct}/${checkpoint.graded_total} câu tự nhớ không hỗ trợ).`}
                </p>
              </div>
            </div>

            {/* Checkpoint Detailed Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-center space-y-1">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {checkpoint.correct} / {checkpoint.graded_total}
                </div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Tổng câu đúng
                </div>
                <div className="text-[10px] text-slate-400">
                  Gồm cả có hỗ trợ
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl border text-center space-y-1 ${
                  unassistedMet
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                }`}
              >
                <div
                  className={`text-2xl font-black ${
                    unassistedMet
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {checkpoint.unassisted_correct} / {checkpoint.graded_total}
                </div>
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Đúng không hỗ trợ
                </div>
                <div className="text-[10px] font-semibold text-slate-500">
                  Chuẩn đạt: ≥ {checkpoint.minimum_correct} câu
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-center space-y-1">
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {session.summary?.open_tasks ?? 0}
                </div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Nói / Viết tự luyện
                </div>
                <div className="text-[10px] text-slate-400">
                  Tự đối chiếu rubric
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-center space-y-1">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {session.total_steps} / {session.total_steps}
                </div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Bước hoàn thành
                </div>
                <div className="text-[10px] text-slate-400">
                  Đã lưu bằng chứng
                </div>
              </div>
            </div>

            {/* Scope & Assessment Transparency Note */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Tiêu chí ôn chặng:
                </span>{' '}
                Yêu cầu ít nhất {checkpoint.minimum_correct}/{checkpoint.graded_total} câu đúng tự nhớ (không dùng gợi ý/transcript/dịch). Đây là chỉ số rèn luyện nội bộ hướng dẫn lộ trình học, không quy đổi thành điểm CEFR hay chứng chỉ. Phần nói và viết là tự luyện có rubric, không chấm điểm AI tự động.
              </div>
            </div>

            {/* Recommended Review Lessons */}
            {hasRecommendations && (
              <div className="space-y-3 pt-2 text-left">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                    Bài học đề xuất ôn lại ({checkpoint.recommended_lesson_ids.length} bài)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dựa trên các câu bạn trả lời sai hoặc cần dùng trợ giúp trong đợt ôn này, hệ thống đề xuất ôn củng cố các bài sau:
                </p>

                <div className="space-y-2.5">
                  {checkpoint.recommended_lesson_ids.map((recId) => {
                    const lessonTitle = programLessonMap[recId] || recId;
                    const isStartingThis = startingReviewLessonId === recId;

                    return (
                      <div
                        key={recId}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              Cần củng cố
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {recId}
                            </span>
                          </div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            {lessonTitle}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={Boolean(startingReviewLessonId)}
                          onClick={() => void handleStartReviewLesson(recId)}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shrink-0 shadow-xs"
                        >
                          {isStartingThis ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang mở bài...</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>Ôn bài này</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/today')}
                className="w-full sm:w-auto px-7 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-sm rounded-2xl hover:opacity-90 transition shadow-md flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Về trang Hôm nay</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/my-program')}
                className="w-full sm:w-auto px-6 py-3.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm text-slate-700 dark:text-slate-300 rounded-2xl transition"
              >
                Xem Lộ trình của tôi
              </button>
              {checkpoint.correct < checkpoint.graded_total && (
                <button
                  type="button"
                  onClick={() => navigate('/mistakes')}
                  className="w-full sm:w-auto px-6 py-3.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/80 font-bold text-sm rounded-2xl transition flex items-center justify-center gap-1.5"
                >
                  <BookX className="w-4 h-4" />
                  <span>Xem trong Sổ lỗi</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Standard Lesson Completion Card
    return (
      <div className="max-w-3xl mx-auto p-6 md:p-12 space-y-8 animate-fade-in">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-xl">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto shadow-inner">
            <Trophy className="w-10 h-10 stroke-[2.2]" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
              Bài học hoàn tất
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              Chúc mừng! Bạn đã hoàn thành {session.title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
              Toàn bộ {session.total_steps} bước thực hành đa kỹ năng đã được lưu trữ thành công vào tiến trình học tập của bạn.
            </p>
          </div>

          {/* Graded & Task Score Box */}
          {session.summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {session.summary.graded_correct} / {session.summary.graded_total}
                </div>
                <div className="text-[11px] font-bold text-slate-400 uppercase mt-0.5">
                  Câu hỏi kiểm tra
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {session.summary.open_tasks}
                </div>
                <div className="text-[11px] font-bold text-slate-400 uppercase mt-0.5">
                  Hoạt động tự luyện
                </div>
              </div>

              <div className="col-span-2 md:col-span-1 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {session.total_steps} / {session.total_steps}
                </div>
                <div className="text-[11px] font-bold text-slate-400 uppercase mt-0.5">
                  Bước hoàn thành
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/today')}
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-sm rounded-2xl hover:opacity-90 transition shadow-md flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Về trang Hôm nay</span>
            </button>
            <button
              onClick={() => navigate('/my-program')}
              className="w-full sm:w-auto px-6 py-3.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm text-slate-700 dark:text-slate-300 rounded-2xl transition"
            >
              Xem Lộ trình của tôi
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentStep = session.current;
  const isFeedback = Boolean(currentStep.feedback);
  const feedback = currentStep.feedback;

  // Step types localized labels
  const stepTypeLabels: Record<string, string> = {
    listen_comprehension: 'Nghe hiểu',
    vocabulary_in_context: 'Từ vựng ngữ cảnh',
    grammar_practice: 'Ngữ pháp',
    pronunciation_practice: 'Phát âm',
    speaking_task: 'Nói & Giao tiếp',
    writing_task: 'Luyện viết',
    reflection: 'Tổng kết & Ghi nhớ',
    reading_comprehension: 'Đọc hiểu',
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-28">
      {/* Hidden Native Audio Element (Range 206 supported WAV from BE) */}
      {session.media?.url && (
        <audio
          ref={audioRef}
          src={session.media.url}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* Top Header & Step Progress Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/today')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Thoát bài học</span>
          </button>

          <div className="flex items-center gap-3">
            {savingDraft && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Đang lưu...</span>
              </span>
            )}
            <span className="text-xs font-black text-slate-900 dark:text-white">
              Bước {session.cursor + 1} / {session.total_steps}
            </span>
          </div>
        </div>

        {/* Step dots progress indicator */}
        <div className="space-y-2">
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
              style={{
                width: `${((session.cursor + (isFeedback ? 1 : 0.5)) / session.total_steps) * 100}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
              {stepTypeLabels[currentStep.type] || currentStep.title}
            </span>
            <span className="truncate max-w-[200px] text-right">
              {session.title}
            </span>
          </div>
        </div>
      </div>

      {/* Main Study Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
        {/* Step Header */}
        <div className="space-y-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
              {currentStep.title}
            </h2>

            {/* Audio Quick Play Widget */}
            {session.media && (
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/70 p-1.5 rounded-2xl shrink-0">
                <button
                  type="button"
                  onClick={togglePlayAudio}
                  title="Nghe âm thanh mẫu (Nhấn Ctrl)"
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-700 transition shadow-xs"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                  <span>{isPlaying ? 'Dừng' : 'Nghe audio'}</span>
                </button>

                {/* Speed buttons */}
                {[0.75, 1.0].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => handleRateChange(rate)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition ${
                      playbackRate === rate
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {currentStep.instruction && (
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 whitespace-pre-line leading-relaxed">
              {currentStep.instruction}
            </p>
          )}
        </div>

        {/* Support Folders: Transcript & Translation (Can be unfolded by learner) */}
        {(session.transcript || session.translation) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {session.transcript && (
                <button
                  type="button"
                  onClick={() => toggleAssistance('transcript')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{showTranscript ? 'Đóng Transcript' : 'Xem Transcript'}</span>
                  {showTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}

              {session.translation && (
                <button
                  type="button"
                  onClick={() => toggleAssistance('translation')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{showTranslation ? 'Đóng Bản dịch' : 'Xem Bản dịch'}</span>
                  {showTranslation ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>

            {/* Unfolded Transcript Box */}
            {showTranscript && session.transcript && (
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 text-xs md:text-sm text-indigo-950 dark:text-indigo-200 space-y-1">
                <span className="font-bold text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Transcript (Nội dung bài nghe):
                </span>
                <p className="leading-relaxed">{session.transcript}</p>
              </div>
            )}

            {/* Unfolded Translation Box */}
            {showTranslation && session.translation && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/60 text-xs md:text-sm text-emerald-950 dark:text-emerald-200 space-y-1">
                <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Bản dịch tham khảo:
                </span>
                <p className="leading-relaxed">{session.translation}</p>
              </div>
            )}
          </div>
        )}

        {/* STEP RENDERERS */}
        {/* Type 1 & 3: Multiple Choice (listen_comprehension / grammar_practice) */}
        {(currentStep.response_schema === 'choice') && currentStep.options && (
          <div className="space-y-4">
            <p className="text-base md:text-lg font-extrabold text-slate-900 dark:text-white whitespace-pre-wrap leading-relaxed">
              {currentStep.prompt}
            </p>

            <div className="space-y-2.5">
              {currentStep.options.map((opt) => {
                const isSelected = selectedOption === opt.id;
                const isCorrectExpected = isFeedback && feedback?.expected_option_id === opt.id;
                const isWrongSelected = isFeedback && isSelected && !feedback?.correct;

                let borderClass = 'border-slate-200 dark:border-slate-800 hover:border-indigo-400';
                let bgClass = 'bg-slate-50/50 dark:bg-slate-800/40';

                if (isFeedback) {
                  if (isCorrectExpected) {
                    borderClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100';
                  } else if (isWrongSelected) {
                    borderClass = 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-100';
                  }
                } else if (isSelected) {
                  borderClass = 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40';
                }

                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      if (isFeedback) return;
                      setSelectedOption(opt.id);
                      queueDraftSave({ option_id: opt.id });
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${borderClass} ${bgClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                          isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {opt.id.toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {opt.text}
                      </span>
                    </div>

                    {isFeedback && isCorrectExpected && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                    {isFeedback && isWrongSelected && (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Type 2: Vocabulary in Context (vocabulary_in_context - PHRASE-01 / FE-PHRASE-01) */}
        {currentStep.type === 'vocabulary_in_context' && (
          <div className="space-y-5">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {currentStep.prompt}
            </p>

            {/* Phrases list / cards with selection & saved status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(phraseItems.length > 0
                ? phraseItems
                : (currentStep.phrases || []).map((p, i) => ({
                    phrase_index: i,
                    text: p.text,
                    translation: p.translation,
                    saved: false,
                    word_id: null,
                    set_id: null,
                    route: null
                  }))
              ).map((phrase) => {
                const isSelected = selectedPhraseIndexes.includes(phrase.phrase_index);
                const isSaved = phrase.saved;

                return (
                  <div
                    key={phrase.phrase_index}
                    onClick={() => {
                      if (!isSaved) {
                        handleTogglePhraseSelect(phrase.phrase_index);
                      }
                    }}
                    className={`p-4 rounded-2xl border transition-all space-y-2 select-none ${
                      isSaved
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80 cursor-default'
                        : isSelected
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 cursor-pointer shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 cursor-pointer hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-base font-black text-slate-900 dark:text-white">
                        {phrase.text}
                      </div>

                      {isSaved ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 shrink-0">
                          <BookmarkCheck className="w-3 h-3" />
                          <span>Đã lưu vào bộ thẻ</span>
                        </span>
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center text-white text-xs transition shrink-0 ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {phrase.translation}
                    </div>

                    {isSaved && phrase.route && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(phrase.route!);
                          }}
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Xem trong bộ thẻ</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Phrase collection save controls */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <BookmarkPlus className="w-4 h-4 text-indigo-600" />
                    <span>Lưu vào bộ ôn riêng & Hệ thống lặp lại SRS</span>
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Chủ động chọn cụm từ để ôn tập ngắt quãng. Dữ liệu lưu vào bộ thẻ cá nhân của bạn, không ảnh hưởng điểm bài học.
                  </p>
                </div>

                {/* Bulk action buttons */}
                {phraseItems.some((it) => !it.saved) && (
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSelectAllPhrases}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllPhrases}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 rounded-lg transition"
                    >
                      Bỏ chọn
                    </button>
                    <button
                      type="button"
                      disabled={savingPhrases || selectedPhraseIndexes.length === 0}
                      onClick={() => void handleSavePhrases()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                    >
                      {savingPhrases ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <>
                          <FolderPlus className="w-3.5 h-3.5" />
                          <span>Lưu vào bộ ôn ({selectedPhraseIndexes.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Success Result Banner */}
              {phraseSaveResult && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">
                      Đã lưu thành công {phraseSaveResult.addedCount} thẻ mới ({phraseSaveResult.linkedCount} liên kết cụm từ) vào bộ thẻ riêng.
                    </span>
                  </div>

                  {phraseLibrary && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {phraseLibrary.route && (
                        <button
                          type="button"
                          onClick={() => navigate(phraseLibrary.route!)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Mở bộ thẻ ({phraseLibrary.word_count} thẻ)</span>
                        </button>
                      )}
                      {phraseLibrary.review_route && (
                        <button
                          type="button"
                          onClick={() => navigate(phraseLibrary.review_route!)}
                          className="px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 font-bold text-[11px] flex items-center gap-1 transition"
                        >
                          <Repeat className="w-3 h-3" />
                          <span>Ôn tập SRS ({phraseLibrary.due_count} đến hạn)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Error Banner */}
              {phraseSaveError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{phraseSaveError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSavePhrases()}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold shrink-0 transition"
                  >
                    Thử lại
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-3 text-xs text-indigo-900 dark:text-indigo-300">
              <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Ghi nhớ ý nghĩa của từng cụm từ trên trước khi tiếp tục các bài tập vận dụng.</span>
            </div>
          </div>
        )}

        {/* Type 4: Pronunciation Practice (pronunciation_practice) */}
        {currentStep.type === 'pronunciation_practice' && (
          <div className="space-y-5">
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Cụm từ mục tiêu
              </span>
              <div className="text-2xl md:text-3xl font-black text-indigo-600 dark:text-indigo-400">
                "{currentStep.target}"
              </div>
              {currentStep.guidance && (
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
                  {currentStep.guidance}
                </p>
              )}
            </div>

            {/* In-browser audio recording & playback widget for learner's self practice */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-indigo-500" />
                  <span>Tự thu âm giọng của bạn để nghe lại</span>
                </span>
                <span className="text-[10px] text-slate-400">Lưu cục bộ tại máy</span>
              </div>

              <div className="flex items-center gap-3">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={() => void startRecording()}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Bấm để nói</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse transition"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Dừng ghi âm</span>
                  </button>
                )}

                {recordedAudioUrl && (
                  <audio src={recordedAudioUrl} controls className="h-8 max-w-[240px]" />
                )}
              </div>
            </div>

            {/* AI Audio Qualitative Review (AUDIO-01 / FE-AUDIO-01) */}
            {audioReviewsMap[currentStep.id] ? (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-teal-200 dark:border-teal-900/60 space-y-3.5 text-xs shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                        <span>Nhận xét phát âm từ AI</span>
                        {audioReviewsMap[currentStep.id].cached && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">
                            Đã lưu trong phiên
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {audioReviewsMap[currentStep.id].model ? `Mô hình: ${audioReviewsMap[currentStep.id].model}` : 'Mô hình AI'} • {formatReviewDateTime(audioReviewsMap[currentStep.id].created_at)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteAudioReview(audioReviewsMap[currentStep.id].id, currentStep.id)}
                    disabled={deletingAudioReviewId === audioReviewsMap[currentStep.id].id}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                    title="Xóa nhận xét này"
                  >
                    {deletingAudioReviewId === audioReviewsMap[currentStep.id].id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Target vs AI Transcript */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Câu mẫu:
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      "{audioReviewsMap[currentStep.id].target}"
                    </span>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    audioReviewsMap[currentStep.id].needs_clearer_recording
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                      : 'bg-teal-50/40 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/40'
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      AI nghe được từ bản thu:
                    </span>
                    {audioReviewsMap[currentStep.id].needs_clearer_recording ? (
                      <span className="font-semibold text-amber-700 dark:text-amber-300">
                        (Chưa nghe rõ — Hãy thu âm lại rõ ràng hơn ở nơi yên tĩnh)
                      </span>
                    ) : (
                      <span className="font-semibold text-teal-900 dark:text-teal-200">
                        "{audioReviewsMap[currentStep.id].transcript}"
                      </span>
                    )}
                  </div>
                </div>

                {/* Detailed Qualitative Feedback */}
                {audioReviewsMap[currentStep.id].feedback && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Nhận xét chi tiết:
                    </span>
                    <p className="font-medium text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                      {audioReviewsMap[currentStep.id].feedback}
                    </p>
                  </div>
                )}

                {/* Improvements List */}
                {audioReviewsMap[currentStep.id].improvements?.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                      Gợi ý cải thiện:
                    </span>
                    <ul className="space-y-1 text-slate-700 dark:text-slate-200">
                      {audioReviewsMap[currentStep.id].improvements.map((imp, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Disclaimer / Limitations */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 italic space-y-0.5">
                  <p>• Nhận xét định tính từ âm thanh thật, không cấp điểm số hoặc chứng chỉ phát âm chuẩn hóa.</p>
                  <p>• Dữ liệu âm thanh thô không được lưu trên máy chủ.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {recordedBlob && !isRecording && (
                  <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Nhận xét phát âm định tính bằng AI
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">Tùy chọn</span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Bản thu âm thật của bạn sẽ được gửi tới AI để phân tích và nhận xét định tính (không cấp điểm chuẩn hóa). Bạn có thể tiếp tục bài học mà không bắt buộc gửi nhận xét.
                    </p>

                    {audioCapability && !audioCapability.supported && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        Cổng AI hiện tại chưa hỗ trợ nhận xét audio. Bạn vẫn có thể tự luyện và nghe lại bản thu.
                      </p>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void handleRequestAudioReview(currentStep.id)}
                        disabled={
                          requestingAudioStepId === currentStep.id ||
                          Boolean(audioCapability && !audioCapability.supported)
                        }
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition shadow-xs"
                      >
                        {requestingAudioStepId === currentStep.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang gửi bản thu để AI nhận xét...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Gửi bản thu để AI nhận xét</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Banner for Audio Review */}
                {audioReviewError && audioReviewError.stepId === currentStep.id && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold">Chưa thể nhận xét bản thu:</span>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300">
                          {audioReviewError.message}
                        </p>
                        {audioReviewError.retryAfter && (
                          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            Vui lòng thử lại sau khoảng {Math.round(audioReviewError.retryAfter)} giây.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void handleRequestAudioReview(currentStep.id)}
                        disabled={requestingAudioStepId === currentStep.id}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Thử lại gửi bản thu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAudioReviewError(null)}
                        className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-[11px] transition"
                      >
                        Bỏ qua lỗi (tiếp tục tự luyện)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Type 5 & 6: Speaking & Writing Open Task (speaking_task / writing_task) */}
        {(currentStep.type === 'speaking_task' || currentStep.type === 'writing_task') && (
          <div className="space-y-5">
            <p className="text-base md:text-lg font-bold text-slate-900 dark:text-white whitespace-pre-line leading-relaxed">
              {currentStep.prompt}
            </p>

            {/* Model Sample Toggle */}
            {currentStep.model && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleAssistance('model')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showModel ? 'Ẩn câu mẫu tham khảo' : 'Xem câu mẫu tham khảo'}</span>
                </button>

                {showModel && (
                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-950 dark:text-indigo-200 whitespace-pre-line leading-relaxed">
                    <span className="font-bold text-[10px] uppercase tracking-wider block mb-1">Câu mẫu tham khảo:</span>
                    {currentStep.model}
                  </div>
                )}
              </div>
            )}

            {/* Text Input Area */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {currentStep.type === 'speaking_task'
                  ? 'Bản chép lời / câu bạn vừa nói:'
                  : 'Nội dung bài viết của bạn:'}
              </label>
              <textarea
                disabled={isFeedback}
                rows={4}
                value={textInput}
                onChange={(e) => {
                  setTextInput(e.target.value);
                  queueDraftSave({ text: e.target.value, self_reviewed: selfReviewed });
                }}
                placeholder={
                  currentStep.type === 'speaking_task'
                    ? 'Ví dụ: Hi, I am Linh. I am a student. I study computer science...'
                    : 'Nhập các câu theo yêu cầu đề bài...'
                }
                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Rubric criteria checklist */}
            {currentStep.rubric && currentStep.rubric.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Tiêu chí tự kiểm tra:
                </span>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                  {currentStep.rubric.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Self reviewed acknowledgement checkbox */}
            {!isFeedback && (
              <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <input
                  type="checkbox"
                  checked={selfReviewed}
                  onChange={(e) => {
                    setSelfReviewed(e.target.checked);
                    queueDraftSave({ text: textInput, self_reviewed: e.target.checked });
                  }}
                  className="w-4 h-4 rounded-md accent-indigo-600 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tôi đã đối chiếu tiêu chí và tự kiểm tra nội dung của mình
                </span>
              </label>
            )}
          </div>
        )}

        {/* Type 7: Reflection (reflection) */}
        {currentStep.type === 'reflection' && (
          <div className="space-y-4">
            <p className="text-base font-bold text-slate-900 dark:text-white whitespace-pre-line leading-relaxed">
              {currentStep.prompt}
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500">
                Ghi chú điều bạn muốn ôn lại (Tuỳ chọn):
              </label>
              <input
                type="text"
                disabled={isFeedback}
                value={reflectionText}
                onChange={(e) => {
                  setReflectionText(e.target.value);
                  queueDraftSave({ acknowledged: true, reflection: e.target.value });
                }}
                placeholder="Ví dụ: Tôi muốn ôn lại cách dùng 'I study' và từ 'university'..."
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Feedback Section (Shown after submitting) */}
        {isFeedback && feedback && (
          <div
            className={`p-5 rounded-2xl border-2 space-y-2 animate-fade-in ${
              feedback.assessment_status === 'graded'
                ? feedback.correct
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-100'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-100'
                : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 text-indigo-950 dark:text-indigo-100'
            }`}
          >
            <div className="flex items-center gap-2 font-extrabold text-sm">
              {feedback.assessment_status === 'graded' ? (
                feedback.correct ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Chính xác! Làm rất tốt.</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <span>Chưa chính xác. Hãy xem giải thích bên dưới:</span>
                  </>
                )
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  <span>Hoạt động tự luyện đã được lưu thành công.</span>
                </>
              )}
            </div>

            {feedback.explanation && (
              <p className="text-xs md:text-sm leading-relaxed pt-1">
                {feedback.explanation}
              </p>
            )}

            {feedback.message && (
              <p className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                {feedback.message}
              </p>
            )}

            {feedback.mistake_id && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/mistakes?id=${feedback.mistake_id}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-bold transition shadow-xs"
                >
                  <BookX className="w-3.5 h-3.5" />
                  <span>Xem trong Sổ lỗi</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Qualitative AI Feedback for Writing / Speaking Task (AI-01) */}
        {isFeedback && (currentStep.type === 'writing_task' || currentStep.type === 'speaking_task') && (
          <div className="space-y-3">
            {aiFeedbackMap[currentStep.id] ? (
              // Saved AI Feedback Panel
              <div className="p-5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-800/80 space-y-4 shadow-sm animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Nhận xét định tính từ AI</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
                          {aiFeedbackMap[currentStep.id].model}
                        </span>
                      </h4>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>
                          {aiFeedbackMap[currentStep.id].modality === 'speaking_transcript'
                            ? 'Nội dung nói (qua transcript)'
                            : 'Bài viết'}
                        </span>
                        <span>•</span>
                        <span>
                          {aiFeedbackMap[currentStep.id].cached
                            ? 'Lấy từ bộ nhớ đệm'
                            : 'Vừa nhận xét mới'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 italic">
                    Bản nộp gốc được giữ nguyên vẹn
                  </span>
                </div>

                {/* Scope Note */}
                <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 leading-relaxed">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Phạm vi nhận xét:</span> AI chỉ phân tích từ vựng, ngữ pháp và mức độ phù hợp với đề bài dựa trên văn bản đã nộp. Hệ thống không chấm điểm phần trăm, không nhận file âm thanh và không đánh giá phát âm.
                </div>

                {/* Summary */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Nhận xét tổng quan:
                  </span>
                  <p className="text-xs md:text-sm text-slate-900 dark:text-white font-medium leading-relaxed">
                    {aiFeedbackMap[currentStep.id].feedback.summary}
                  </p>
                </div>

                {/* Strengths */}
                {aiFeedbackMap[currentStep.id].feedback.strengths?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Điểm tốt đã làm được:
                    </span>
                    <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      {aiFeedbackMap[currentStep.id].feedback.strengths.map((str, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Corrections */}
                {aiFeedbackMap[currentStep.id].feedback.corrections?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Gợi ý sửa câu ({aiFeedbackMap[currentStep.id].feedback.corrections.length}):
                    </span>
                    <div className="space-y-2">
                      {aiFeedbackMap[currentStep.id].feedback.corrections.map((corr, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-1.5 text-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 font-mono text-xs">
                            <span className="text-rose-700 dark:text-rose-300 line-through bg-rose-100/60 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                              "{corr.original}"
                            </span>
                            <span className="text-slate-400 hidden sm:inline">→</span>
                            <span className="text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100/60 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                              "{corr.corrected}"
                            </span>
                          </div>
                          {corr.explanation && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                              {corr.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested reference response */}
                {aiFeedbackMap[currentStep.id].feedback.suggested_response && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Câu mẫu tham khảo (không thay thế bài nộp gốc):
                    </span>
                    <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed italic whitespace-pre-line">
                      "{aiFeedbackMap[currentStep.id].feedback.suggested_response}"
                    </div>
                  </div>
                )}

                {/* Next practice tips */}
                {aiFeedbackMap[currentStep.id].feedback.next_practice?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Gợi ý luyện tập thêm:
                    </span>
                    <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                      {aiFeedbackMap[currentStep.id].feedback.next_practice.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Limitations */}
                {aiFeedbackMap[currentStep.id].limitations?.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                    {aiFeedbackMap[currentStep.id].limitations.join('. ')}
                  </div>
                )}
              </div>
            ) : (
              // Call-to-action button to request AI review
              <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Nhận xét định tính từ AI</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Nhận xét chi tiết về ngữ pháp, từ vựng và gợi ý hoàn thiện cho bài làm vừa nộp.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={requestingAiStepId === currentStep.id}
                    onClick={() => void handleRequestAiFeedback(currentStep.id)}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs shrink-0"
                  >
                    {requestingAiStepId === currentStep.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang nhờ AI nhận xét...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Nhờ AI nhận xét bài đã nộp</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Error Banner when requesting AI feedback fails */}
                {aiFeedbackError && aiFeedbackError.stepId === currentStep.id && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fade-in">
                    <div className="space-y-0.5">
                      <p className="font-semibold">{aiFeedbackError.message}</p>
                      {aiFeedbackError.retryAfter ? (
                        <p className="text-[10px] text-amber-700 dark:text-amber-300">
                          Gemini đang giới hạn lượt gọi API (khoảng {aiFeedbackError.retryAfter} giây). Bạn vẫn có thể tiếp tục học bình thường mà không bị ảnh hưởng.
                        </p>
                      ) : (
                        <p className="text-[10px] text-amber-700 dark:text-amber-300">
                          Bạn vẫn có thể tiếp tục bước học kế tiếp mà không cần chờ AI.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRequestAiFeedback(currentStep.id)}
                      className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 font-bold text-[11px] rounded-lg transition shrink-0"
                    >
                      Thử lại
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <span className="text-xs text-slate-400 hidden sm:inline">
            {isFeedback ? 'Nhấn Enter để tiếp tục' : 'Nhấn Enter để kiểm tra'}
          </span>

          <div className="flex items-center gap-3 ml-auto w-full sm:w-auto">
            {isFeedback ? (
              <button
                type="button"
                disabled={advancing}
                onClick={() => void handleAdvance()}
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-sm rounded-2xl hover:opacity-90 transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {advancing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang chuyển...</span>
                  </>
                ) : (
                  <>
                    <span>Tiếp tục</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={!isSubmitReady() || submitting}
                onClick={() => void handleSubmit()}
                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang kiểm tra...</span>
                  </>
                ) : (
                  <span>
                    {currentStep.type === 'reflection'
                      ? 'Hoàn tất bài học'
                      : currentStep.response_schema === 'choice'
                      ? 'Kiểm tra đáp án'
                      : 'Lưu & Tiếp tục'}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

