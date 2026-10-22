import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Search, Upload, FileText, Download } from 'lucide-react';
import { catalog, languages } from '../data/catalog';
import { VocabSet } from '../types';
import { parseImport, readLibrary, saveSet } from '../utils/library';

interface Props { lang: 'vi' | 'en'; courseId?: string; onNavigate: (path: string) => void; onStudy: (set: VocabSet) => void }
export function CourseLibrary({ lang, courseId, onNavigate, onStudy }: Props) {
  const vi = lang === 'vi';
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sets, setSets] = useState(readLibrary);
  useEffect(() => {
    const update = () => setSets(readLibrary());
    window.addEventListener('openquiz-library-updated', update);
    return () => window.removeEventListener('openquiz-library-updated', update);
  }, []);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const course = catalog.find(c => c.id === courseId);
  const selectedSet = sets.find(s => s.id === courseId);
  const title = course?.title || selectedSet?.title;
  async function importFile(event: React.ChangeEvent<HTMLInputElement>) {
    const source = event.target.files?.[0];
    if (!source) return;
    setError(''); setNotice('');
    try {
      if (source.size > 10 * 1024 * 1024) throw new Error(vi ? 'Tệp tối đa 10 MB.' : 'Maximum file size: 10 MB.');
      const imported = parseImport(await source.text(), source.name, course);
      if (selectedSet && !course) { imported.id = selectedSet.id; imported.title = selectedSet.title; }
      saveSet(imported); setSets(readLibrary());
      setNotice(vi ? `Đã nhập ${imported.words.length} từ. Dữ liệu được lưu trên trình duyệt này.` : `${imported.words.length} words imported and saved in this browser.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Import failed'); }
    event.target.value = '';
  }
  function exportSet(set: VocabSet) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(set, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `${set.id}.json`; a.click(); URL.revokeObjectURL(url);
  }
  const filtered = catalog.filter(c => (filter === 'all' || c.language === filter) && c.title.toLowerCase().includes(query.toLowerCase().trim()));
  return <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 md:py-14">
    <input ref={file} type="file" accept=".json,.csv,.tsv" className="sr-only" aria-label={vi ? 'Nhập tài liệu từ vựng' : 'Import vocabulary'} onChange={importFile} />
    <button className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => onNavigate(courseId ? '/courses' : '/')}><ArrowLeft className="h-4 w-4" />{courseId ? (vi ? 'Thư viện học tập' : 'Learning library') : (vi ? 'Về trang chủ' : 'Back to home')}</button>
    {courseId && !title ? <div className="rounded-xl border bg-card p-10"><h1 className="text-2xl font-bold">{vi ? 'Không tìm thấy khóa học' : 'Course not found'}</h1><button onClick={() => onNavigate('/courses')} className="library-button mt-5">{vi ? 'Xem các lộ trình' : 'Browse paths'}</button></div> : title ? <>
      <p className="section-eyebrow">{vi ? 'Lộ trình học tập' : 'Learning path'}</p>
      <h1 className="mt-3 max-w-4xl text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
      <p className="mt-3 text-muted-foreground">{course && languages.find(l => l.id === course.language)?.[lang]} {course && `· ${course.level}`}</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-xl border bg-card p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3"><BookOpen className="h-5 w-5 text-teal-600" /><h2 className="text-lg font-bold">{vi ? 'Tài liệu & từ vựng' : 'Materials & vocabulary'}</h2></div>
          {selectedSet ? <><p className="mb-5 text-sm text-muted-foreground">{selectedSet.words.length} {vi ? 'từ trong bộ học của bạn' : 'words in your study set'}</p><div className="divide-y">{selectedSet.words.map(w => <div key={w.id} className="py-4"><div className="flex flex-wrap justify-between gap-2"><strong>{w.term}</strong><span className="text-sm text-muted-foreground">{w.phonetic}</span></div><p className="mt-1 text-sm">{w.definition}</p>{w.example && <p className="mt-2 text-sm italic text-muted-foreground">{w.example}</p>}</div>)}</div></> : <div className="py-8 text-center"><FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60" /><h3 className="font-bold">{vi ? 'Chưa có dữ liệu bài học' : 'Lesson content is not available yet'}</h3><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">{vi ? 'Trang công khai chỉ cung cấp tên lộ trình. Nội dung chi tiết trên OpenQuiz cần đăng nhập để kiểm tra. Bạn có thể nhập tài liệu của mình để bắt đầu học tại đây.' : 'The public page lists the path name. Detailed OpenQuiz lessons require a signed-in session to inspect. Import your own materials to start studying here.'}</p><button onClick={() => file.current?.click()} className="library-button mx-auto mt-6"><Upload className="h-4 w-4" />{vi ? 'Nhập tài liệu' : 'Import materials'}</button></div>}
        </section>
        <aside className="h-fit rounded-xl border bg-card p-6"><p className="section-eyebrow">{vi ? 'Góc học tập' : 'Your study space'}</p><h2 className="mt-3 text-lg font-bold">{vi ? 'Học theo cách của bạn' : 'Study your way'}</h2><p className="my-5 text-sm leading-7 text-muted-foreground">{vi ? 'Thẻ ghi nhớ, nghe phát âm, luyện viết và lưu từ đã thuộc.' : 'Flashcards, pronunciation, writing, and saved mastered words.'}</p>{selectedSet && <button onClick={() => onStudy(selectedSet)} className="library-button w-full">{vi ? 'Bắt đầu học' : 'Start studying'}<ArrowRight className="h-4 w-4" /></button>}<button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold" onClick={() => file.current?.click()}><Upload className="h-4 w-4" />{selectedSet ? (vi ? 'Thay tài liệu' : 'Replace materials') : (vi ? 'Nhập JSON / CSV / TSV' : 'Import JSON / CSV / TSV')}</button>{selectedSet && <button className="mt-3 flex w-full items-center justify-center gap-2 text-sm" onClick={() => exportSet(selectedSet)}><Download className="h-4 w-4" />{vi ? 'Xuất bộ từ' : 'Export set'}</button>}<p className="mt-5 text-xs leading-5 text-muted-foreground">{vi ? 'CSV/TSV: term, definition, phonetic, example. JSON: mảng từ hoặc đối tượng có trường words.' : 'CSV/TSV: term, definition, phonetic, example. JSON: word array or an object with a words field.'}</p></aside>
      </div>
    </> : <>
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="section-eyebrow">{vi ? 'Lộ trình & tài liệu' : 'Paths & materials'}</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">{vi ? 'Thư viện học tập' : 'Learning library'}</h1><p className="mt-3 text-muted-foreground">{vi ? 'Chọn ngôn ngữ, tìm lộ trình và xây kho từ vựng của riêng bạn.' : 'Choose a language, find a path, and build your own vocabulary.'}</p></div><button onClick={() => file.current?.click()} className="library-button"><Upload className="h-4 w-4" />{vi ? 'Nhập bộ từ của bạn' : 'Import your vocabulary'}</button></div>
      <div className="my-8 flex flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap gap-2">{[{ id: 'all', vi: 'Tất cả', en: 'All', flag: '' }, ...languages].map(l => <button key={l.id} aria-pressed={filter === l.id} onClick={() => setFilter(l.id)} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${filter === l.id ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}>{l.flag} {l[lang]}</button>)}</div><label className="flex w-full items-center gap-2 rounded-lg border bg-card px-3 sm:w-72"><Search className="h-4 w-4 shrink-0 text-muted-foreground" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={vi ? 'Tìm khóa học…' : 'Search courses…'} aria-label={vi ? 'Tìm khóa học' : 'Search courses'} className="w-full bg-transparent py-2 text-sm outline-none" /></label></div>
      <p className="mb-4 text-sm text-muted-foreground">{filtered.length} {vi ? 'lộ trình' : 'paths'}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(c => <button key={c.id} onClick={() => onNavigate(`/courses/${c.id}`)} className="group flex min-h-48 flex-col rounded-xl border bg-card p-6 text-left transition hover:border-teal-500/50 hover:shadow-sm"><div className="mb-5 flex w-full justify-between"><span className="text-2xl">{languages.find(l => l.id === c.language)?.flag}</span><span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">{c.level}</span></div><h2 className="font-bold group-hover:text-teal-600">{c.title}</h2><p className="mt-auto flex items-center justify-between pt-6 text-xs text-muted-foreground">{sets.some(s => s.id === c.id) ? (vi ? 'Đã có tài liệu' : 'Materials imported') : (vi ? 'Xem lộ trình' : 'View path')}<ArrowRight className="h-4 w-4" /></p></button>)}</div>
      {!filtered.length && <p className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">{vi ? 'Không có lộ trình phù hợp. Thử từ khóa khác.' : 'No matching paths. Try another search.'}</p>}
      {sets.some(s => !catalog.some(c => c.id === s.id)) && <section className="mt-12"><h2 className="mb-5 text-xl font-bold">{vi ? 'Tài liệu của bạn' : 'Your materials'}</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{sets.filter(s => !catalog.some(c => c.id === s.id) && s.title.toLowerCase().includes(query.toLowerCase().trim()) && (filter === 'all' || s.language === filter)).map(s => <button key={s.id} onClick={() => onNavigate(`/courses/${s.id}`)} className="rounded-xl border bg-card p-6 text-left"><FileText className="mb-4 h-5 w-5 text-teal-600" /><h3 className="font-bold">{s.title}</h3><p className="mt-2 text-sm text-muted-foreground">{s.words.length} {vi ? 'từ vựng' : 'words'}</p></button>)}</div></section>}
    </>}
    {notice && <p role="status" className="mt-6 rounded-lg border border-teal-500/30 bg-teal-500/5 p-4 text-sm">{notice}</p>}
    {error && <p role="alert" className="mt-6 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600">{error}</p>}
  </main>;
}
