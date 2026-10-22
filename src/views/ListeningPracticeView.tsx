import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Volume2,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
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
  Repeat,
  FastForward,
  Trophy,
  Home,
  Sliders,
  Trash2
} from 'lucide-react';
import {
  api,
  ListeningSession,
  ListeningSentenceItem,
  ListeningSentenceResult
} from '../api/client';
import { useRouter } from '../context/RouterContext';

export const ListeningPracticeView: React.FC = () => {
  const { path, navigate } = useRouter();

  // Extract sessionId from path (/listening/practice/:id)
  const sessionIdMatch = path.match(/^\/listening\/practice\/([a-zA-Z0-9-]+)/);
  const sessionId = sessionIdMatch ? sessionIdMatch[1] : '';

  const [session, setSession] = useState<ListeningSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Visibility toggles
  const [showTranscript, setShowTranscript] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  // Local Voice Recording (MediaRecorder)
  const isMountedRef = useRef(true);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordedAudioUrlRef = useRef<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const revokeRecordedAudio = () => {
    if (recordedAudioUrlRef.current) {
      URL.revokeObjectURL(recordedAudioUrlRef.current);
      recordedAudioUrlRef.current = null;
    }
  };

  // Sentence completion input states
  const [repetitions, setRepetitions] = useState<number>(2);
  const [selfReviewed, setSelfReviewed] = useState(false);
  const [reflection, setReflection] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Idempotent retry tracker: keep UUID stable across retries for the same sentence & payload
  const submissionIdRef = useRef<string | null>(null);
  const lastSubmissionKeyRef = useRef<string | null>(null);

  // Restarting state
  const [restarting, setRestarting] = useState(false);

  // Fetch session
  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await api.getListeningSession(sessionId);
      setSession(data);
      if (data.current) {
        setRepetitions(data.settings?.target_repetitions || 2);
        setSelfReviewed(false);
        setReflection('');
        setShowTranscript(false);
        revokeRecordedAudio();
        setRecordedAudioUrl(null);
        setIsRecording(false);
        setAudioError(null);
        submissionIdRef.current = null;
        lastSubmissionKeyRef.current = null;
      }
    } catch (err) {
      setError((err as Error).message || 'Không thể tải phiên luyện nghe.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  // Clean up media streams and audio on unmount
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
    };
  }, []);

  // Update audio playback rate whenever session settings change
  useEffect(() => {
    if (audioRef.current && session?.settings?.rate) {
      audioRef.current.playbackRate = session.settings.rate;
    }
  }, [session?.settings?.rate, session?.current?.id]);

  // Reset audio & recording states when current sentence changes
  useEffect(() => {
    setAudioError(null);
    setShowTranscript(false);
    revokeRecordedAudio();
    setRecordedAudioUrl(null);
  }, [session?.current?.id]);

  // Audio control functions
  const togglePlayAudio = async () => {
    if (!audioRef.current) return;
    setAudioError(null);
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      try {
        await audioRef.current.play();
      } catch {
        setIsPlaying(false);
        setAudioError('Không thể phát âm thanh của câu này. Vui lòng bấm thử lại.');
      }
    }
  };

  const replayAudio = async () => {
    if (!audioRef.current) return;
    setAudioError(null);
    audioRef.current.currentTime = 0;
    try {
      await audioRef.current.play();
    } catch {
      setIsPlaying(false);
      setAudioError('Không thể phát lại âm thanh. Vui lòng bấm thử lại.');
    }
  };

  // Keyboard shortcut: Single Ctrl key to toggle audio play/pause
  useEffect(() => {
    let ctrlAlone = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' && !e.repeat) {
        ctrlAlone = !e.altKey && !e.shiftKey && !e.metaKey;
        return;
      }
      if (e.ctrlKey) {
        // Any other key pressed with Ctrl cancels single Ctrl (e.g. Ctrl+C/V/A)
        ctrlAlone = false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        const target = e.target as HTMLElement;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (ctrlAlone && !isInput && !isRecording) {
          void togglePlayAudio();
        }
        ctrlAlone = false;
      }
    };

    const handleBlur = () => {
      ctrlAlone = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isPlaying, isRecording]);

  // Local Voice Recording methods
  const startRecording = async () => {
    try {
      revokeRecordedAudio();
      setRecordedAudioUrl(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;

        if (!isMountedRef.current) {
          return;
        }

        revokeRecordedAudio();
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        recordedAudioUrlRef.current = url;
        setRecordedAudioUrl(url);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setError(null);
    } catch {
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
      }
      setIsRecording(false);
      setError('Không thể truy cập hoặc khởi tạo microphone trên trình duyệt.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      setIsRecording(false);
    }
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
  };

  const clearRecording = () => {
    revokeRecordedAudio();
    setRecordedAudioUrl(null);
  };

  // Handle sentence completion submit
  const handleCompleteSentence = async (skip = false) => {
    if (!session || !session.current || submitting) return;
    if (isRecording) {
      stopRecording();
    }
    setSubmitting(true);
    setError(null);

    // Keep submissionId stable across retries for the same sentence payload
    const submissionKey = `${session.current.id}:${skip}:${repetitions}:${selfReviewed}:${reflection.trim()}`;
    if (!submissionIdRef.current || lastSubmissionKeyRef.current !== submissionKey) {
      submissionIdRef.current = crypto.randomUUID();
      lastSubmissionKeyRef.current = submissionKey;
    }
    const submissionId = submissionIdRef.current;

    const payload = skip
      ? {
          revision: session.revision,
          submission_id: submissionId,
          skip: true
        }
      : {
          revision: session.revision,
          submission_id: submissionId,
          repetitions,
          self_reviewed: selfReviewed,
          reflection: reflection.trim() || undefined
        };

    try {
      const res = await api.completeListeningSentence(session.id, session.current.id, payload);
      setSession(res.session);

      // Submission succeeded: clear retry tracking
      submissionIdRef.current = null;
      lastSubmissionKeyRef.current = null;

      // Reset for next sentence
      if (res.session.current) {
        setRepetitions(res.session.settings?.target_repetitions || 2);
        setSelfReviewed(false);
        setReflection('');
        setShowTranscript(false);
        clearRecording();
      }
    } catch (err: any) {
      if (err.status === 409 && err.error?.code === 'REVISION_CONFLICT') {
        setError('Phiên bị lệch trạng thái. Đang đồng bộ lại...');
        await fetchSession();
      } else {
        setError(err.message || 'Không thể lưu câu đang luyện. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle restart session
  const handleRestartSession = async () => {
    if (!session || restarting) return;
    setRestarting(true);
    try {
      const newSession = await api.startListeningSession(session.lesson_id, session.settings, false);
      navigate(`/listening/practice/${newSession.id}`);
    } catch (err) {
      setError((err as Error).message || 'Không thể tạo phiên mới.');
      setRestarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-semibold">Đang chuẩn bị phiên luyện nghe câu...</p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="max-w-2xl mx-auto p-6 md:p-8 mt-12">
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-3xl text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-600 dark:text-rose-400 mx-auto" />
          <h3 className="font-bold text-slate-900 dark:text-white">Không thể kết nối phiên luyện nghe</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => void fetchSession()}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-sm font-bold"
            >
              Thử kết nối lại
            </button>
            <button
              onClick={() => navigate('/listening')}
              className="px-5 py-2.5 border rounded-2xl text-sm font-bold"
            >
              Về Thư viện nghe
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  // Render Completed Summary State
  if (session.status === 'completed' || !session.current) {
    const summary = session.summary;

    return (
      <div className="max-w-3xl mx-auto p-6 md:p-12 space-y-6 animate-fade-in pb-20">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto shadow-inner">
            <Trophy className="w-10 h-10 stroke-[2.2]" />
          </div>

          <div className="space-y-2">
            <span className="px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 text-xs font-black uppercase tracking-wider">
              Phiên luyện tập hoàn tất
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              Chúc mừng! Bạn đã hoàn thành {session.title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
              Toàn bộ {session.total_sentences} câu trong học liệu đã được bạn thực hành qua chế độ{' '}
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {session.settings.mode === 'shadowing' ? 'Nói đuổi (Shadowing)' : 'Nghe & Lặp lại'} ({session.settings.rate}x)
              </span>.
            </p>
          </div>

          {/* Metrics summary */}
          {summary && (
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {summary.practised_sentences} / {session.total_sentences}
                </div>
                <div className="text-[11px] font-bold text-slate-400 uppercase mt-0.5">
                  Câu đã luyện
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {summary.skipped_sentences}
                </div>
                <div className="text-[11px] font-bold text-slate-400 uppercase mt-0.5">
                  Câu bỏ qua
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {summary.repetitions_self_reported}
                </div>
                <div className="text-[11px] font-bold text-slate-400 uppercase mt-0.5">
                  Lượt tự nhắc lại
                </div>
              </div>
            </div>
          )}

          {/* Disclaimer note */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            Kết quả được lưu trữ dựa trên hoạt động tự rèn luyện và tự khai báo thực tế của bạn, không quy đổi thành điểm phát âm chuẩn hóa hay điểm AI giả.
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              disabled={restarting}
              onClick={() => void handleRestartSession()}
              className="w-full sm:w-auto px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2"
            >
              {restarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span>Luyện lại bài này</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/listening')}
              className="w-full sm:w-auto px-6 py-3.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm text-slate-700 dark:text-slate-300 rounded-2xl transition"
            >
              Về Thư viện nghe
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-6 py-3.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm text-slate-700 dark:text-slate-300 rounded-2xl transition flex items-center justify-center gap-1.5"
            >
              <Home className="w-4 h-4" />
              <span>Trang chủ</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentSentence = session.current;
  const isShadowing = session.settings.mode === 'shadowing';
  const durationSec = ((currentSentence.duration_ms || 2000) / 1000).toFixed(1);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-28">
      {/* Hidden Native Audio Element with loop support */}
      <audio
        ref={audioRef}
        src={currentSentence.audio_url}
        loop={isLooping}
        onPlay={() => {
          setIsPlaying(true);
          setAudioError(null);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          if (!isLooping) setIsPlaying(false);
        }}
        onError={() => {
          setIsPlaying(false);
          setAudioError('Lỗi tải file âm thanh WAV. Vui lòng bấm thử lại.');
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTimeMs(audioRef.current.currentTime * 1000);
          }
        }}
        className="hidden"
      />

      {/* Top Header & Sentence Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/listening')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Thoát phiên luyện nghe</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
              {isShadowing ? 'Nói đuổi (Shadowing)' : 'Nghe & Lặp lại'} ({session.settings.rate}x)
            </span>
            <span className="text-xs font-black text-slate-900 dark:text-white">
              Câu {session.cursor + 1} / {session.total_sentences}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
              style={{
                width: `${((session.cursor + 1) / session.total_sentences) * 100}%`
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold">{session.title}</span>
            <span>Mã câu: {currentSentence.id}</span>
          </div>
        </div>
      </div>

      {/* Main Practice Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
        {/* Audio Player Widget */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50 via-slate-50 to-white dark:from-slate-800/80 dark:via-slate-800/40 dark:to-slate-900 border border-indigo-100 dark:border-slate-700 space-y-5 text-center">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Headphones className="w-4 h-4" />
              <span>Audio mẫu (WAV riêng biệt)</span>
            </span>
            <span className="text-[11px] font-mono">
              Thời lượng: {durationSec}s • {session.track.voice}
            </span>
          </div>

          {/* Big Playback Controls */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={replayAudio}
              title="Phát lại từ đầu câu"
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={togglePlayAudio}
              className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current translate-x-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsLooping(!isLooping)}
              title={isLooping ? 'Đang bật lặp lại câu' : 'Bật lặp lại câu'}
              className={`p-3 rounded-2xl border transition ${
                isLooping
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-bold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Repeat className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <span>Mẹo: Nhấn phím</span>
            <kbd className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
              Ctrl
            </kbd>
            <span>để phát/tạm dừng câu</span>
          </div>

          {/* Audio Error Alert & Retry */}
          {audioError && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{audioError}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAudioError(null);
                  if (audioRef.current) {
                    audioRef.current.load();
                    void audioRef.current.play().catch(() => {
                      setAudioError('Không thể phát lại âm thanh. Vui lòng bấm thử lại.');
                    });
                  }
                }}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-[11px] shrink-0"
              >
                Thử lại
              </button>
            </div>
          )}
        </div>

        {/* Transcript Box (Hidden / Shown toggle) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Văn bản câu
            </span>

            <button
              type="button"
              onClick={() => setShowTranscript(!showTranscript)}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
            >
              {showTranscript ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Ẩn transcript (thử thách nghe)</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem transcript</span>
                </>
              )}
            </button>
          </div>

          {showTranscript ? (
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center animate-fade-in">
              <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-relaxed">
                "{currentSentence.text}"
              </div>
            </div>
          ) : (
            <div
              onClick={() => setShowTranscript(true)}
              className="p-6 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center cursor-pointer hover:border-indigo-400 transition"
            >
              <p className="text-xs font-semibold text-slate-400">
                Transcript đang được ẩn để bạn tập trung luyện tai nghe. Bấm để hiển thị.
              </p>
            </div>
          )}
        </div>

        {/* Translation Accordion */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowTranslation(!showTranslation)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            {showTranslation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>Xem bản dịch toàn đoạn ngữ cảnh</span>
          </button>

          {showTranslation && (
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed animate-fade-in">
              <span className="font-bold uppercase text-[10px] block text-emerald-700 dark:text-emerald-400 mb-1">
                Bản dịch tham khảo toàn đoạn:
              </span>
              <p>{session.track.full_translation}</p>
            </div>
          )}
        </div>

        {/* In-Browser Audio Recording (Optional Self-check) */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-indigo-500" />
              <span>Tự thu âm giọng bạn để nghe lại (Tuỳ chọn)</span>
            </span>
            <span className="text-[10px] text-slate-400">Lưu cục bộ tại máy</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isRecording ? (
              <button
                type="button"
                onClick={() => void startRecording()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-xs"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Bắt đầu thu âm</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse transition"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Dừng thu âm</span>
              </button>
            )}

            {recordedAudioUrl && (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <audio src={recordedAudioUrl} controls className="h-8 max-w-[200px]" />
                <button
                  type="button"
                  onClick={clearRecording}
                  title="Xoá bản thu này"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Repetitions Self-Assessment & Reflection */}
        <div className="p-5 rounded-2xl bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <label className="text-xs font-extrabold text-slate-900 dark:text-white">
                Số lần bạn đã tự nhắc lại câu này:
              </label>
              <p className="text-[11px] text-slate-500">
                Mục tiêu đã chọn: tối thiểu {session.settings.target_repetitions} lần • Tự khai báo, không chấm tự động
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={repetitions <= 1}
                onClick={() => setRepetitions(Math.max(1, repetitions - 1))}
                className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-300 disabled:opacity-40"
              >
                -
              </button>
              <span className="w-10 text-center font-black text-base text-indigo-600 dark:text-indigo-400">
                {repetitions}
              </span>
              <button
                type="button"
                onClick={() => setRepetitions(repetitions + 1)}
                className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-300"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="selfReviewedCheck"
              checked={selfReviewed}
              onChange={(e) => setSelfReviewed(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
            />
            <label htmlFor="selfReviewedCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              Tôi đã nghe và tự luyện nhắc lại câu này theo đúng mục tiêu.
            </label>
          </div>

          <div className="space-y-1 pt-1">
            <label className="block text-[11px] font-semibold text-slate-500">
              Ghi chú tự suy ngẫm (Tuỳ chọn, ví dụ: cần nối âm Linh, đọc đúng university...):
            </label>
            <input
              type="text"
              value={reflection}
              maxLength={2000}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Ghi chú điều bạn muốn lưu ý cho câu này..."
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            disabled={submitting || isRecording}
            title={isRecording ? 'Vui lòng dừng thu âm trước khi bỏ qua câu' : undefined}
            onClick={() => void handleCompleteSentence(true)}
            className="w-full sm:w-auto px-5 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-2xl transition disabled:opacity-50"
          >
            Bỏ qua câu này
          </button>

          <button
            type="button"
            disabled={submitting || isRecording || repetitions < session.settings.target_repetitions || !selfReviewed}
            title={
              isRecording
                ? 'Vui lòng dừng thu âm trước khi chuyển câu'
                : !selfReviewed
                ? 'Vui lòng tích ô xác nhận đã tự luyện câu này'
                : repetitions < session.settings.target_repetitions
                ? `Cần luyện tối thiểu ${session.settings.target_repetitions} lần`
                : undefined
            }
            onClick={() => void handleCompleteSentence(false)}
            className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <span>Lưu & Sang câu tiếp</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

