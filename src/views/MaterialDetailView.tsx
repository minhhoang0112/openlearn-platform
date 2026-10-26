import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Clock,
  FileAudio,
  AlertCircle,
  Loader2,
  Trash2,
  Edit3,
  Repeat,
  Check,
  Eye,
  EyeOff,
  FastForward,
  Rewind,
  X,
  FileText,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  History,
  ListPlus,
  Send,
  Sparkles,
  BookOpen,
  Award,
  Plus,
  RefreshCw,
  Upload,
  Download,
  AlertTriangle
} from 'lucide-react';
import {
  api,
  LearningMaterialItem,
  LearningMaterialPlayback,
  LearningMaterialPlaybackPayload,
  LearningMaterialCue,
  LearningMaterialCuesResponse,
  DictationAttemptResult,
  DictationAttemptsResponse,
  SubtitleWarning,
  SubtitlePreviewImportResponse,
  SubtitleExportResponse
} from '../api/client';
import { useRouter } from '../context/RouterContext';
import { parseNavigationContext } from '../utils/navigationContext';

export const MaterialDetailView: React.FC = () => {
  const { path, navigate } = useRouter();
  const parentRoute = parseNavigationContext(path).from || '/materials';

  // Extract material id from route /materials/:id
  const materialId = path.replace(/^\/materials\//, '').split('/')[0].split('?')[0];

  const [material, setMaterial] = useState<LearningMaterialItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Top Tabs: 'overview' | 'dictation'
  const [activeMainTab, setActiveMainTab] = useState<'overview' | 'dictation'>('overview');

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioError, setAudioError] = useState<string | null>(null);

  // A-B Loop State
  const [loopStartMs, setLoopStartMs] = useState<number | null>(null);
  const [loopEndMs, setLoopEndMs] = useState<number | null>(null);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopError, setLoopError] = useState<string | null>(null);

  // Transcript & Translation visibility
  const [showTranscript, setShowTranscript] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);

  // Edit Metadata Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTranscript, setEditTranscript] = useState('');
  const [editTranslation, setEditTranslation] = useState('');
  const [editSourceNote, setEditSourceNote] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // -------------------------------------------------------------
  // MATERIAL-02: Cues & Dictation State
  // -------------------------------------------------------------
  const [dictationSubMode, setDictationSubMode] = useState<'practice' | 'editor' | 'history'>('practice');
  const [cues, setCues] = useState<LearningMaterialCue[]>([]);
  const [cuesRevision, setCuesRevision] = useState(0);
  const [loadingCues, setLoadingCues] = useState(false);
  const [cuesError, setCuesError] = useState<string | null>(null);

  // Dictation Active Practice
  const [activeCueIndex, setActiveCueIndex] = useState(0);
  const [dictationAnswer, setDictationAnswer] = useState('');
  const [revealedHint, setRevealedHint] = useState(false);
  const [submittingDictation, setSubmittingDictation] = useState(false);
  const [dictationResult, setDictationResult] = useState<DictationAttemptResult | null>(null);
  const [dictationSubmitError, setDictationSubmitError] = useState<string | null>(null);
  const currentSubmissionIdRef = useRef<string>(crypto.randomUUID());

  // Cue Editor Draft State
  const [editorCues, setEditorCues] = useState<LearningMaterialCue[]>([]);
  const [isSavingCues, setIsSavingCues] = useState(false);
  const [cuesSaveError, setCuesSaveError] = useState<string | null>(null);

  // Dictation History State
  const [historyItems, setHistoryItems] = useState<DictationAttemptResult[]>([]);
  const [historySummary, setHistorySummary] = useState<{ attempts: number; independent_correct: number; assisted: number; gave_up: number } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // -------------------------------------------------------------
  // MATERIAL-03: Subtitle Import & Export State
  // -------------------------------------------------------------
  const [showSubtitleImportModal, setShowSubtitleImportModal] = useState(false);
  const [subtitleFormat, setSubtitleFormat] = useState<'srt' | 'vtt'>('srt');
  const [subtitleContent, setSubtitleContent] = useState('');
  const [subtitleFileName, setSubtitleFileName] = useState('');
  const [isLoadingSubtitlePreview, setIsLoadingSubtitlePreview] = useState(false);
  const [subtitlePreviewData, setSubtitlePreviewData] = useState<SubtitlePreviewImportResponse | null>(null);
  const [subtitleImportError, setSubtitleImportError] = useState<string | null>(null);
  const [subtitleSuccessBanner, setSubtitleSuccessBanner] = useState<string | null>(null);
  const [isExportingSubtitles, setIsExportingSubtitles] = useState(false);
  const [subtitleExportError, setSubtitleExportError] = useState<string | null>(null);

  // Refs for safe async & optimistic locks
  const isMountedRef = useRef(true);
  const materialIdRef = useRef(materialId);
  const playbackRevisionRef = useRef(0);
  const materialRevisionRef = useRef(0);
  const cuesRevisionRef = useRef(0);

  // Playback queue & throttling refs (MATERIAL-01 player bug fixes)
  const isSavingPlaybackRef = useRef(false);
  const pendingPlaybackPatchRef = useRef<Partial<LearningMaterialPlaybackPayload> | null>(null);
  const lastPeriodicSaveSecRef = useRef<number>(0);
  const editorPreviewEndMsRef = useRef<number | null>(null);

  materialIdRef.current = materialId;

  // Cleanup on unmount or route switch
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        const pos = Math.round(audioRef.current.currentTime * 1000);
        // Best-effort save position on exit
        void api.updateLearningMaterialPlayback(materialIdRef.current, {
          revision: playbackRevisionRef.current,
          position_ms: pos
        }).catch(() => {});
        audioRef.current.src = '';
      }
    };
  }, [materialId]);

  // Load material details
  const fetchMaterial = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAudioError(null);
    try {
      const data = await api.getLearningMaterial(materialId);
      if (!isMountedRef.current || materialIdRef.current !== materialId) return;

      setMaterial(data);
      materialRevisionRef.current = data.revision;

      const pb = data.playback;
      playbackRevisionRef.current = pb.revision;
      setPlaybackRate(pb.rate || 1);
      setLoopStartMs(pb.loop_start_ms ?? null);
      setLoopEndMs(pb.loop_end_ms ?? null);
      setLoopEnabled(pb.loop_enabled ?? false);
      setShowTranscript(pb.show_transcript ?? true);

      // Populate edit fields
      setEditTitle(data.title);
      setEditTranscript(data.transcript || '');
      setEditTranslation(data.translation || '');
      setEditSourceNote(data.source_note || '');
    } catch (err: any) {
      if (!isMountedRef.current || materialIdRef.current !== materialId) return;
      setError(err?.message || 'Không thể tải thông tin học liệu');
    } finally {
      if (isMountedRef.current && materialIdRef.current === materialId) {
        setLoading(false);
      }
    }
  }, [materialId]);

  // Load material cues
  const fetchCues = useCallback(async () => {
    setLoadingCues(true);
    setCuesError(null);
    try {
      const res = await api.getMaterialCues(materialId);
      if (!isMountedRef.current || materialIdRef.current !== materialId) return;
      setCues(res.cues || []);
      setEditorCues(res.cues || []);
      setCuesRevision(res.revision);
      cuesRevisionRef.current = res.revision;
    } catch (err: any) {
      if (!isMountedRef.current || materialIdRef.current !== materialId) return;
      setCuesError(err?.message || 'Không thể tải danh sách mốc câu');
    } finally {
      if (isMountedRef.current && materialIdRef.current === materialId) {
        setLoadingCues(false);
      }
    }
  }, [materialId]);

  // Load dictation history
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await api.getMaterialDictationAttempts(materialId, { limit: 50 });
      if (!isMountedRef.current || materialIdRef.current !== materialId) return;
      setHistoryItems(res.items || []);
      setHistorySummary(res.summary);
    } catch {
      // Silent error for optional history
    } finally {
      if (isMountedRef.current && materialIdRef.current === materialId) {
        setLoadingHistory(false);
      }
    }
  }, [materialId]);

  useEffect(() => {
    void fetchMaterial();
    void fetchCues();
  }, [fetchMaterial, fetchCues]);

  useEffect(() => {
    if (activeMainTab === 'dictation' && dictationSubMode === 'history') {
      void fetchHistory();
    }
  }, [activeMainTab, dictationSubMode, fetchHistory]);

  // -------------------------------------------------------------
  // MATERIAL-01 FIX: Robust Playback Save Queue with 409 Retry
  // -------------------------------------------------------------
  const executeSavePlayback = useCallback(async () => {
    if (!materialIdRef.current || isSavingPlaybackRef.current) return;
    const currentId = materialIdRef.current;

    isSavingPlaybackRef.current = true;
    try {
      while (pendingPlaybackPatchRef.current !== null && isMountedRef.current && materialIdRef.current === currentId) {
        const patch = pendingPlaybackPatchRef.current;
        pendingPlaybackPatchRef.current = null;

        const posMs = patch.position_ms ?? Math.round(audioRef.current ? audioRef.current.currentTime * 1000 : currentTimeSec * 1000);
        const rateVal = patch.rate ?? playbackRate;
        const startMs = patch.loop_start_ms !== undefined ? patch.loop_start_ms : loopStartMs;
        const endMs = patch.loop_end_ms !== undefined ? patch.loop_end_ms : loopEndMs;
        const isLoop = patch.loop_enabled !== undefined ? patch.loop_enabled : loopEnabled;
        const isShowTrans = patch.show_transcript !== undefined ? patch.show_transcript : showTranscript;

        // Ensure loop marks are strictly valid pair or both null (Fix Point A without Point B 400 error)
        const hasValidLoop = startMs !== null && endMs !== null && endMs - startMs >= 200;
        const safeStartMs = hasValidLoop ? startMs : null;
        const safeEndMs = hasValidLoop ? endMs : null;
        const safeLoopEnabled = hasValidLoop ? isLoop : false;

        const payload: LearningMaterialPlaybackPayload = {
          revision: playbackRevisionRef.current,
          position_ms: posMs,
          rate: rateVal,
          loop_start_ms: safeStartMs,
          loop_end_ms: safeEndMs,
          loop_enabled: safeLoopEnabled,
          show_transcript: isShowTrans
        };

        try {
          const updated = await api.updateLearningMaterialPlayback(currentId, payload);
          if (isMountedRef.current && materialIdRef.current === currentId) {
            playbackRevisionRef.current = updated.revision;
          }
        } catch (err: any) {
          if (!isMountedRef.current || materialIdRef.current !== currentId) break;
          if (err?.status === 409 || err?.error?.code === 'REVISION_CONFLICT') {
            const serverRev = err?.error?.details?.revision;
            if (typeof serverRev === 'number') {
              playbackRevisionRef.current = serverRev;
              pendingPlaybackPatchRef.current = patch;
            } else {
              try {
                const fresh = await api.getLearningMaterial(currentId);
                playbackRevisionRef.current = fresh.playback.revision;
                pendingPlaybackPatchRef.current = patch;
              } catch {
                break;
              }
            }
          } else {
            break;
          }
        }
      }
    } finally {
      isSavingPlaybackRef.current = false;
    }
  }, [currentTimeSec, playbackRate, loopStartMs, loopEndMs, loopEnabled, showTranscript]);

  const queueSavePlayback = useCallback((patch?: Partial<LearningMaterialPlaybackPayload>) => {
    pendingPlaybackPatchRef.current = {
      ...(pendingPlaybackPatchRef.current || {}),
      ...(patch || {})
    };
    void executeSavePlayback();
  }, [executeSavePlayback]);

  // Audio Event Handlers
  const handleLoadedMetadata = () => {
    if (!audioRef.current || !material) return;
    const dur = audioRef.current.duration;
    if (Number.isFinite(dur) && dur > 0) {
      setDurationSec(dur);
    } else {
      setDurationSec(material.duration_ms / 1000);
    }

    // Apply saved rate
    audioRef.current.playbackRate = playbackRate;

    // Restore position if valid
    const initialPosSec = (material.playback?.position_ms || 0) / 1000;
    if (initialPosSec > 0 && initialPosSec < (dur || material.duration_ms / 1000)) {
      audioRef.current.currentTime = initialPosSec;
      setCurrentTimeSec(initialPosSec);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    setCurrentTimeSec(current);

    // MATERIAL-01 FIX: Periodic save every 5 seconds while playing
    if (isPlaying && Math.abs(current - lastPeriodicSaveSecRef.current) >= 5) {
      lastPeriodicSaveSecRef.current = current;
      queueSavePlayback({ position_ms: Math.round(current * 1000) });
    }

    // Stop editor preview if end point reached
    if (editorPreviewEndMsRef.current !== null && current >= editorPreviewEndMsRef.current / 1000) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      editorPreviewEndMsRef.current = null;
      return;
    }

    // Dictation Mode cue audio confinement
    if (activeMainTab === 'dictation' && dictationSubMode === 'practice' && cues.length > 0) {
      const activeCue = cues[activeCueIndex];
      if (activeCue) {
        const startSec = activeCue.start_ms / 1000;
        const endSec = activeCue.end_ms / 1000;
        if (current >= endSec) {
          audioRef.current.currentTime = startSec;
          if (isPlaying && !audioRef.current.paused) {
            audioRef.current.play().catch(() => {});
          } else {
            setIsPlaying(false);
          }
        }
        return;
      }
    }

    // Normal A-B Loop Logic: If enabled and passed B point, seek back to A
    if (loopEnabled && loopStartMs !== null && loopEndMs !== null) {
      const bSec = loopEndMs / 1000;
      const aSec = loopStartMs / 1000;
      if (current >= bSec) {
        audioRef.current.currentTime = aSec;
        audioRef.current.play().catch(() => {});
      }
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      queueSavePlayback({ position_ms: Math.round(audioRef.current.currentTime * 1000) });
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((e) => setAudioError('Không thể phát tệp âm thanh: ' + e.message));
    }
  };

  const handleSeek = (newSec: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = newSec;
    setCurrentTimeSec(newSec);
    queueSavePlayback({ position_ms: Math.round(newSec * 1000) });
  };

  const handleSkipSeconds = (delta: number) => {
    if (!audioRef.current) return;
    const maxDur = durationSec || (material?.duration_ms ? material.duration_ms / 1000 : 0);
    const target = Math.max(0, Math.min(maxDur, audioRef.current.currentTime + delta));
    audioRef.current.currentTime = target;
    setCurrentTimeSec(target);
    queueSavePlayback({ position_ms: Math.round(target * 1000) });
  };

  const handleRateChange = (newRate: number) => {
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
    queueSavePlayback({ rate: newRate });
  };

  // -------------------------------------------------------------
  // MATERIAL-01 FIX: Loop Point A / B setting without 400 error
  // -------------------------------------------------------------
  const handleSetPointA = () => {
    const currentMs = Math.round((audioRef.current?.currentTime ?? currentTimeSec) * 1000);
    setLoopStartMs(currentMs);
    setLoopError(null);

    // If Point B is already set and valid (>= A + 200ms), save pair
    if (loopEndMs !== null && loopEndMs - currentMs >= 200) {
      queueSavePlayback({ loop_start_ms: currentMs, loop_end_ms: loopEndMs, loop_enabled: loopEnabled });
    } else {
      // Point B is not set or invalid: Keep A in FE, but do NOT send solitary non-null A to BE
      setLoopEndMs(null);
      setLoopEnabled(false);
      queueSavePlayback({ loop_start_ms: null, loop_end_ms: null, loop_enabled: false });
    }
  };

  const handleSetPointB = () => {
    const currentMs = Math.round((audioRef.current?.currentTime ?? currentTimeSec) * 1000);
    if (loopStartMs === null) {
      setLoopError('Hãy đặt điểm A trước khi đặt điểm B');
      return;
    }

    if (currentMs - loopStartMs < 200) {
      setLoopError('Điểm B phải sau điểm A ít nhất 200 mili-giây');
      return;
    }

    setLoopEndMs(currentMs);
    setLoopError(null);
    setLoopEnabled(true);
    queueSavePlayback({ loop_start_ms: loopStartMs, loop_end_ms: currentMs, loop_enabled: true });
  };

  const handleClearLoop = () => {
    setLoopStartMs(null);
    setLoopEndMs(null);
    setLoopEnabled(false);
    setLoopError(null);
    queueSavePlayback({ loop_start_ms: null, loop_end_ms: null, loop_enabled: false });
  };

  const handleToggleLoop = () => {
    if (loopStartMs === null || loopEndMs === null) {
      setLoopError('Cần chọn cả điểm A và B để bật lặp đoạn');
      return;
    }
    const nextState = !loopEnabled;
    setLoopEnabled(nextState);
    setLoopError(null);
    queueSavePlayback({ loop_enabled: nextState });
  };

  const handleToggleTranscript = () => {
    const next = !showTranscript;
    setShowTranscript(next);
    queueSavePlayback({ show_transcript: next });
  };

  // -------------------------------------------------------------
  // MATERIAL-02: Dictation Practice Helpers
  // -------------------------------------------------------------
  const playCurrentCue = useCallback(() => {
    if (!audioRef.current || cues.length === 0) return;
    const cue = cues[activeCueIndex];
    if (!cue) return;
    audioRef.current.currentTime = cue.start_ms / 1000;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
  }, [cues, activeCueIndex]);

  const selectCueForPractice = (index: number) => {
    setActiveCueIndex(index);
    setDictationAnswer('');
    setRevealedHint(false);
    setDictationResult(null);
    setDictationSubmitError(null);
    currentSubmissionIdRef.current = crypto.randomUUID();
    setDictationSubMode('practice');

    const cue = cues[index];
    if (cue && audioRef.current) {
      audioRef.current.currentTime = cue.start_ms / 1000;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleNextCue = useCallback(() => {
    if (activeCueIndex < cues.length - 1) {
      selectCueForPractice(activeCueIndex + 1);
    }
  }, [activeCueIndex, cues.length]);

  const handleSubmitDictation = useCallback(async (giveUp = false) => {
    if (cues.length === 0 || submittingDictation) return;
    const cue = cues[activeCueIndex];
    if (!cue) return;

    if (!giveUp && !dictationAnswer.trim()) {
      setDictationSubmitError('Vui lòng gõ nội dung bạn nghe được hoặc bấm Tôi không biết.');
      return;
    }

    setSubmittingDictation(true);
    setDictationSubmitError(null);

    try {
      const res = await api.submitMaterialDictation(materialId, {
        submission_id: currentSubmissionIdRef.current,
        cues_revision: cuesRevision,
        cue_id: cue.id,
        answer: dictationAnswer.trim(),
        revealed: revealedHint,
        give_up: giveUp
      });

      if (!isMountedRef.current || materialIdRef.current !== materialId) return;
      setDictationResult(res);
      // Prepend to history
      setHistoryItems((prev) => [res, ...prev.filter((it) => it.submission_id !== res.submission_id)]);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      const msg = err?.error?.message || err?.message || 'Không thể gửi câu trả lời lúc này.';
      setDictationSubmitError(msg);
    } finally {
      if (isMountedRef.current) {
        setSubmittingDictation(false);
      }
    }
  }, [cues, activeCueIndex, submittingDictation, dictationAnswer, revealedHint, materialId, cuesRevision]);

  // Keyboard shortcut listener: Single Ctrl replays cue, Enter submits or continues
  useEffect(() => {
    if (activeMainTab !== 'dictation' || dictationSubMode !== 'practice' || showEditModal || showDeleteModal || showSubtitleImportModal) {
      return;
    }

    let ctrlPressedOnly = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        ctrlPressedOnly = true;
        return;
      }
      ctrlPressedOnly = false;

      if (e.key === 'Enter') {
        // In textarea, Enter without Ctrl or Shift submits if active
        if (dictationResult) {
          e.preventDefault();
          handleNextCue();
        } else if (!e.shiftKey && dictationAnswer.trim()) {
          e.preventDefault();
          void handleSubmitDictation(false);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        if (ctrlPressedOnly) {
          playCurrentCue();
        }
        ctrlPressedOnly = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [activeMainTab, dictationSubMode, showEditModal, showDeleteModal, showSubtitleImportModal, dictationResult, dictationAnswer, handleNextCue, handleSubmitDictation, playCurrentCue]);

  // -------------------------------------------------------------
  // MATERIAL-02: Cue Editor Management
  // -------------------------------------------------------------
  const handleAddEditorCue = () => {
    const lastCue = editorCues[editorCues.length - 1];
    let defaultStart = 0;
    let defaultEnd = 2000;

    if (lastCue) {
      defaultStart = lastCue.end_ms;
      defaultEnd = Math.min(material?.duration_ms || 3600000, defaultStart + 2500);
    } else if (loopStartMs !== null && loopEndMs !== null && loopEndMs - loopStartMs >= 200) {
      defaultStart = loopStartMs;
      defaultEnd = loopEndMs;
    }

    const newCue: LearningMaterialCue = {
      id: crypto.randomUUID(),
      start_ms: defaultStart,
      end_ms: defaultEnd,
      text: '',
      translation: ''
    };

    setEditorCues([...editorCues, newCue]);
  };

  const handleAddCueFromCurrentLoop = () => {
    if (loopStartMs === null || loopEndMs === null || loopEndMs - loopStartMs < 200) {
      return;
    }
    const newCue: LearningMaterialCue = {
      id: crypto.randomUUID(),
      start_ms: loopStartMs,
      end_ms: loopEndMs,
      text: '',
      translation: ''
    };
    setEditorCues([...editorCues, newCue]);
  };

  const handlePreviewEditorCue = (startMs: number, endMs: number) => {
    if (!audioRef.current) return;
    editorPreviewEndMsRef.current = endMs;
    audioRef.current.currentTime = startMs / 1000;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const handleRetryCurrentCue = () => {
    setDictationResult(null);
    setDictationAnswer('');
    setRevealedHint(false);
    setDictationSubmitError(null);
    currentSubmissionIdRef.current = crypto.randomUUID();
    playCurrentCue();
  };

  const handleUpdateEditorCue = (index: number, patch: Partial<LearningMaterialCue>) => {
    setEditorCues((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  };

  const handleDeleteEditorCue = (index: number) => {
    setEditorCues((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAllCues = async () => {
    if (isSavingCues) return;
    setCuesSaveError(null);

    if (editorCues.length > 200) {
      setCuesSaveError('Tối đa 200 câu cho mỗi học liệu.');
      return;
    }

    // Validate cues
    const maxDur = material?.duration_ms || 3600000;
    let prevEnd = 0;

    for (let i = 0; i < editorCues.length; i++) {
      const c = editorCues[i];
      if (!c.text.trim()) {
        setCuesSaveError(`Câu thứ ${i + 1} chưa có nội dung tiếng Anh.`);
        return;
      }
      if (c.start_ms < 0 || c.end_ms > maxDur) {
        setCuesSaveError(`Mốc thời gian câu thứ ${i + 1} vượt quá thời lượng bài nghe.`);
        return;
      }
      if (c.end_ms - c.start_ms < 200) {
        setCuesSaveError(`Thời lượng câu thứ ${i + 1} phải ít nhất 200ms.`);
        return;
      }
      if (c.start_ms < prevEnd) {
        setCuesSaveError(`Câu thứ ${i + 1} bị chồng lấn mốc thời gian với câu trước đó.`);
        return;
      }
      prevEnd = c.end_ms;
    }

    setIsSavingCues(true);
    try {
      const res = await api.updateMaterialCues(materialId, {
        revision: cuesRevisionRef.current,
        cues: editorCues
      });

      if (!isMountedRef.current || materialIdRef.current !== materialId) return;
      setCues(res.cues);
      setEditorCues(res.cues);
      setCuesRevision(res.revision);
      cuesRevisionRef.current = res.revision;
      setDictationSubMode('practice');
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (err?.status === 409 || err?.error?.code === 'REVISION_CONFLICT') {
        setCuesSaveError('Các mốc câu đã được cập nhật từ phiên khác. Hãy tải lại danh sách trước khi lưu.');
      } else {
        setCuesSaveError(err?.error?.message || err?.message || 'Không thể lưu danh sách câu lúc này.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsSavingCues(false);
      }
    }
  };

  // -------------------------------------------------------------
  // MATERIAL-03: Subtitle Import & Export Handlers
  // -------------------------------------------------------------
  const handleSubtitleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubtitleImportError(null);
    setSubtitlePreviewData(null);

    if (file.size > 500000) {
      setSubtitleImportError('Tệp phụ đề quá lớn (vui lòng chọn tệp dưới 200.000 ký tự).');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const text = decoder.decode(buffer);

      if (text.length > 200000) {
        setSubtitleImportError('Nội dung tệp vượt quá 200.000 ký tự.');
        return;
      }

      setSubtitleContent(text);
      setSubtitleFileName(file.name);

      // Auto-detect format based on filename or WEBVTT signature
      if (file.name.toLowerCase().endsWith('.vtt') || text.trim().startsWith('WEBVTT')) {
        setSubtitleFormat('vtt');
      } else {
        setSubtitleFormat('srt');
      }
    } catch {
      setSubtitleImportError('Tệp không đúng định dạng mã hóa UTF-8. Vui lòng lưu lại tệp với định dạng UTF-8 trước khi nhập.');
    }
  };

  const handlePreviewSubtitles = async () => {
    if (!subtitleContent.trim()) {
      setSubtitleImportError('Vui lòng chọn tệp phụ đề hoặc dán nội dung SRT / VTT.');
      return;
    }
    if (subtitleContent.length > 200000) {
      setSubtitleImportError('Nội dung phụ đề vượt quá 200.000 ký tự.');
      return;
    }

    setIsLoadingSubtitlePreview(true);
    setSubtitleImportError(null);
    try {
      const res = await api.previewMaterialSubtitles(materialId, {
        format: subtitleFormat,
        content: subtitleContent
      });
      if (!isMountedRef.current || materialIdRef.current !== materialId) return;
      setSubtitlePreviewData(res);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      const msg = err?.error?.message || err?.message || 'Không thể xem trước tệp phụ đề.';
      setSubtitleImportError(msg);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingSubtitlePreview(false);
      }
    }
  };

  const handleApplyImportedCues = () => {
    if (!subtitlePreviewData || subtitlePreviewData.cues.length === 0) return;

    // Apply previewed cues into editor draft
    setEditorCues(subtitlePreviewData.cues);
    // Base revision for subsequent atomic save
    cuesRevisionRef.current = subtitlePreviewData.revision;

    setShowSubtitleImportModal(false);
    setSubtitleContent('');
    setSubtitleFileName('');
    setSubtitlePreviewData(null);
    setSubtitleImportError(null);
    setSubtitleSuccessBanner(
      `Đã nạp ${subtitlePreviewData.cues.length} mốc câu từ tệp phụ đề vào bản nháp Editor. Bấm "Lưu toàn bộ mốc" để xác nhận lưu vào máy chủ.`
    );
  };

  const handleExportSubtitles = async (format: 'srt' | 'vtt') => {
    if (cues.length === 0 || isExportingSubtitles) return;
    setIsExportingSubtitles(true);
    setSubtitleExportError(null);
    setSubtitleSuccessBanner(null);

    try {
      const res = await api.exportMaterialSubtitles(materialId, format);
      if (!isMountedRef.current || materialIdRef.current !== materialId) return;

      const blob = new Blob([res.content], { type: res.mime_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename || `material-${materialId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSubtitleSuccessBanner(
        `Đã xuất tệp ${res.filename} (${res.cue_count} câu). Lưu ý: Tệp phụ đề chỉ chứa câu tiếng Anh và mốc thời gian, không bao gồm bản dịch tiếng Việt.`
      );
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setSubtitleExportError(err?.error?.message || err?.message || 'Không thể xuất tệp phụ đề lúc này.');
    } finally {
      if (isMountedRef.current) {
        setIsExportingSubtitles(false);
      }
    }
  };

  const getWarningDescription = (code: string) => {
    switch (code) {
      case 'MARKUP_REMOVED':
        return 'Đã loại bỏ các thẻ định dạng HTML/markup (như <b>, <i>, <v>) để giữ văn bản thuần túy.';
      case 'METADATA_BLOCK_IGNORED':
        return 'Đã bỏ qua các khối ghi chú NOTE hoặc khối STYLE không áp dụng.';
      case 'HEADER_METADATA_IGNORED':
        return 'Đã bỏ qua các thiết lập metadata ở đầu tệp WebVTT.';
      case 'CUE_SETTINGS_IGNORED':
        return 'Đã bỏ qua các thiết lập vị trí/tọa độ sau mốc thời gian.';
      default:
        return `Cảnh báo định dạng: ${code}`;
    }
  };

  // Edit Metadata Submission
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!material || isSavingEdit) return;

    if (!editTitle.trim()) {
      setEditError('Vui lòng nhập tiêu đề học liệu');
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);

    try {
      const res = await api.updateLearningMaterial(material.id, {
        revision: materialRevisionRef.current,
        title: editTitle.trim(),
        transcript: editTranscript,
        translation: editTranslation,
        source_note: editSourceNote
      });

      if (!isMountedRef.current || materialIdRef.current !== material.id) return;
      setMaterial(res);
      materialRevisionRef.current = res.revision;
      setShowEditModal(false);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      const msg = err?.error?.message || err?.message || 'Không thể lưu nội dung. Vui lòng thử lại.';
      setEditError(msg);
    } finally {
      if (isMountedRef.current) {
        setIsSavingEdit(false);
      }
    }
  };

  // Delete Material
  const handleDeleteConfirm = async () => {
    if (!material || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.deleteLearningMaterial(material.id);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      navigate(parentRoute);
    } catch (err: any) {
      alert(err?.message || 'Không thể xóa học liệu này');
      setIsDeleting(false);
    }
  };

  const formatTime = (sec: number) => {
    const totalSec = Math.max(0, Math.floor(sec));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-24 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs font-semibold">Đang tải học liệu...</p>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
            Không thể tải học liệu
          </h3>
          <p className="text-xs text-rose-700 dark:text-rose-300">
            {error || 'Học liệu không tồn tại hoặc bạn không có quyền truy cập.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(parentRoute)}
          className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const audioSourceUrl = material.audio_url || `/api/v1/learning/materials/${material.id}/audio`;
  const effectiveDuration = durationSec || (material.duration_ms / 1000);
  const currentCue = cues[activeCueIndex];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 pb-24">
      {/* Header & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => navigate(parentRoute)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Thư viện học liệu</span>
          </button>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{material.title}</span>
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
              {material.mime_type.replace('audio/', '')}
            </span>
            <span>•</span>
            <span>{formatFileSize(material.audio_bytes)}</span>
            <span>•</span>
            <span>{formatTime(effectiveDuration)}</span>
            {material.source_note && (
              <>
                <span>•</span>
                <span className="italic text-slate-500">Nguồn: {material.source_note}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition shadow-xs flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sửa thông tin</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
            title="Xóa học liệu"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hidden Native Audio Element */}
      <audio
        ref={audioRef}
        src={audioSourceUrl}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setAudioError('Trình duyệt không thể giải mã âm thanh từ nguồn máy chủ.')}
      />

      {/* Audio Error Banner */}
      {audioError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{audioError}</span>
        </div>
      )}

      {/* MAIN NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveMainTab('overview')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
            activeMainTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileAudio className="w-4 h-4" />
          <span>Trình phát & Toàn văn</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('dictation')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
            activeMainTab === 'dictation'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Luyện từng câu & Nghe chép</span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
            {cues.length} câu
          </span>
        </button>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: OVERVIEW & FULL AUDIO PLAYER                           */}
      {/* ============================================================= */}
      {activeMainTab === 'overview' && (
        <div className="space-y-8">
          {/* AUDIO PLAYER CARD */}
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl space-y-6 border border-indigo-900/40">
            {/* Scrubber & Timers */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={effectiveDuration || 100}
                  step={0.1}
                  value={currentTimeSec}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                />

                {/* Loop Segment Marker Overlay */}
                {loopStartMs !== null && loopEndMs !== null && effectiveDuration > 0 && (
                  <div
                    className="absolute top-0 h-2 bg-emerald-400/50 rounded-lg pointer-events-none"
                    style={{
                      left: `${(loopStartMs / 1000 / effectiveDuration) * 100}%`,
                      width: `${((loopEndMs - loopStartMs) / 1000 / effectiveDuration) * 100}%`
                    }}
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-indigo-200/80">
                <span>{formatTime(currentTimeSec)}</span>
                <span>{formatTime(effectiveDuration)}</span>
              </div>
            </div>

            {/* Transport & Control Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Speed Selector */}
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-2xl">
                {[0.5, 0.75, 0.9, 1.0, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => handleRateChange(speed)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition ${
                      playbackRate === speed
                        ? 'bg-white text-indigo-950 shadow-xs'
                        : 'text-indigo-200 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              {/* Core Transport Controls */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSkipSeconds(-5)}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
                  title="Lùi 5 giây"
                >
                  <Rewind className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handlePlayPause}
                  className="w-14 h-14 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center transition shadow-lg active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSkipSeconds(5)}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
                  title="Tua 5 giây"
                >
                  <FastForward className="w-4 h-4" />
                </button>
              </div>

              {/* Reset action */}
              <button
                type="button"
                onClick={() => handleSeek(0)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-indigo-200 hover:text-white transition flex items-center gap-1.5"
                title="Về đầu bài"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Về đầu</span>
              </button>
            </div>

            {/* A-B LOOP TOOLBAR */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-indigo-300 flex items-center gap-1">
                  <Repeat className="w-4 h-4" />
                  <span>Vòng lặp A–B:</span>
                </span>

                {/* Set Point A */}
                <button
                  type="button"
                  onClick={handleSetPointA}
                  className={`px-3 py-1.5 rounded-xl font-bold transition shadow-xs ${
                    loopStartMs !== null
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {loopStartMs !== null ? `Điểm A: ${formatTime(loopStartMs / 1000)}` : 'Đặt điểm A'}
                </button>

                {/* Set Point B */}
                <button
                  type="button"
                  onClick={handleSetPointB}
                  className={`px-3 py-1.5 rounded-xl font-bold transition shadow-xs ${
                    loopEndMs !== null
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {loopEndMs !== null ? `Điểm B: ${formatTime(loopEndMs / 1000)}` : 'Đặt điểm B'}
                </button>

                {/* Toggle Loop */}
                {(loopStartMs !== null && loopEndMs !== null) && (
                  <button
                    type="button"
                    onClick={handleToggleLoop}
                    className={`px-3.5 py-1.5 rounded-xl font-bold transition ${
                      loopEnabled
                        ? 'bg-indigo-500 text-white ring-2 ring-indigo-400/50'
                        : 'bg-white/10 hover:bg-white/20 text-indigo-200'
                    }`}
                  >
                    {loopEnabled ? 'Đang lặp A–B' : 'Bật lặp A–B'}
                  </button>
                )}

                {/* Clear Loop */}
                {(loopStartMs !== null || loopEndMs !== null) && (
                  <button
                    type="button"
                    onClick={handleClearLoop}
                    className="px-2.5 py-1.5 rounded-xl text-white/60 hover:text-white transition"
                  >
                    Xóa mốc
                  </button>
                )}
              </div>

              <div className="text-[11px] text-indigo-200/70 italic">
                Tự động lưu vị trí và mốc A–B
              </div>
            </div>

            {loopError && (
              <p className="text-xs text-amber-300 font-semibold flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{loopError}</span>
              </p>
            )}
          </div>

          {/* TRANSCRIPT & TRANSLATION SECTION */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Nội dung văn bản (Transcript & Dịch)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleTranscript}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
                >
                  {showTranscript ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showTranscript ? 'Ẩn Transcript' : 'Hiện Transcript'}</span>
                </button>
                {material.translation && (
                  <button
                    type="button"
                    onClick={() => setShowTranslation(!showTranslation)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
                  >
                    {showTranslation ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showTranslation ? 'Ẩn bản dịch' : 'Hiện bản dịch'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Transcript Panel */}
              {showTranscript && (
                <div className={`p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 ${!showTranslation || !material.translation ? 'md:col-span-2' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Văn bản tiếng Anh
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {material.transcript?.length || 0} ký tự
                    </span>
                  </div>
                  {material.transcript ? (
                    <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans select-text">
                      {material.transcript}
                    </p>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      Chưa có transcript cho học liệu này. Bấm "Sửa thông tin" để bổ sung văn bản.
                    </div>
                  )}
                </div>
              )}

              {/* Translation Panel */}
              {showTranslation && material.translation && (
                <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Bản dịch tiếng Việt
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {material.translation.length} ký tự
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-sans select-text">
                    {material.translation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: DICTATION & SENTENCE CUES                             */}
      {/* ============================================================= */}
      {activeMainTab === 'dictation' && (
        <div className="space-y-6">
          {/* Submode Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDictationSubMode('practice')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  dictationSubMode === 'practice'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Luyện nghe chép</span>
              </button>
              <button
                type="button"
                onClick={() => setDictationSubMode('editor')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  dictationSubMode === 'editor'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ListPlus className="w-4 h-4" />
                <span>Quản lý mốc câu</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-bold">
                  {editorCues.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDictationSubMode('history')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  dictationSubMode === 'history'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Lịch sử nghe chép</span>
                {historySummary && historySummary.attempts > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                    {historySummary.attempts}
                  </span>
                )}
              </button>
            </div>

            <div className="text-[11px] text-slate-400 px-2 italic hidden sm:block">
              {dictationSubMode === 'practice' && 'Nghe câu, gõ và kiểm tra độ chính xác từng từ'}
              {dictationSubMode === 'editor' && 'Tự chia mốc A-B từ audio thật (không dùng AI tự động)'}
              {dictationSubMode === 'history' && 'Lịch sử lưu giữ nguyên vẹn câu gốc tại thời điểm làm'}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SUBMODE 1: PRACTICE                                           */}
          {/* ------------------------------------------------------------- */}
          {dictationSubMode === 'practice' && (
            cues.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 mx-auto flex items-center justify-center">
                  <ListPlus className="w-7 h-7" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Chưa có mốc câu để luyện tập
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Học liệu này chưa được tạo danh sách câu. Bạn có thể tự định nghĩa các mốc câu A–B từ âm thanh thật để bắt đầu luyện nghe chép.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDictationSubMode('editor')}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo danh sách mốc câu</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Cue Navigation & Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-black">
                      Câu {activeCueIndex + 1} / {cues.length}
                    </span>
                    {currentCue && (
                      <span className="text-xs font-mono text-slate-400">
                        [{formatTime(currentCue.start_ms / 1000)} - {formatTime(currentCue.end_ms / 1000)}]
                      </span>
                    )}
                  </div>

                  {/* Quick Cue Jump Buttons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
                    {cues.map((c, idx) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCueForPractice(idx)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition shrink-0 flex items-center justify-center ${
                          activeCueIndex === idx
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title={`Câu ${idx + 1}`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* MINI PLAYER FOR ACTIVE CUE */}
                <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!audioRef.current) return;
                          if (isPlaying) {
                            audioRef.current.pause();
                            setIsPlaying(false);
                          } else {
                            playCurrentCue();
                          }
                        }}
                        className="w-12 h-12 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center transition shadow-md active:scale-95"
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={playCurrentCue}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-indigo-200 hover:text-white transition flex items-center gap-1.5"
                        title="Nghe lại câu hiện tại (hoặc bấm phím Ctrl đơn)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Nghe lại</span>
                      </button>
                    </div>

                    {/* Speed Controls */}
                    <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
                      {[0.75, 0.9, 1.0, 1.25].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => handleRateChange(spd)}
                          className={`px-2 py-0.5 text-xs font-bold rounded-lg transition ${
                            playbackRate === spd
                              ? 'bg-white text-indigo-950'
                              : 'text-indigo-200 hover:text-white'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-[11px] text-indigo-200/80 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Phím tắt: Bấm phím <strong>Ctrl</strong> đơn để nghe lại • Bấm <strong>Enter</strong> để kiểm tra / tiếp tục</span>
                    </span>
                    <span>Tự động lặp đoạn câu</span>
                  </div>
                </div>

                {/* DICTATION INPUT BOX */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Nhập câu tiếng Anh bạn nghe được:</span>
                      {revealedHint && (
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Đã xem gợi ý (Lượt làm có trợ giúp)</span>
                        </span>
                      )}
                    </label>

                    <textarea
                      rows={3}
                      value={dictationAnswer}
                      onChange={(e) => setDictationAnswer(e.target.value)}
                      disabled={submittingDictation || dictationResult !== null}
                      placeholder="Gõ chính xác những từ bạn nghe được bằng tiếng Anh... (Bấm Enter để nộp bài)"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition disabled:opacity-75 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Hint / Revealed Box */}
                  {revealedHint && currentCue && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-300">
                        <span>Gợi ý câu mẫu (Transcript mốc này):</span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                          Đánh dấu trợ giúp (assisted)
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {currentCue.text}
                      </p>
                      {currentCue.translation && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                          Dịch: {currentCue.translation}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Error Banner */}
                  {dictationSubmitError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{dictationSubmitError}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    {/* Hint / View words */}
                    <div>
                      {!revealedHint && !dictationResult && (
                        <button
                          type="button"
                          onClick={() => setRevealedHint(true)}
                          disabled={submittingDictation}
                          className="px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-bold text-amber-700 dark:text-amber-300 transition flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem gợi ý / bản dịch</span>
                        </button>
                      )}
                    </div>

                    {/* Submit or Next */}
                    <div className="flex items-center gap-2">
                      {!dictationResult ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleSubmitDictation(true)}
                            disabled={submittingDictation}
                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition flex items-center gap-1.5"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Tôi không biết</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleSubmitDictation(false)}
                            disabled={submittingDictation || !dictationAnswer.trim()}
                            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {submittingDictation ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Đang chấm...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Kiểm tra</span>
                              </>
                            )}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={handleRetryCurrentCue}
                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Luyện lại câu này</span>
                          </button>

                          {activeCueIndex < cues.length - 1 ? (
                            <button
                              type="button"
                              onClick={handleNextCue}
                              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                            >
                              <span>Câu tiếp theo</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDictationSubMode('history')}
                              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                            >
                              <Award className="w-4 h-4" />
                              <span>Xem kết quả & Lịch sử</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* RESULT & TOKEN COMPARISON CARD */}
                {dictationResult && (
                  <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-5 animate-in fade-in duration-200">
                    {/* Status header banner */}
                    {dictationResult.independent_correct ? (
                      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                        <div>
                          <h4 className="text-sm font-black">Chính xác tuyệt đối!</h4>
                          <p className="text-xs text-emerald-700 dark:text-emerald-300">
                            Bạn đã nghe chép đúng toàn bộ câu độc lập mà không cần xem gợi ý.
                          </p>
                        </div>
                      </div>
                    ) : dictationResult.correct && dictationResult.assisted ? (
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 flex items-center gap-3">
                        <Sparkles className="w-6 h-6 text-amber-600 shrink-0" />
                        <div>
                          <h4 className="text-sm font-black">Chính xác (có trợ giúp)!</h4>
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            Bạn đã hoàn thành câu đúng sau khi mở xem gợi ý lời/bản dịch.
                          </p>
                        </div>
                      </div>
                    ) : dictationResult.gave_up ? (
                      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-3">
                        <HelpCircle className="w-6 h-6 text-slate-500 shrink-0" />
                        <div>
                          <h4 className="text-sm font-black">Đã ghi nhận bỏ qua</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Đừng lo lắng! Hãy quan sát kỹ câu chuẩn bên dưới để ghi nhớ từ vựng và cấu trúc.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 flex items-center gap-3">
                        <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                        <div>
                          <h4 className="text-sm font-black">Chưa hoàn toàn chính xác</h4>
                          <p className="text-xs text-rose-700 dark:text-rose-300">
                            Đối chiếu các từ khớp (xanh lá) và từ thiếu/sai (đỏ) dưới đây để rút kinh nghiệm.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Token Diff Details */}
                    <div className="space-y-4">
                      {/* Expected Sentence */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                          Câu chuẩn:
                        </span>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-sm leading-relaxed flex flex-wrap gap-1.5 items-center">
                          {dictationResult.expected_tokens?.map((tok, idx) => (
                            <span
                              key={idx}
                              className={`px-1.5 py-0.5 rounded text-xs font-bold transition ${
                                tok.matched
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 underline decoration-rose-500'
                              }`}
                            >
                              {tok.token}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* User's Answer Tokens (if not gave_up) */}
                      {!dictationResult.gave_up && dictationResult.answer_tokens && dictationResult.answer_tokens.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                            Từ bạn đã gõ:
                          </span>
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-sm leading-relaxed flex flex-wrap gap-1.5 items-center">
                            {dictationResult.answer_tokens.map((tok, idx) => (
                              <span
                                key={idx}
                                className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                                  tok.matched
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-rose-600 dark:text-rose-400 line-through decoration-rose-400'
                                }`}
                              >
                                {tok.token}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Translation if available */}
                      {dictationResult.cue?.translation && (
                        <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                          <span className="font-bold text-indigo-900 dark:text-indigo-300">Bản dịch tiếng Việt: </span>
                          <span className="text-slate-700 dark:text-slate-300">{dictationResult.cue.translation}</span>
                        </div>
                      )}
                    </div>

                    {/* Assessment transparency note */}
                    <div className="pt-2 text-[11px] text-slate-400 italic">
                      * Chấm điểm: So khớp từ chuẩn xác theo thứ tự, không phân biệt hoa thường và dấu câu; dấu nháy đơn (như I'm, don't) được bảo toàn.
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* ------------------------------------------------------------- */}
          {/* SUBMODE 2: EDITOR                                             */}
          {/* ------------------------------------------------------------- */}
          {dictationSubMode === 'editor' && (
            <div className="space-y-6">
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ListPlus className="w-5 h-5 text-indigo-600" />
                    <span>Quản lý mốc câu ({editorCues.length} câu)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mốc thời gian do bạn tự định nghĩa từ audio thật; không dùng AI tự động căn chỉnh mốc.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Export Subtitles Buttons (Only for saved cues) */}
                  {cues.length > 0 && (
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1.5 flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" />
                        <span>Xuất:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleExportSubtitles('srt')}
                        disabled={isExportingSubtitles}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition shadow-2xs"
                        title="Xuất mốc câu đã lưu sang định dạng SubRip (.srt)"
                      >
                        SRT
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleExportSubtitles('vtt')}
                        disabled={isExportingSubtitles}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition shadow-2xs"
                        title="Xuất mốc câu đã lưu sang định dạng WebVTT (.vtt)"
                      >
                        VTT
                      </button>
                    </div>
                  )}

                  {/* Import Subtitles Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubtitleImportModal(true);
                      setSubtitleImportError(null);
                      setSubtitlePreviewData(null);
                      setSubtitleContent('');
                      setSubtitleFileName('');
                    }}
                    className="px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition flex items-center gap-1.5"
                    title="Nhập mốc câu có sẵn từ tệp SRT hoặc WebVTT"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Nhập SRT/VTT</span>
                  </button>

                  {loopStartMs !== null && loopEndMs !== null && loopEndMs - loopStartMs >= 200 && (
                    <button
                      type="button"
                      onClick={handleAddCueFromCurrentLoop}
                      className="px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition flex items-center gap-1.5"
                      title="Tạo mốc câu từ đoạn A–B hiện tại trên player"
                    >
                      <Repeat className="w-3.5 h-3.5" />
                      <span>Thêm từ mốc A–B</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleAddEditorCue}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm câu mới</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAllCues}
                    disabled={isSavingCues}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSavingCues ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Lưu toàn bộ mốc</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Subtitle Success & Error Banners */}
              {subtitleSuccessBanner && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{subtitleSuccessBanner}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubtitleSuccessBanner(null)}
                    className="p-1 text-emerald-600 hover:text-emerald-800 rounded-lg transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {subtitleExportError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{subtitleExportError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubtitleExportError(null)}
                    className="p-1 text-rose-600 hover:text-rose-800 rounded-lg transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Save Error Banner */}
              {cuesSaveError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{cuesSaveError}</span>
                  </div>
                  {cuesSaveError.includes('xung đột') || cuesSaveError.includes('phiên khác') ? (
                    <button
                      type="button"
                      onClick={() => void fetchCues()}
                      className="px-3 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold"
                    >
                      Tải lại từ máy chủ
                    </button>
                  ) : null}
                </div>
              )}

              {/* Cues List */}
              {editorCues.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
                  <ListPlus className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500 font-semibold">
                    Danh sách mốc câu đang trống. Bấm "Thêm câu mới" hoặc "Thêm từ mốc A–B" để bắt đầu.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddEditorCue}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                  >
                    Thêm câu đầu tiên
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {editorCues.map((c, idx) => (
                    <div
                      key={c.id}
                      className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
                    >
                      {/* Card Top: Number, Preview, Set Loop, Delete */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            Câu #{idx + 1}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            [{formatTime(c.start_ms / 1000)} - {formatTime(c.end_ms / 1000)}] ({((c.end_ms - c.start_ms) / 1000).toFixed(1)}s)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handlePreviewEditorCue(c.start_ms, c.end_ms)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[11px] font-bold transition flex items-center gap-1"
                            title="Nghe thử đoạn này"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Nghe thử</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setLoopStartMs(c.start_ms);
                              setLoopEndMs(c.end_ms);
                              setLoopEnabled(true);
                              if (audioRef.current) audioRef.current.currentTime = c.start_ms / 1000;
                              queueSavePlayback({ loop_start_ms: c.start_ms, loop_end_ms: c.end_ms, loop_enabled: true });
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 text-[11px] font-bold transition flex items-center gap-1"
                            title="Đặt làm vòng lặp A-B trên player chính"
                          >
                            <Repeat className="w-3 h-3" />
                            <span>Gán A-B</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteEditorCue(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                            title="Xóa câu này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Timing Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                            <span>Bắt đầu (mili-giây):</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateEditorCue(idx, { start_ms: Math.round(currentTimeSec * 1000) })}
                              className="text-[10px] text-indigo-600 hover:underline font-normal"
                            >
                              Lấy vị trí hiện tại ({Math.round(currentTimeSec * 1000)}ms)
                            </button>
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={100}
                            value={c.start_ms}
                            onChange={(e) => handleUpdateEditorCue(idx, { start_ms: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                            <span>Kết thúc (mili-giây):</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateEditorCue(idx, { end_ms: Math.round(currentTimeSec * 1000) })}
                              className="text-[10px] text-indigo-600 hover:underline font-normal"
                            >
                              Lấy vị trí hiện tại ({Math.round(currentTimeSec * 1000)}ms)
                            </button>
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={100}
                            value={c.end_ms}
                            onChange={(e) => handleUpdateEditorCue(idx, { end_ms: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                          />
                        </div>
                      </div>

                      {/* English Text Input */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Nội dung tiếng Anh <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={2000}
                          placeholder="The server is online."
                          value={c.text}
                          onChange={(e) => handleUpdateEditorCue(idx, { text: e.target.value })}
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>

                      {/* Vietnamese Translation Input */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Bản dịch tiếng Việt (tùy chọn)
                        </label>
                        <input
                          type="text"
                          maxLength={2000}
                          placeholder="Máy chủ đang trực tuyến."
                          value={c.translation || ''}
                          onChange={(e) => handleUpdateEditorCue(idx, { translation: e.target.value })}
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* SUBMODE 3: HISTORY                                             */}
          {/* ------------------------------------------------------------- */}
          {dictationSubMode === 'history' && (
            <div className="space-y-6">
              {/* History Header & Summary Stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    <span>Lịch sử nghe chép ({historyItems.length} lượt)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lưu trữ chi tiết các lượt làm kèm snapshot mốc câu gốc tại thời điểm nộp.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void fetchHistory()}
                  disabled={loadingHistory}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                  <span>Làm mới</span>
                </button>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tổng lượt làm</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white">
                    {historySummary?.attempts || 0}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Đúng độc lập</span>
                  <p className="text-xl font-black text-emerald-600">
                    {historySummary?.independent_correct || 0}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-amber-600 uppercase">Có trợ giúp</span>
                  <p className="text-xl font-black text-amber-600">
                    {historySummary?.assisted || 0}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Bỏ qua</span>
                  <p className="text-xl font-black text-slate-600 dark:text-slate-400">
                    {historySummary?.gave_up || 0}
                  </p>
                </div>
              </div>

              {/* History Items List */}
              {loadingHistory ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <p className="text-xs">Đang tải lịch sử...</p>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  Chưa có lượt nghe chép nào cho học liệu này.
                </div>
              ) : (
                <div className="space-y-3">
                  {historyItems.map((item) => (
                    <div
                      key={item.submission_id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-slate-400 font-mono text-[11px]">
                          {new Date(item.created_at).toLocaleString('vi-VN')}
                        </span>

                        <div>
                          {item.independent_correct ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Đúng độc lập</span>
                            </span>
                          ) : item.correct && item.assisted ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              <span>Có trợ giúp</span>
                            </span>
                          ) : item.gave_up ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold flex items-center gap-1">
                              <HelpCircle className="w-3 h-3" />
                              <span>Bỏ qua</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              <span>Chưa đúng</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="font-bold text-slate-600 dark:text-slate-400">Câu gốc: </span>
                          <span className="font-semibold text-slate-900 dark:text-white">{item.cue.text}</span>
                        </div>
                        {!item.gave_up && (
                          <div>
                            <span className="font-bold text-slate-600 dark:text-slate-400">Bạn đã gõ: </span>
                            <span className="text-slate-800 dark:text-slate-200 font-mono">{item.answer}</span>
                          </div>
                        )}
                        {item.cue.translation && (
                          <div className="text-slate-500 dark:text-slate-400 italic">
                            Dịch: {item.cue.translation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Metadata Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <span>Chỉnh sửa thông tin học liệu</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                disabled={isSavingEdit}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tiêu đề <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Transcript tiếng Anh
                </label>
                <textarea
                  rows={4}
                  maxLength={80000}
                  value={editTranscript}
                  onChange={(e) => setEditTranscript(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Bản dịch tiếng Việt
                </label>
                <textarea
                  rows={3}
                  maxLength={80000}
                  value={editTranslation}
                  onChange={(e) => setEditTranslation(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Ghi chú nguồn
                </label>
                <input
                  type="text"
                  maxLength={2000}
                  value={editSourceNote}
                  onChange={(e) => setEditSourceNote(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || !editTitle.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu thay đổi</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Xác nhận xóa học liệu này?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tệp âm thanh, văn bản và toàn bộ mốc câu, lịch sử nghe chép sẽ bị xóa khỏi hệ thống. Thao tác này không thể hoàn tác.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa học liệu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtitle Import Modal */}
      {showSubtitleImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>Nhập mốc câu từ phụ đề SRT / WebVTT</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowSubtitleImportModal(false);
                  setSubtitlePreviewData(null);
                  setSubtitleImportError(null);
                }}
                disabled={isLoadingSubtitlePreview}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If Preview Data is not yet generated: Show file input & paste area */}
            {!subtitlePreviewData ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Trích xuất mốc câu tự động từ tệp phụ đề</span>
                  </p>
                  <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
                    Hỗ trợ tệp phụ đề UTF-8 (.srt hoặc .vtt). Hệ thống sẽ đọc trực tiếp mốc thời gian có sẵn từ tệp mà không gửi tới AI hoặc làm thay đổi cơ sở dữ liệu trước khi bạn xác nhận.
                  </p>
                </div>

                {/* Format selector */}
                <div className="flex items-center gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Định dạng phụ đề:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="subtitle_format"
                      value="srt"
                      checked={subtitleFormat === 'srt'}
                      onChange={() => setSubtitleFormat('srt')}
                      className="text-indigo-600 accent-indigo-600"
                    />
                    <span>SubRip (.srt)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="subtitle_format"
                      value="vtt"
                      checked={subtitleFormat === 'vtt'}
                      onChange={() => setSubtitleFormat('vtt')}
                      className="text-indigo-600 accent-indigo-600"
                    />
                    <span>WebVTT (.vtt)</span>
                  </label>
                </div>

                {/* File picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Chọn tệp phụ đề (.srt, .vtt)
                  </label>
                  <input
                    type="file"
                    accept=".srt,.vtt,text/plain,text/vtt"
                    onChange={handleSubtitleFileSelect}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-300"
                  />
                  {subtitleFileName && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Đã nạp tệp: {subtitleFileName}</span>
                    </p>
                  )}
                </div>

                {/* Raw content paste */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Hoặc dán trực tiếp nội dung phụ đề:</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {subtitleContent.length} / 200.000 ký tự
                    </span>
                  </label>
                  <textarea
                    rows={6}
                    maxLength={200000}
                    value={subtitleContent}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSubtitleContent(val);
                      if (val.trim().startsWith('WEBVTT')) {
                        setSubtitleFormat('vtt');
                      }
                    }}
                    placeholder={`1\n00:00:00,500 --> 00:00:02,000\nThe server is online.\n\n2\n00:00:02,500 --> 00:00:04,000\nPlease check the network.`}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white leading-relaxed resize-none"
                  />
                </div>

                {subtitleImportError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{subtitleImportError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubtitleImportModal(false);
                      setSubtitleImportError(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handlePreviewSubtitles}
                    disabled={isLoadingSubtitlePreview || !subtitleContent.trim()}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isLoadingSubtitlePreview ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang phân tích...</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem trước (Preview)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* If Preview Data is Ready: Show parsed cues & warnings */
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">
                      Trích xuất thành công {subtitlePreviewData.cues.length} câu ({subtitlePreviewData.format.toUpperCase()})
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Chưa lưu vào máy chủ
                  </span>
                </div>

                {/* Warnings Display */}
                {subtitlePreviewData.warnings && subtitlePreviewData.warnings.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs space-y-2">
                    <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Các cảnh báo khi xử lý định dạng ({subtitlePreviewData.warnings.length}):</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800 dark:text-amber-300">
                      {subtitlePreviewData.warnings.map((w, idx) => (
                        <li key={idx}>
                          <strong>{w.code}</strong> ({w.count} lần): {getWarningDescription(w.code)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Existing cues replacement caution */}
                {editorCues.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>
                      Lưu ý: Áp dụng sẽ thay thế <strong>{editorCues.length} câu</strong> hiện tại trong bản nháp Editor. Lịch sử nghe chép cũ vẫn giữ nguyên snapshot.
                    </span>
                  </div>
                )}

                {/* Parsed cues list */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-slate-400">
                    Danh sách câu xem trước:
                  </span>
                  <div className="max-h-60 overflow-y-auto space-y-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    {subtitlePreviewData.cues.map((c, idx) => (
                      <div
                        key={c.id || idx}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">Câu #{idx + 1}</span>
                          <span>[{formatTime(c.start_ms / 1000)} - {formatTime(c.end_ms / 1000)}]</span>
                        </div>
                        <p className="text-slate-900 dark:text-white font-medium whitespace-pre-line">
                          {c.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 italic">
                  * Mốc thời gian được trích xuất trực tiếp từ tệp phụ đề. Bạn có thể nghe thử và điều chỉnh mốc trong Editor trước khi bấm "Lưu toàn bộ mốc".
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSubtitlePreviewData(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl transition"
                  >
                    Quay lại sửa nội dung
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSubtitleImportModal(false);
                        setSubtitlePreviewData(null);
                        setSubtitleImportError(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl transition"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyImportedCues}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Xác nhận áp dụng vào Editor</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
