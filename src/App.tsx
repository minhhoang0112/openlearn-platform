import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RouterProvider, useRouter } from "./context/RouterContext";
import { AppLayout } from "./components/layout/AppLayout";

// In-app Views
import { AuthView } from "./views/AuthView";
import { DashboardView } from "./views/DashboardView";
import { StudySetView } from "./views/StudySetView";
import { LearningPathView } from "./views/LearningPathView";
import { StudySessionView } from "./views/StudySessionView";
import { ExamSessionView } from "./views/ExamSessionView";
import { MatchingGameView } from "./views/MatchingGameView";
import { DictationView } from "./views/DictationView";
import { ComprehensiveLessonView } from "./views/ComprehensiveLessonView";
import { SpeakingView } from "./views/SpeakingView";
import { ConversationView } from "./views/ConversationView";
import { GrammarView } from "./views/GrammarView";
import { ReadingView } from "./views/ReadingView";
import { CoursesView } from "./views/CoursesView";
import { ClassesView } from "./views/ClassesView";
import { RankingView } from "./views/RankingView";
import { RepetitionStudyView } from "./views/RepetitionStudyView";
import { MyCreatedView } from "./views/MyCreatedView";
import { CreateFlashcardView } from "./views/CreateFlashcardView";
import { CreatePathView } from "./views/CreatePathView";
import { CategoryCatalogView } from "./views/CategoryCatalogView";
import { AiSettingsView } from "./views/AiSettingsView";
import { CourseLessonView } from "./views/CourseLessonView";
import { LearningSettingsView } from "./views/LearningSettingsView";
import { PracticeView } from "./views/PracticeView";
import { TodayView } from "./views/TodayView";
import { MyProgramView } from "./views/MyProgramView";
import { LessonRunView } from "./views/LessonRunView";
import { MistakesView } from "./views/MistakesView";
import { ProgressView } from "./views/ProgressView";
import { ListeningLibraryView } from "./views/ListeningLibraryView";
import { ListeningPracticeView } from "./views/ListeningPracticeView";
import { MaterialsHubView } from "./views/MaterialsHubView";
import { MaterialDetailView } from "./views/MaterialDetailView";
import { NotFoundView } from "./views/NotFoundView";
import { Loader2 } from "lucide-react";

const AppContent: React.FC = () => {
  const { user, loading, error, refreshUser } = useAuth();
  const { path, navigate } = useRouter();

  // Redirect root path to /today for logged-in user with replace to avoid Back button loop
  React.useEffect(() => {
    if (user && (path === "/" || path === "")) {
      navigate("/today", { replace: true });
    }
  }, [user, path, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-semibold">
          Đang kết nối OpenQuiz Platform...
        </p>
      </div>
    );
  }

  if (error)
    return (
      <div role="alert" className="p-8 text-center">
        <p>{error}</p>
        <button onClick={() => void refreshUser()}>Kết nối lại</button>
      </div>
    );
  if (!user) {
    return <AuthView />;
  }

  // Routing renderer
  const renderCurrentView = () => {
    if (/^\/courses\/\d+\/lesson\/\d+/.test(path)) return <CourseLessonView />;
    if (/^\/lesson-run\/[a-zA-Z0-9-]+/.test(path)) return <LessonRunView />;
    if (/^\/materials\/[a-zA-Z0-9-]+/.test(path)) return <MaterialDetailView />;
    if (path.startsWith("/materials")) return <MaterialsHubView />;
    if (/^\/listening\/practice\/[a-zA-Z0-9-]+/.test(path))
      return <ListeningPracticeView />;
    if (path.startsWith("/listening")) return <ListeningLibraryView />;
    if (path.startsWith("/today") || path === "/" || path === "")
      return <TodayView />;
    if (path.startsWith("/my-program")) return <MyProgramView />;
    if (path.startsWith("/mistakes")) return <MistakesView />;
    if (path.startsWith("/progress")) return <ProgressView />;
    if (path.startsWith("/settings/learning")) return <LearningSettingsView />;
    if (path.startsWith("/settings/ai")) return <AiSettingsView />;
    if (path.startsWith("/practice")) return <PracticeView />;
    if (path.startsWith("/explore")) return <DashboardView />;
    if (path.startsWith("/category/")) {
      return <CategoryCatalogView />;
    }
    if (path.startsWith("/study-set/")) {
      return <StudySetView />;
    }
    if (path.startsWith("/learning-path/")) {
      return <LearningPathView />;
    }
    if (path.startsWith("/study/")) {
      return <StudySessionView />;
    }
    if (path.startsWith("/exam/")) {
      return <ExamSessionView />;
    }
    if (path.startsWith("/game/match/")) {
      return <MatchingGameView />;
    }
    if (path.startsWith("/dictation/")) {
      return <DictationView />;
    }
    if (path.startsWith("/comprehensive/")) {
      return <ComprehensiveLessonView />;
    }
    if (path.startsWith("/ai-study/")) {
      return <SpeakingView />;
    }
    if (path.startsWith("/conversation/")) {
      return <ConversationView />;
    }
    if (path.startsWith("/grammar/")) {
      return <GrammarView />;
    }
    if (path.startsWith("/reading/")) {
      return <ReadingView />;
    }
    if (path.startsWith("/courses")) {
      return <CoursesView />;
    }
    if (path.startsWith("/classes") || path.startsWith("/class/")) {
      return <ClassesView />;
    }
    if (path.startsWith("/ranking")) {
      return <RankingView />;
    }
    if (path.startsWith("/repetition-study")) {
      return <RepetitionStudyView />;
    }
    if (path.startsWith("/my-created")) {
      return <MyCreatedView />;
    }
    if (path.startsWith("/create-learning-path")) return <CreatePathView />;
    if (path.startsWith("/create-flashcard")) {
      return <CreateFlashcardView />;
    }

    // Default: Not Found (never silently fall back to dashboard)
    return <NotFoundView />;
  };

  return <AppLayout>{renderCurrentView()}</AppLayout>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <RouterProvider>
        <AppContent />
      </RouterProvider>
    </AuthProvider>
  );
};

export default App;
