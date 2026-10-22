import { useState } from 'react';
import { Check, Mic, Volume2, Sparkles, ArrowRight, RotateCw } from 'lucide-react';
import { GoogleChromeIcon } from './Icons';
import { speakText } from '../utils/speech';

export function HeroSection({ lang, onStart }: { lang: 'vi' | 'en'; onStart: () => void }) {
  const vi = lang === 'vi';
  const [flipped, setFlipped] = useState(false);
  return <section className="hero-section border-b">
    <div className="hero-layout mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
      <div>
        <div className="mb-5 flex flex-wrap gap-2">{[vi ? 'Không giới hạn bộ từ' : 'Unlimited sets', vi ? 'Học thuộc miễn phí' : 'Free memorization'].map(t => <span key={t} className="inline-flex items-center gap-1 rounded-md border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300"><Check className="h-3.5 w-3.5" />{t}</span>)}</div>
        <h1 className="max-w-xl text-4xl font-extrabold leading-[1.02] tracking-tight md:text-5xl">{vi ? 'Học từ bằng cách sử dụng trong giao tiếp' : 'Learn words by using them in conversation'}</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">{vi ? 'Tạo bộ từ không giới hạn, học thuộc miễn phí, rồi dùng ngay từ đó để nói chủ động.' : 'Create unlimited vocabulary sets, memorize for free, then use those words to speak actively.'}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row"><button onClick={onStart} className="library-button h-12 px-5 text-base"><GoogleChromeIcon className="h-5 w-5" />{vi ? 'Bắt đầu học miễn phí' : 'Start learning for free'}</button><button onClick={onStart} className="inline-flex h-12 items-center justify-center gap-3 rounded-lg border px-5 text-base font-semibold hover:bg-muted"><BookIcon />{vi ? 'Khám phá lộ trình' : 'Explore learning paths'}</button></div>
        <div className="mt-7 grid grid-cols-3 gap-3">{[['120,000+', vi ? 'người dùng hàng tháng' : 'monthly users'], ['50+', vi ? 'ngôn ngữ hỗ trợ' : 'supported languages'], ['0đ', vi ? 'để bắt đầu học thuộc' : 'to start memorizing']].map(([number, label]) => <div key={number} className="rounded-lg border bg-card px-3 py-4"><p className="text-xl font-extrabold">{number}</p><p className="mt-0.5 text-sm leading-5 text-muted-foreground">{label}</p></div>)}</div>
      </div>
      <div className="hero-preview relative">
        <div className="hero-word-card absolute left-0 top-0 flex flex-col rounded-3xl border bg-card p-4 shadow-md">
          <div className="flex gap-2 text-[10px]"><span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">{vi ? 'Đang học' : 'Studying'}</span><span className="rounded bg-muted px-1.5 py-1 text-muted-foreground">12/18</span></div>
          <button onClick={() => setFlipped(!flipped)} aria-label={vi ? 'Lật thẻ từ resilient' : 'Flip resilient flashcard'} className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className={`${flipped ? 'text-2xl' : 'text-3xl'} font-semibold`}>{flipped ? (vi ? 'Kiên cường, phục hồi nhanh' : 'Able to recover after difficulty') : 'resilient'}</span>
            <span className="mt-3 text-sm text-muted-foreground">{flipped ? 'tough · persistent · adaptable' : <>adj - <i className="font-serif">/rɪˈzɪliənt/</i></>}</span>
          </button>
          <div className="flex items-center justify-between"><span className="flex items-center gap-1 text-[10px] text-muted-foreground"><RotateCw className="h-3 w-3" />{vi ? 'Nhấp để lật thẻ' : 'Click to flip'}</span><div className="flex gap-2"><button onClick={onStart} aria-label="Practice speaking" className="rounded-lg bg-primary p-2.5 text-primary-foreground"><Mic className="h-4 w-4" /></button><button onClick={() => void speakText('resilient')} aria-label="Play pronunciation" className="rounded-lg border p-2.5"><Volume2 className="h-4 w-4" /></button></div></div>
        </div>
        <div className="hero-answer-card absolute bottom-0 right-0 rounded-2xl border bg-card p-3 shadow-xl">
          <div className="rounded-lg bg-muted p-2.5 text-xs"><p className="mb-1 text-muted-foreground">💬 {vi ? 'Câu hỏi' : 'Question'}</p><p>Describe a time you overcame a challenge. Use: resilient.</p></div>
          <p className="mb-2 mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Mic className="h-3 w-3 text-red-500" />{vi ? 'Câu trả lời của bạn' : 'Your answer'}</p>
          <p className="mb-2 text-xs">“I was very <mark className="rounded bg-emerald-100 px-1 text-emerald-900">resilient</mark> and I <span className="decoration-red-500 underline decoration-wavy">did not gave</span> up.”</p>
          <p className="flex items-start gap-2 rounded-lg bg-red-50 px-2.5 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300"><Sparkles className="h-3.5 w-3.5 shrink-0" />{vi ? '“did not gave”?? Bạn vừa chia động từ hai lần một lúc — chọn một đi thôi 😅' : 'Use “did not give”: after “did”, use the base form.'}</p>
          <p className="mt-1.5 flex items-start gap-2 rounded-lg bg-blue-50 px-2.5 py-2 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><ArrowRight className="h-3.5 w-3.5 shrink-0" />{vi ? 'Gợi ý: ' : 'Suggestion: '}“I stayed resilient through the hardest weeks and refused to give up on my goal.”</p>
        </div>
      </div>
    </div>
  </section>;
}
function BookIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2V4ZM12 6v15" /></svg>; }
