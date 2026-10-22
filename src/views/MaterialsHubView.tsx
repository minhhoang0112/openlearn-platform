import React, { useEffect, useState, useRef } from 'react';
import {
  Headphones,
  Plus,
  Search,
  Trash2,
  Play,
  Clock,
  FileAudio,
  AlertCircle,
  Loader2,
  FolderPlus,
  Info,
  ChevronRight,
  ShieldCheck,
  FileText,
  X,
  UploadCloud
} from 'lucide-react';
import {
  api,
  LearningMaterialItem,
  LearningMaterialCapabilities
} from '../api/client';
import { useRouter } from '../context/RouterContext';

export const MaterialsHubView: React.FC = () => {
  const { navigate } = useRouter();

  const [materials, setMaterials] = useState<LearningMaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Capabilities
  const [capabilities, setCapabilities] = useState<LearningMaterialCapabilities | null>(null);

  // Modal import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDurationMs, setFileDurationMs] = useState<number | null>(null);
  const [decodingError, setDecodingError] = useState<string | null>(null);
  const [validatingAudio, setValidatingAudio] = useState(false);

  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [sourceNote, setSourceNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const submissionIdRef = useRef<string>(crypto.randomUUID());

  // Delete modal state
  const [deletingMaterial, setDeletingMaterial] = useState<LearningMaterialItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load capabilities
  useEffect(() => {
    api.getLearningMaterialCapabilities()
      .then((cap) => setCapabilities(cap))
      .catch(() => {});
  }, []);

  // Fetch materials list
  const fetchMaterials = async (query = '') => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getLearningMaterials({ q: query, limit: 50 });
      setMaterials(res.items || []);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách học liệu cá nhân');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMaterials(debouncedQuery);
  }, [debouncedQuery]);

  // Handle file selection and browser audio metadata decoding
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setDecodingError(null);
    setFileDurationMs(null);

    // Auto-fill title if empty
    if (!title.trim()) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
    }

    const maxBytes = capabilities?.max_audio_bytes || 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      setDecodingError(`Kích thước file (${(file.size / (1024 * 1024)).toFixed(1)} MB) vượt quá giới hạn tối đa ${(maxBytes / (1024 * 1024)).toFixed(0)} MB.`);
      return;
    }

    if (file.size < 44) {
      setDecodingError('File audio quá nhỏ hoặc không hợp lệ.');
      return;
    }

    // Decode audio duration in browser
    setValidatingAudio(true);
    try {
      const objectUrl = URL.createObjectURL(file);
      const tempAudio = new Audio();
      tempAudio.src = objectUrl;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Hết thời gian tải thử nghiệm audio.'));
        }, 8000);

        tempAudio.onloadedmetadata = () => {
          clearTimeout(timeout);
          const durSec = tempAudio.duration;
          if (Number.isFinite(durSec) && durSec > 0) {
            setFileDurationMs(Math.round(durSec * 1000));
            URL.revokeObjectURL(objectUrl);
            resolve();
          } else {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Không thể xác định thời lượng của tệp âm thanh này.'));
          }
        };

        tempAudio.onerror = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Trình duyệt không thể giải mã tệp âm thanh này. Hãy kiểm tra định dạng hoặc codec.'));
        };
      });
    } catch (err: any) {
      setDecodingError(err?.message || 'Lỗi kiểm tra tệp âm thanh');
    } finally {
      setValidatingAudio(false);
    }
  };

  const openImportModal = () => {
    submissionIdRef.current = crypto.randomUUID();
    setSelectedFile(null);
    setFileDurationMs(null);
    setDecodingError(null);
    setTitle('');
    setTranscript('');
    setTranslation('');
    setSourceNote('');
    setImportError(null);
    setShowImportModal(true);
  };

  const closeImportModal = () => {
    if (isSubmitting) return;
    setShowImportModal(false);
  };

  // Convert File to base64 without prefix
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const commaIdx = result.indexOf(',');
        const base64 = commaIdx >= 0 ? result.slice(commaIdx + 1) : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Lỗi đọc tệp từ thiết bị'));
      reader.readAsDataURL(file);
    });
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isSubmitting) return;

    if (!title.trim()) {
      setImportError('Vui lòng nhập tiêu đề cho học liệu');
      return;
    }

    if (decodingError) {
      setImportError(decodingError);
      return;
    }

    setIsSubmitting(true);
    setImportError(null);

    try {
      const base64Data = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type || 'audio/mpeg';

      const res = await api.createLearningMaterial({
        submission_id: submissionIdRef.current,
        title: title.trim(),
        transcript: transcript.trim() || undefined,
        translation: translation.trim() || undefined,
        source_note: sourceNote.trim() || undefined,
        audio: {
          mime_type: mimeType,
          data: base64Data
        },
        duration_ms: fileDurationMs ?? undefined
      });

      setShowImportModal(false);
      // Navigate to player view of newly created material
      navigate(`/materials/${res.id}`);
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'Không thể nhập học liệu lúc này. Vui lòng thử lại.';
      setImportError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMaterial = async () => {
    if (!deletingMaterial || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.deleteLearningMaterial(deletingMaterial.id);
      setMaterials((prev) => prev.filter((m) => m.id !== deletingMaterial.id));
      setDeletingMaterial(null);
    } catch (err: any) {
      alert(err?.message || 'Không thể xóa học liệu này');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDuration = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 pb-20">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            <span>Thư viện luyện nghe</span>
            <span>•</span>
            <span>Học liệu cá nhân</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Headphones className="w-7 h-7 text-indigo-600" />
            <span>Học liệu nghe của tôi</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Tải lên và lưu trữ các bài nghe riêng từ máy tính của bạn. Tự động lưu vị trí đang nghe, tùy chỉnh tốc độ và đánh dấu vòng lặp A–B để luyện nghe sâu.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/listening')}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition shadow-xs flex items-center gap-2"
          >
            <span>Thư viện 27 bài học V2</span>
          </button>
          <button
            type="button"
            onClick={openImportModal}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nhập học liệu mới</span>
          </button>
        </div>
      </div>

      {/* Info Card: Privacy & Capability */}
      <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 flex items-start gap-3.5 text-xs text-indigo-950 dark:text-indigo-200">
        <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold">Lưu trữ riêng tư & Bảo mật:</span>
          <p className="text-indigo-900/80 dark:text-indigo-300 leading-relaxed">
            Tệp âm thanh và văn bản của bạn được lưu hoàn toàn riêng biệt trong cơ sở dữ liệu nội bộ của tài khoản. Hệ thống không tải file lên bên thứ ba, không gửi tới AI khi nhập, và không trộn vào giáo trình chung 27 bài.
          </p>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo tiêu đề học liệu..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Tổng cộng <span className="font-bold text-slate-900 dark:text-white">{materials.length}</span> học liệu riêng
        </div>
      </div>

      {/* Materials Grid / List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs font-semibold">Đang tải danh sách học liệu...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-sm font-bold text-rose-900 dark:text-rose-200">{error}</p>
          <button
            type="button"
            onClick={() => void fetchMaterials(debouncedQuery)}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
          >
            Thử lại
          </button>
        </div>
      ) : materials.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto">
            <FileAudio className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {debouncedQuery ? 'Không tìm thấy học liệu phù hợp' : 'Chưa có học liệu nghe cá nhân nào'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {debouncedQuery
                ? 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc để xem toàn bộ danh sách.'
                : 'Tải lên các file audio bài nói, podcast hoặc đoạn hội thoại của riêng bạn để bắt đầu luyện nghe.'}
            </p>
          </div>
          {!debouncedQuery && (
            <button
              type="button"
              onClick={openImportModal}
              className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tải lên học liệu đầu tiên</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((mat) => {
            const playedRatio = mat.playback?.position_ms && mat.duration_ms
              ? Math.min(100, Math.round((mat.playback.position_ms / mat.duration_ms) * 100))
              : 0;

            return (
              <div
                key={mat.id}
                className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition shadow-xs flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileAudio className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                        {mat.mime_type.replace('audio/', '')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDeletingMaterial(mat)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                        title="Xóa học liệu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3
                      onClick={() => navigate(`/materials/${mat.id}`)}
                      className="text-base font-black text-slate-900 dark:text-white line-clamp-1 cursor-pointer group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition"
                      title={mat.title}
                    >
                      {mat.title}
                    </h3>
                    {mat.transcript_excerpt && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {mat.transcript_excerpt}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(mat.duration_ms)}</span>
                      </span>
                      <span>{playedRatio > 0 ? `Vị trí đã lưu ${playedRatio}%` : 'Vị trí đã lưu 0%'}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${playedRatio}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-slate-400">
                      {formatFileSize(mat.audio_bytes)}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/materials/${mat.id}`)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 dark:bg-white dark:hover:bg-indigo-400 text-white dark:text-slate-900 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{playedRatio > 0 ? 'Nghe tiếp' : 'Bắt đầu nghe'}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Nhập học liệu nghe mới
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Tối đa 8MB • Định dạng WAV, MP3, WebM, OGG, M4A
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeImportModal}
                disabled={isSubmitting}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              {/* File upload zone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Chọn tệp âm thanh <span className="text-rose-500">*</span>
                </label>
                <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-5 text-center transition cursor-pointer bg-slate-50/50 dark:bg-slate-800/30">
                  <input
                    type="file"
                    accept="audio/wav,audio/x-wav,audio/wave,audio/mpeg,audio/mp3,audio/webm,audio/ogg,audio/mp4,audio/x-m4a,audio/m4a"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {validatingAudio ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-indigo-600 font-semibold py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang kiểm tra và giải mã tệp âm thanh...</span>
                    </div>
                  ) : selectedFile ? (
                    <div className="flex items-center justify-between text-left p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileAudio className="w-5 h-5 text-indigo-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatFileSize(selectedFile.size)}
                            {fileDurationMs ? ` • ${formatDuration(fileDurationMs)}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 underline shrink-0 cursor-pointer">
                        Đổi tệp
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1 py-2">
                      <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Bấm để chọn tệp âm thanh từ thiết bị
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Hỗ trợ định dạng .wav, .mp3, .m4a, .webm, .ogg (Tối đa 8 MB)
                      </p>
                    </div>
                  )}
                </div>
                {decodingError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1 pt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{decodingError}</span>
                  </p>
                )}
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tiêu đề học liệu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Đoạn hội thoại đặt phòng khách sạn"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              {/* Transcript Textarea (Optional) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Văn bản gốc tiếng Anh (Transcript)
                  </label>
                  <span className="text-[10px] text-slate-400">Tùy chọn</span>
                </div>
                <textarea
                  rows={3}
                  maxLength={80000}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Dán nội dung transcript nếu có để vừa nghe vừa theo dõi..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              {/* Translation Textarea (Optional) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Bản dịch tiếng Việt
                  </label>
                  <span className="text-[10px] text-slate-400">Tùy chọn</span>
                </div>
                <textarea
                  rows={2}
                  maxLength={80000}
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  placeholder="Dán bản dịch tiếng Việt nếu có..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              {/* Source Note (Optional) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Ghi chú nguồn
                  </label>
                  <span className="text-[10px] text-slate-400">Tùy chọn</span>
                </div>
                <input
                  type="text"
                  maxLength={2000}
                  value={sourceNote}
                  onChange={(e) => setSourceNote(e.target.value)}
                  placeholder="Ví dụ: BBC Learning English - 6 Minute English"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              {/* Error Alert */}
              {importError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeImportModal}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || !title.trim() || isSubmitting || Boolean(decodingError) || validatingAudio}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-md flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tải lên...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Nhập học liệu</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMaterial && (
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
                Bạn có chắc chắn muốn xóa học liệu <span className="font-bold text-slate-700 dark:text-slate-200">"{deletingMaterial.title}"</span>? File âm thanh và dữ liệu lưu vị trí sẽ bị xóa vĩnh viễn.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMaterial(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
              >
                Giữ lại
              </button>
              <button
                type="button"
                onClick={handleDeleteMaterial}
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
                    <span>Xóa vĩnh viễn</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

