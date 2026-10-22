import { Eye, Heart, ExternalLink } from 'lucide-react';
import { mockTestimonials } from '../data/mockData';

export function SocialProofSection({ lang }: { lang: 'vi' | 'en' }) {
  return <section className="social-section border-b py-14">
    <div className="mx-auto max-w-7xl px-4 sm:px-6"><p className="section-eyebrow">{lang === 'vi' ? 'Cộng đồng' : 'Community'}</p><h2 className="section-title">{lang === 'vi' ? 'Hàng trăm nghìn người đang nói về OpenQuiz' : 'Hundreds of thousands are talking about OpenQuiz'}</h2></div>
    <div className="social-carousel mx-auto mt-5 flex max-w-[1328px] snap-x gap-4 overflow-x-auto px-6 pb-3">
      {mockTestimonials.map(post => <article key={post.url} className={`relative flex min-h-72 w-[242px] shrink-0 snap-start flex-col rounded-lg border p-4 ${post.platform === 'TikTok' ? 'bg-gradient-to-br from-black to-zinc-800 text-white' : 'bg-card'}`}>
        <div className="mb-5 flex justify-between"><span className={`rounded-md px-2 py-1 text-xs ${post.platform === 'TikTok' ? 'bg-white text-black' : 'border border-blue-200 bg-blue-50 text-blue-600'}`}>{post.platform}</span><ExternalLink className="h-4 w-4 opacity-70" /></div>
        <p className={`text-sm ${post.platform === 'TikTok' ? 'text-teal-200' : 'text-muted-foreground'}`}>{post.platform === 'Threads' ? post.handle : post.tag}</p>
        <h3 className="mt-5 text-3xl font-extrabold">{post.title}</h3>
        {post.platform === 'TikTok' && <p className="mt-3 text-sm opacity-70">{post.handle}</p>}
        <div className="mt-auto flex gap-4 pt-7 text-xs">{post.likes && <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{post.likes}</span>}{post.views && <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{post.views}</span>}</div>
        <p className="mt-4 text-xs opacity-60">{lang === 'vi' ? 'Mở bài gốc' : 'Open original post'}</p>
        <a className="absolute inset-0 rounded-lg focus-visible:ring-2 focus-visible:ring-teal-500" href={post.url} target="_blank" rel="noopener noreferrer" aria-label={`${lang === 'vi' ? 'Mở bài gốc' : 'Open original post'} — ${post.title} on ${post.platform}`} />
      </article>)}
    </div>
  </section>;
}
