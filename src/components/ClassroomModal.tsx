import React, { useState } from 'react';
import {
  X,
  Users,
  Plus,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Mic,
  Send,
  FileCheck,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'vi' | 'en';
}

export const ClassroomModal: React.FC<ClassroomModalProps> = ({
  isOpen,
  onClose,
  lang
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  const [classCode, setClassCode] = useState('');
  const [classes, setClasses] = useState([
    {
      id: 'cls-1',
      name: 'Lớp IELTS Speaking Chuyên Sâu K24',
      teacher: 'Cô Mai Lan (IELTS 8.5)',
      sharedCode: 'IELTS-K24',
      studentsCount: 28,
      pendingAssignments: 2
    },
    {
      id: 'cls-2',
      name: 'Tiếng Anh Doanh Nghiệp - Level B2',
      teacher: 'Thầy David Miller',
      sharedCode: 'BIZ-B2',
      studentsCount: 15,
      pendingAssignments: 1
    }
  ]);

  const [assignments, setAssignments] = useState([
    {
      id: 'asg-1',
      title: 'Thu âm trả lời Part 2: A challenging project',
      className: 'Lớp IELTS Speaking Chuyên Sâu K24',
      deadline: '23:59 Ngày mai',
      type: 'Speaking Submission',
      status: 'pending'
    },
    {
      id: 'asg-2',
      title: 'Học 30 từ vựng Unit 4: Business Negotiations',
      className: 'Tiếng Anh Doanh Nghiệp - Level B2',
      deadline: 'Chủ nhật tuần này',
      type: 'Vocab Mastery',
      status: 'completed'
    }
  ]);

  const [newClassName, setNewClassName] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const handleJoinClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classCode.trim()) return;
    setClasses(prev => [
      ...prev,
      {
        id: 'cls-' + Date.now(),
        name: `Lớp học mã [${classCode.toUpperCase()}]`,
        teacher: 'Giáo viên phụ trách',
        sharedCode: classCode.toUpperCase(),
        studentsCount: 12,
        pendingAssignments: 1
      }
    ]);
    setClassCode('');
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const generated = 'OPQ-' + Math.floor(1000 + Math.random() * 9000);
    setCreatedCode(generated);
    setClasses(prev => [
      ...prev,
      {
        id: 'cls-' + Date.now(),
        name: newClassName.trim(),
        teacher: 'Bạn (Giáo viên)',
        sharedCode: generated,
        studentsCount: 1,
        pendingAssignments: 0
      }
    ]);
    setNewClassName('');
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-[16px] border bg-background shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-blue-600 text-white font-black">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">
                Hệ Thống Lớp Học Trực Tuyến (LMS)
              </h2>
              <p className="text-xs text-muted-foreground">
                Kết nối giáo viên và học sinh • Giao bài tập & Chấm điểm tự luận
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b bg-muted/30 px-6 gap-3 pt-2">
          <button
            onClick={() => setActiveTab('student')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'student'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Dành Cho Học Sinh (My Classes & Homework)
          </button>
          <button
            onClick={() => setActiveTab('teacher')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'teacher'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Dành Cho Giáo Viên (Create Class & Grade)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'student' ? (
            <div className="space-y-6">
              {/* Join Class Bar */}
              <form onSubmit={handleJoinClass} className="flex gap-2">
                <input
                  type="text"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  placeholder="Nhập mã lớp học (Ví dụ: IELTS-K24)..."
                  className="flex-1 rounded-[8px] border border-input bg-background px-4 py-2.5 text-xs text-foreground focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="rounded-[8px] bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:bg-primary/90"
                >
                  Tham gia lớp
                </button>
              </form>

              {/* Class list */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Lớp học bạn đang tham gia:</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {classes.map((c) => (
                    <div key={c.id} className="rounded-[10px] border bg-card p-4 shadow-xs">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-bold text-foreground">{c.name}</h4>
                        <span className="text-[10px] font-mono font-bold bg-muted px-2 py-0.5 rounded">
                          {c.sharedCode}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">GV: {c.teacher}</p>
                      <div className="mt-3 pt-2 border-t flex justify-between items-center text-xs text-muted-foreground">
                        <span>{c.studentsCount} học viên</span>
                        <span className="text-amber-600 font-bold">
                          {c.pendingAssignments} bài tập cần nộp
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assignments List */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Bài tập được giao:</h3>
                <div className="space-y-2.5">
                  {assignments.map((asg) => (
                    <div
                      key={asg.id}
                      className="rounded-[10px] border bg-card p-4 flex items-center justify-between shadow-xs"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          {asg.className}
                        </span>
                        <h4 className="text-sm font-bold text-foreground mt-0.5">{asg.title}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
                          Hạn chót: {asg.deadline}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          alert('Bắt đầu nộp bài tập ghi âm luyện nói!');
                        }}
                        className={`px-3.5 py-1.5 rounded-[6px] text-xs font-bold ${
                          asg.status === 'completed'
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {asg.status === 'completed' ? 'Đã hoàn thành' : 'Vào làm bài'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* TEACHER TAB */
            <div className="space-y-6">
              <div className="rounded-[12px] border bg-card p-5 space-y-4">
                <h3 className="text-sm font-bold text-foreground">Tạo Lớp Học Trực Tuyến Mới</h3>
                <p className="text-xs text-muted-foreground">
                  Hệ thống sẽ tạo tự động một mã mời ngắn (Shared ID) để bạn gửi cho học viên tham gia.
                </p>

                <form onSubmit={handleCreateClass} className="space-y-3">
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="Tên lớp học (Ví dụ: Lớp Luyện Nói Chuyên Sâu IELTS K25)..."
                    className="w-full rounded-[8px] border border-input bg-background p-2.5 text-xs text-foreground focus:ring-2 focus:ring-primary"
                    required
                  />
                  <button
                    type="submit"
                    className="rounded-[8px] bg-primary text-primary-foreground px-5 py-2 text-xs font-bold hover:bg-primary/90"
                  >
                    Tạo lớp học ngay
                  </button>
                </form>

                {createdCode && (
                  <div className="rounded-[8px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 p-3 text-xs text-emerald-800 dark:text-emerald-200 font-bold">
                    Mã mời tham gia lớp học của bạn: <span className="font-mono text-sm underline">{createdCode}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

