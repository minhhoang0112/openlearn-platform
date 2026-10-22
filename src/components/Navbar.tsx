import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Globe,
  Menu,
  X,
  Sparkles,
  BookOpen,
  MessageSquare,
  Users,
  ShoppingBag,
  Zap
} from 'lucide-react';
import { GoogleChromeIcon } from './Icons';

interface NavbarProps {
  lang: 'vi' | 'en';
  setLang: (lang: 'vi' | 'en') => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  onOpenStudy: () => void;
  onOpenCourses: () => void;
  onOpenConversation: () => void;
  onOpenClassroom: () => void;
  onOpenShop: () => void;
  onOpenPayment: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  setLang,
  isDark,
  setIsDark,
  onOpenStudy,
  onOpenCourses,
  onOpenConversation,
  onOpenClassroom,
  onOpenShop,
  onOpenPayment
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const t = {
    courses: lang === 'vi' ? 'Khóa học' : 'Courses',
    aiSpeak: lang === 'vi' ? 'AI Luyện nói' : 'AI Speaking',
    classroom: lang === 'vi' ? 'Lớp học (LMS)' : 'Classroom',
    shop: lang === 'vi' ? 'Cửa hàng' : 'Shop',
    pricing: lang === 'vi' ? 'Nâng cấp VIP' : 'Upgrade VIP',
    studyFree: lang === 'vi' ? 'Học miễn phí' : 'Study Free',
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo and Brand */}
        <a href="#" className="flex items-center gap-2 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-[10px] overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
            <img
              src="/logo.svg"
              alt="OpenQuiz Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <span className="text-lg font-black tracking-tight text-foreground">
            OpenQuiz
          </span>
          <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            AI 2.0
          </span>
        </a>

        {/* Desktop Navigation Links to Full Features */}
        <nav className="hidden items-center gap-1 md:flex">
          <button
            onClick={onOpenCourses}
            className="flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5 text-blue-500" />
            <span>{t.courses}</span>
          </button>

          <button
            onClick={onOpenConversation}
            className="flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
            <span>{t.aiSpeak}</span>
          </button>

          <button
            onClick={onOpenClassroom}
            className="flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Users className="h-3.5 w-3.5 text-purple-500" />
            <span>{t.classroom}</span>
          </button>

          <button
            onClick={onOpenShop}
            className="flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-amber-500" />
            <span>{t.shop}</span>
          </button>

          <button
            onClick={onOpenPayment}
            className="flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>{t.pricing}</span>
          </button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
            className="flex items-center gap-1.5 rounded-[8px] border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Đổi ngôn ngữ"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Chuyển chế độ sáng/tối"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* CTA Button */}
          <button
            onClick={onOpenStudy}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-bold ring-offset-background transition-all bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3.5 rounded-[8px] shadow-sm active:scale-95"
          >
            <GoogleChromeIcon className="h-4 w-4" />
            <span>{t.studyFree}</span>
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-border text-muted-foreground hover:text-foreground md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="border-b bg-background px-4 py-4 md:hidden animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-2 text-sm font-semibold">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenCourses();
              }}
              className="flex items-center gap-2 text-left py-2 text-muted-foreground hover:text-foreground"
            >
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span>{t.courses}</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenConversation();
              }}
              className="flex items-center gap-2 text-left py-2 text-muted-foreground hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4 text-emerald-500" />
              <span>{t.aiSpeak}</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenClassroom();
              }}
              className="flex items-center gap-2 text-left py-2 text-muted-foreground hover:text-foreground"
            >
              <Users className="h-4 w-4 text-purple-500" />
              <span>{t.classroom}</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenShop();
              }}
              className="flex items-center gap-2 text-left py-2 text-muted-foreground hover:text-foreground"
            >
              <ShoppingBag className="h-4 w-4 text-amber-500" />
              <span>{t.shop}</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPayment();
              }}
              className="flex items-center gap-2 text-left py-2 text-emerald-600 font-bold"
            >
              <Zap className="h-4 w-4" />
              <span>{t.pricing}</span>
            </button>
            <div className="pt-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenStudy();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-[8px] bg-primary py-2.5 text-xs font-bold text-primary-foreground"
              >
                <Sparkles className="h-4 w-4" />
                {t.studyFree}
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
