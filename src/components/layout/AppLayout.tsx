import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  GraduationCap,
  FolderHeart,
  Users,
  Trophy,
  Search,
  PlusCircle,
  Compass,
  Repeat,
  AlertCircle,
  LogOut,
  Menu,
  X,
  BookOpen,
  ChevronRight,
  Flame,
  CheckCircle2,
  Sparkles,
  Layers,
  Sliders,
  BookX,
  TrendingUp
} from 'lucide-react';
import { useRouter } from '../../context/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { api, SetCard, PathCard } from '../../api/client';
import { DictionaryModal } from '../DictionaryModal';
import { FeedbackModal } from '../FeedbackModal';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { path, navigate } = useRouter();
  const { user, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dictOpen, setDictOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('oq_sidebar_expanded');
    return saved !== null ? saved === 'true' : true; // Default expanded matching Image 4
  });

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('oq_sidebar_expanded', String(next));
      return next;
    });
  };

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ sets: SetCard[]; paths: PathCard[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchRequest = useRef(0);

  // Due today count
  const [dueCount, setDueCount] = useState<number>(0);
  const [mistakesDueCount, setMistakesDueCount] = useState<number>(0);

  useEffect(() => {
    // Fetch summary for due badge
    api.getSrsSummary()
      .then(res => setDueCount(res.due_count))
      .catch(() => {});

    api.getMistakes({ limit: 1 })
      .then(res => setMistakesDueCount(res.summary?.due_count || 0))
      .catch(() => {});
  }, [path]);

  // Listen to openquiz:srs-updated to refresh due badge immediately
  useEffect(() => {
    const handleSrsUpdate = () => {
      api.getSrsSummary()
        .then(res => setDueCount(res.due_count))
        .catch(() => {});
    };
    window.addEventListener('openquiz:srs-updated', handleSrsUpdate);
    return () => window.removeEventListener('openquiz:srs-updated', handleSrsUpdate);
  }, []);

  // Handle click outside search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (val: string) => {
    const request = ++searchRequest.current;
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults(null);
      setShowSearchDropdown(false);
      return;
    }
    setSearching(true);
    setShowSearchDropdown(true);
    try {
      const res = await api.search(val.trim());
      if (request === searchRequest.current) setSearchResults(res);
    } catch {
      if (request === searchRequest.current) setSearchResults({ sets: [], paths: [] });
    } finally {
      if (request === searchRequest.current) setSearching(false);
    }
  };

  const navItems = [
    { label: 'Hôm nay', route: '/today', icon: Home },
    { label: 'Lộ trình của tôi', route: '/my-program', icon: GraduationCap },
    { label: 'Thư viện', route: '/my-created', icon: FolderHeart },
    { label: 'Luyện tập', route: '/practice', icon: Layers },
    { label: 'Ôn tập', route: '/repetition-study', icon: Repeat, badge: dueCount > 0 ? dueCount : undefined },
    { label: 'Sổ lỗi', route: '/mistakes', icon: BookX, badge: mistakesDueCount > 0 ? mistakesDueCount : undefined },
    { label: 'Tiến độ', route: '/progress', icon: TrendingUp },
  ];

  const secondaryItems = [
    { label: 'Lớp học', route: '/classes', icon: Users },
  ];

  const toolItems = [
    { label: 'Tra từ', action: () => setDictOpen(true), icon: Search },
    { label: 'Tạo bộ thẻ', action: () => navigate('/create-flashcard'), icon: PlusCircle },
    { label: 'Tạo lộ trình', action: () => navigate('/create-learning-path'), icon: Compass },
  ];

  const settingItems = [
    { label: 'Cài đặt học', route: '/settings/learning', icon: Sliders },
    { label: 'Cài đặt AI', route: '/settings/ai', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row antialiased font-sans">
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/logo.svg" alt="OpenLearn" className="w-8 h-8 rounded-xl shadow-xs shrink-0" />
          <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">OpenLearn</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer (Only visible on mobile when open) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-72 max-w-[80vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-r border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => { navigate('/'); setMobileMenuOpen(false); }}>
                <img src="/logo.svg" alt="OpenLearn" className="w-8 h-8 rounded-xl shadow-xs shrink-0" />
                <span className="font-black text-lg text-slate-900 dark:text-white">OpenLearn</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Links */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Menu chính</div>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    (item.route === '/today' && (path === '/today' || path === '/')) ||
                    (item.route === '/my-program' && (path.startsWith('/my-program') || path.startsWith('/courses'))) ||
                    (item.route !== '/today' && item.route !== '/my-program' && (path === item.route || path.startsWith(item.route)));
                  return (
                    <button
                      key={item.route}
                      onClick={() => { navigate(item.route); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                        isActive ? 'bg-slate-900 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Công cụ</div>
                {toolItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => { item.action(); setMobileMenuOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Mở rộng</div>
                {secondaryItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = path === item.route || path.startsWith(item.route);
                  return (
                    <button
                      key={item.route}
                      onClick={() => { navigate(item.route); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                        isActive ? 'bg-slate-900 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Cài đặt</div>
                {settingItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = path === item.route || path.startsWith(item.route);
                  return (
                    <button
                      key={item.route}
                      onClick={() => { navigate(item.route); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                        isActive ? 'bg-slate-900 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate text-slate-900 dark:text-white">{user?.name || 'Học viên'}</div>
                  <div className="text-[10px] text-slate-400 truncate">{user?.email || 'user@openquiz.ai'}</div>
                </div>
              </div>
              <button onClick={() => logout()} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar (Collapsible & Expandable, Matching Image 2 & Image 4 100%) */}
      <aside
        className={`hidden md:flex flex-col justify-between h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 transition-all duration-300 z-40 ${
          sidebarExpanded ? 'w-64 min-w-[256px] p-4' : 'w-[72px] min-w-[72px] py-4 items-center'
        }`}
      >
        {/* Top Section */}
        <div className={`flex flex-col gap-4 overflow-y-auto min-h-0 flex-1 ${sidebarExpanded ? 'pr-1' : 'items-center'}`}>
          {/* Logo & Toggle Header */}
          <div className={`flex items-center ${sidebarExpanded ? 'justify-between px-1' : 'justify-center flex-col gap-2'}`}>
            <div
              onClick={() => navigate('/')}
              title="OpenLearn Trang chủ"
              className="flex items-center gap-3 cursor-pointer group"
            >
              <img
                src="/logo.svg"
                alt="OpenLearn"
                className="w-10 h-10 rounded-2xl shadow-xs group-hover:scale-105 transition-transform shrink-0"
              />
              {sidebarExpanded && (
                <div>
                  <div className="font-black text-lg text-slate-900 dark:text-white tracking-tight leading-none">
                    OpenLearn
                  </div>
                  <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">
                    AI Platform
                  </div>
                </div>
              )}
            </div>

            {/* Collapse/Expand Toggle Button */}
            <button
              onClick={toggleSidebar}
              title={sidebarExpanded ? 'Thu gọn thanh bên' : 'Mở rộng thanh bên'}
              className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {sidebarExpanded ? (
                <ChevronRight className="w-4 h-4 rotate-180" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Main Navigation Items */}
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                (item.route === '/today' && (path === '/today' || path === '/')) ||
                (item.route === '/my-program' && (path.startsWith('/my-program') || path.startsWith('/courses'))) ||
                (item.route !== '/today' && item.route !== '/my-program' && (path === item.route || path.startsWith(item.route)));

              if (!sidebarExpanded) {
                return (
                  <button
                    key={item.route}
                    onClick={() => navigate(item.route)}
                    title={item.label}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center relative transition-all ${
                      isActive
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                        : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[2]" />
                    {item.badge !== undefined && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={item.route}
                  onClick={() => navigate(item.route)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className={`w-4 h-4 stroke-[2.2] ${isActive ? 'text-white dark:text-slate-900' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Dictionary Button (Inside expanded sidebar matching Screenshot 4) */}
          {sidebarExpanded ? (
            <button
              onClick={() => setDictOpen(true)}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition group"
            >
              <span className="text-indigo-400 dark:text-indigo-600 font-black group-hover:translate-x-0.5 transition-transform">&gt;</span>
              <span>Tra từ</span>
            </button>
          ) : (
            <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 my-1" />
          )}

          {/* Tools & Utilities */}
          <div className="space-y-1">
            {sidebarExpanded && (
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Công cụ
              </div>
            )}

            {/* Dict in collapsed */}
            {!sidebarExpanded && (
              <button
                onClick={() => setDictOpen(true)}
                title="Tra từ điển"
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Search className="w-5 h-5 stroke-[2]" />
              </button>
            )}

            {/* Create Set */}
            <button
              onClick={() => navigate('/create-flashcard')}
              title="Tạo bộ thẻ"
              className={
                sidebarExpanded
                  ? 'w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition'
                  : 'w-11 h-11 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition'
              }
            >
              <PlusCircle className="w-4 h-4 text-slate-400" />
              {sidebarExpanded && <span>Tạo bộ thẻ</span>}
            </button>

            {/* Create Path */}
            <button
              onClick={() => navigate('/create-learning-path')}
              title="Tạo lộ trình"
              className={
                sidebarExpanded
                  ? 'w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition'
                  : 'w-11 h-11 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition'
              }
            >
              <Compass className="w-4 h-4 text-slate-400" />
              {sidebarExpanded && <span>Tạo lộ trình</span>}
            </button>
          </div>

          {/* Secondary Area: Mở rộng (Lớp học) */}
          <div className="space-y-1">
            {sidebarExpanded ? (
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Mở rộng
              </div>
            ) : (
              <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 my-1" />
            )}

            {secondaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = path === item.route || path.startsWith(item.route);

              if (!sidebarExpanded) {
                return (
                  <button
                    key={item.route}
                    onClick={() => navigate(item.route)}
                    title={item.label}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                        : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[2]" />
                  </button>
                );
              }

              return (
                <button
                  key={item.route}
                  onClick={() => navigate(item.route)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 stroke-[2.2] ${isActive ? 'text-white dark:text-slate-900' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Settings Area: Cài đặt học & Cài đặt AI */}
          <div className="space-y-1">
            {sidebarExpanded ? (
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Cài đặt
              </div>
            ) : (
              <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 my-1" />
            )}

            {settingItems.map((item) => {
              const Icon = item.icon;
              const isActive = path === item.route || path.startsWith(item.route);

              if (!sidebarExpanded) {
                return (
                  <button
                    key={item.route}
                    onClick={() => navigate(item.route)}
                    title={item.label}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                        : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[2]" />
                  </button>
                );
              }

              return (
                <button
                  key={item.route}
                  onClick={() => navigate(item.route)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 stroke-[2.2] ${isActive ? 'text-white dark:text-slate-900' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom User Profile Section (Matching Screenshot 4) */}
        <div className={`pt-3 border-t border-slate-100 dark:border-slate-800/80 ${sidebarExpanded ? 'px-1' : 'flex flex-col items-center'}`}>
          {sidebarExpanded ? (
            <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'H'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user?.name || 'Đinh Hoàng Dũng'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    Tài khoản học tập
                  </div>
                </div>
              </div>
              <button
                onClick={() => logout()}
                title="Đăng xuất"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0 ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => logout()}
              title={`${user?.name || 'Đinh Hoàng Dũng'} - Bấm để đăng xuất`}
              className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-indigo-500 transition shadow-xs"
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'H'}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar (Hidden in full-screen study modes and courses views) */}
        {!(path.startsWith('/courses') || path.startsWith('/lesson-run') || path.startsWith('/study/') || path.startsWith('/exam/') || path.startsWith('/game/match/') || path.startsWith('/dictation/') || path.startsWith('/grammar/') || path.startsWith('/ai-study/') || path.startsWith('/conversation/')) && (
          <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30">
          {/* Search Box */}
          <div ref={searchRef} className="relative w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim()) setShowSearchDropdown(true);
              }}
              placeholder="Tìm kiếm bộ từ, lộ trình, chủ đề..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />

            {/* Search Dropdown Results */}
            {showSearchDropdown && searchResults && (
              <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                <div className="p-3">
                  {searching ? (
                    <div className="py-6 text-center text-xs text-slate-400">Đang tìm kiếm...</div>
                  ) : searchResults.sets.length === 0 && searchResults.paths.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">Không tìm thấy kết quả phù hợp</div>
                  ) : (
                    <>
                      {searchResults.sets.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                            Bộ từ vựng
                          </div>
                          {searchResults.sets.map((s) => (
                            <div
                              key={s.id}
                              onClick={() => {
                                navigate(`/study-set/${s.id}`);
                                setShowSearchDropdown(false);
                                setSearchQuery('');
                              }}
                              className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer flex items-center justify-between group transition"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                                  {s.title}
                                </div>
                                <div className="text-xs text-slate-400">{s.word_count} từ • {s.tag || 'Chung'}</div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                            </div>
                          ))}
                        </div>
                      )}

                      {searchResults.paths.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                            Lộ trình học
                          </div>
                          {searchResults.paths.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => {
                                navigate(`/learning-path/${p.id}`);
                                setShowSearchDropdown(false);
                                setSearchQuery('');
                              }}
                              className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer flex items-center justify-between group transition"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                                  {p.title}
                                </div>
                                <div className="text-xs text-slate-400">{p.set_count} bộ thẻ</div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-3">
            {/* Due Badge */}
            <button
              onClick={() => navigate('/repetition-study')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition shadow-xs"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Ôn tập hôm nay:</span>
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[11px]">
                {dueCount}
              </span>
            </button>

            {/* Streak Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 text-xs font-bold">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Tiếng Anh</span>
            </div>

            {/* Quick Create Button */}
            <button
              onClick={() => navigate('/create-flashcard')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Tạo bộ thẻ</span>
            </button>
          </div>
        </header>
        )}

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Floating Dictionary Button (Matching OpenQuiz screenshots 100%) */}
      <button
        onClick={() => setDictOpen(true)}
        title="Mở từ điển tra từ nhanh"
        className="fixed bottom-6 right-6 z-40 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 px-4 py-2.5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center gap-2 font-bold text-xs md:text-sm group scale-100 hover:scale-105 active:scale-95"
      >
        <span className="font-black text-indigo-400 dark:text-indigo-600 group-hover:translate-x-0.5 transition-transform">&gt;</span>
        <span>Tra từ</span>
      </button>

      {/* Global Modals */}
      <DictionaryModal isOpen={dictOpen} onClose={() => setDictOpen(false)} />
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
};

