import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { api, ClassItem } from '../api/client';
import {
  Users,
  PlusCircle,
  Key,
  BookOpen,
  CheckCircle2,
  Calendar,
  ChevronRight,
  ShieldAlert,
  Loader2,
  X
} from 'lucide-react';

export const ClassesView: React.FC = () => {
  const { navigate } = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Selected class detail
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classDetail, setClassDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadClasses = async () => {
    try {
      const res = await api.getClasses();
      setClasses(res.items || []);
      if (res.items && res.items.length > 0 && selectedClassId === null) {
        loadClassDetail(res.items[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClassDetail = async (id: number) => {
    setSelectedClassId(id);
    setDetailLoading(true);
    try {
      const d = await api.getClass(id);
      setClassDetail(d);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setModalLoading(true);
    try {
      const created = await api.createClass(newClassName.trim(), newClassDesc.trim());
      setShowCreateModal(false);
      setNewClassName('');
      setNewClassDesc('');
      await loadClasses();
      loadClassDetail(created.id);
    } catch (err: any) {
      alert(err?.message || 'Không thể tạo lớp học.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setModalLoading(true);
    try {
      const res = await api.joinClass(joinCode.trim());
      setShowJoinModal(false);
      setJoinCode('');
      await loadClasses();
      loadClassDetail(res.class_id);
    } catch (err: any) {
      alert(err?.message || 'Mã tham gia không chính xác hoặc lớp không tồn tại.');
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm">Đang tải danh sách lớp học LMS...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Lớp học & Giáo viên LMS
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Giao bài tập từ vựng, theo dõi tiến độ học sinh và tổ chức lớp học
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJoinModal(true)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 transition"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Nhập mã tham gia</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Tạo lớp mới</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Class List, Right Class Management Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Classes List */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Lớp học của bạn ({classes.length})
          </div>

          {classes.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-400">Bạn chưa tham gia lớp học nào.</p>
            </div>
          ) : (
            classes.map((cls) => {
              const isSelected = selectedClassId === cls.id;
              return (
                <div
                  key={cls.id}
                  onClick={() => loadClassDetail(cls.id)}
                  className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'border-indigo-600 bg-white dark:bg-slate-900 ring-2 ring-indigo-500/30 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {cls.name}
                    </span>
                    {cls.is_owner && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-600 border border-indigo-100">
                        Giáo viên
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {cls.description || 'Lớp luyện thi TOEIC cấp tốc'}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    {cls.member_count} thành viên
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Detail: Members & Assignments */}
        <div className="md:col-span-2">
          {detailLoading ? (
            <div className="py-24 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-2" />
              <p className="text-xs">Đang tải thông tin lớp học...</p>
            </div>
          ) : classDetail ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {classDetail.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {classDetail.description || 'Lớp học tương tác với giáo viên'}
                  </p>
                </div>

                {classDetail.invitation_code && (
                  <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="text-slate-400 font-medium">Mã mời: </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {classDetail.invitation_code}
                    </span>
                  </div>
                )}
              </div>

              {/* Members Section */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Thành viên trong lớp ({classDetail.members?.length || 0})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {classDetail.members?.map((m: any) => (
                    <div
                      key={m.user_id}
                      className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center">
                          {m.name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{m.name}</span>
                      </div>
                      <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {m.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assignments Section */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Bài tập được giao
                </div>

                {(!classDetail.assignments || classDetail.assignments.length === 0) ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl">
                    Chưa có bài tập nào được giao cho lớp này.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {classDetail.assignments.map((asgn: any) => (
                      <div
                        key={asgn.id}
                        onClick={() => navigate(`/study-set/${asgn.set_id || 163}`)}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-white dark:bg-slate-800/60 transition cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-4 h-4 text-indigo-500" />
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {asgn.title}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Hạn nộp: {asgn.due_at || 'Không giới hạn'}
                            </div>
                          </div>
                        </div>
                        <button className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold">
                          Làm bài
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              Chọn lớp học để xem thông tin
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Tạo lớp học mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Tên lớp học</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Ví dụ: TOEIC 800+ K35"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Mô tả lớp</label>
                <textarea
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  placeholder="Mô tả mục tiêu và đối tượng của lớp..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  {modalLoading ? 'Đang tạo...' : 'Tạo lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Tham gia bằng mã mời</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Mã mời từ giáo viên</label>
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Nhập mã 6 ký tự..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium font-mono text-center text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  {modalLoading ? 'Đang tham gia...' : 'Tham gia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

