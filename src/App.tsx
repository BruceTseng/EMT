import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Award, 
  History, 
  ListPlus, 
  AlertTriangle, 
  HelpCircle,
  User,
  GraduationCap,
  Sparkles,
  RefreshCcw,
  BookMarked
} from 'lucide-react';

import { Question, QuizSession, QuizHistory, ChapterProgress } from './types';
import { DEFAULT_QUESTIONS, CHAPTER_DETAILS } from './data/questions';

import Dashboard from './components/Dashboard';
import QuizEngine from './components/QuizEngine';
import MistakeBank from './components/MistakeBank';
import ProgressReport from './components/ProgressReport';
import QuestionImporter from './components/QuestionImporter';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mistakes' | 'history' | 'importer'>('dashboard');
  
  // Questions states
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [customQuestions, setCustomQuestions] = useState<Question[]>([]);
  
  // Persistent metrics states
  const [mistakeIds, setMistakeIds] = useState<string[]>([]);
  const [quizHistory, setQuizHistory] = useState<QuizHistory[]>([]);
  const [streak, setStreak] = useState<number>(1);
  const [lastQuizDate, setLastQuizDate] = useState<string>('');
  
  // Question tracking ledger (questionId -> { attempted: boolean, correct: boolean })
  const [progressLedger, setProgressLedger] = useState<{ [qId: string]: { attempted: boolean; correct: boolean } }>({});
  
  // Active test session state
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    try {
      // 1. Custom Questions
      const storedCustom = localStorage.getItem('emt1_custom_questions');
      let loadedCustom: Question[] = [];
      if (storedCustom) {
        loadedCustom = JSON.parse(storedCustom);
        setCustomQuestions(loadedCustom);
      }

      // Merge defaults and custom questions with duplicate ID prevention
      const mergedQuestions = [...DEFAULT_QUESTIONS, ...loadedCustom];
      const uniqueMap = new Map<string, Question>();
      mergedQuestions.forEach(q => uniqueMap.set(q.id, q));
      setQuestions(Array.from(uniqueMap.values()));

      // 2. Mistakes
      const storedMistakes = localStorage.getItem('emt1_mistakes');
      if (storedMistakes) {
        setMistakeIds(JSON.parse(storedMistakes));
      }

      // 3. History
      const storedHistory = localStorage.getItem('emt1_history');
      if (storedHistory) {
        setQuizHistory(JSON.parse(storedHistory));
      }

      // 4. Progress Ledger
      const storedLedger = localStorage.getItem('emt1_progress_ledger');
      if (storedLedger) {
        setProgressLedger(JSON.parse(storedLedger));
      }

      // 5. Streak and last date
      const storedStreak = localStorage.getItem('emt1_streak');
      if (storedStreak) {
        setStreak(parseInt(storedStreak));
      }
      const storedLastDate = localStorage.getItem('emt1_last_quiz_date');
      if (storedLastDate) {
        setLastQuizDate(storedLastDate);
        
        // Calculate streak decay or update if last quiz was yesterday
        const todayStr = new Date().toDateString();
        const lastStr = new Date(storedLastDate).toDateString();
        
        if (todayStr !== lastStr) {
          const diffTime = Math.abs(new Date(todayStr).getTime() - new Date(lastStr).getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 1) {
            // Streak broken, reset to 1
            setStreak(1);
            localStorage.setItem('emt1_streak', '1');
          }
        }
      }
    } catch (e) {
      console.error('Error loading localStorage data:', e);
    }
  }, []);

  // Update questions list when custom questions change
  useEffect(() => {
    const mergedQuestions = [...DEFAULT_QUESTIONS, ...customQuestions];
    const uniqueMap = new Map<string, Question>();
    mergedQuestions.forEach(q => uniqueMap.set(q.id, q));
    setQuestions(Array.from(uniqueMap.values()));
  }, [customQuestions]);

  // Handle new custom questions import
  const handleImportQuestions = (newQuestions: Question[]) => {
    const mergedCustom = [...customQuestions, ...newQuestions];
    const uniqueMap = new Map<string, Question>();
    mergedCustom.forEach(q => uniqueMap.set(q.id, q));
    const unique = Array.from(uniqueMap.values());
    setCustomQuestions(unique);
    localStorage.setItem('emt1_custom_questions', JSON.stringify(unique));
  };

  // Clear all custom questions
  const handleClearCustomQuestions = () => {
    setCustomQuestions([]);
    localStorage.removeItem('emt1_custom_questions');
    
    // Also remove from mistakes if those custom questions were there
    const customIds = customQuestions.map(q => q.id);
    const updatedMistakes = mistakeIds.filter(id => !customIds.includes(id));
    setMistakeIds(updatedMistakes);
    localStorage.setItem('emt1_mistakes', JSON.stringify(updatedMistakes));
  };

  // Remove a single mistake from the mistake book
  const handleRemoveMistake = (qId: string) => {
    const updated = mistakeIds.filter((id) => id !== qId);
    setMistakeIds(updated);
    localStorage.setItem('emt1_mistakes', JSON.stringify(updated));
  };

  // Clear all mistakes
  const handleClearAllMistakes = () => {
    setMistakeIds([]);
    localStorage.removeItem('emt1_mistakes');
  };

  // Triggered when user answers a question during quiz
  const handleAnswerQuestion = (qId: string, selectedIndex: number, isCorrect: boolean) => {
    // 1. Update mistake IDs
    let updatedMistakes = [...mistakeIds];
    if (isCorrect) {
      // If correct, remove from mistakes if present (especially during Mistakes Clearing session)
      updatedMistakes = updatedMistakes.filter((id) => id !== qId);
    } else {
      // If incorrect, add to mistakes if not already present
      if (!updatedMistakes.includes(qId)) {
        updatedMistakes.push(qId);
      }
    }
    setMistakeIds(updatedMistakes);
    localStorage.setItem('emt1_mistakes', JSON.stringify(updatedMistakes));

    // 2. Update progress ledger
    const updatedLedger = {
      ...progressLedger,
      [qId]: { attempted: true, correct: isCorrect }
    };
    setProgressLedger(updatedLedger);
    localStorage.setItem('emt1_progress_ledger', JSON.stringify(updatedLedger));
  };

  // Triggered when quiz completes
  const handleCompleteQuiz = (score: number, duration: number) => {
    if (!activeSession) return;

    // 1. Calculate stats from session questions
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    const isStudyMode = (activeSession as any).mode === 'study';

    activeSession.questions.forEach((q) => {
      // Find progress of this question in ledger
      const ledgerEntry = progressLedger[q.id];
      if (ledgerEntry) {
        if (ledgerEntry.correct) correctCount++;
        else wrongCount++;
      } else {
        skippedCount++;
      }
    });

    // Handle correct calculation based on active session answers
    // Let's retrieve from active session's mode
    const chapterNames = Array.from(new Set(activeSession.questions.map((q) => {
      const detail = CHAPTER_DETAILS.find(d => d.chapter === q.chapter);
      return detail ? detail.title : `章節 ${q.chapter}`;
    }))) as string[];

    // 2. Create history record
    const newRecord: QuizHistory = {
      id: activeSession.id,
      date: new Date().toISOString(),
      chapterNames: chapterNames,
      totalQuestions: activeSession.questions.length,
      correctAnswers: activeSession.questions.length - wrongCount - skippedCount,
      wrongAnswers: wrongCount,
      skippedAnswers: skippedCount,
      score: score,
      duration: duration,
      type: activeSession.type
    };

    const updatedHistory = [newRecord, ...quizHistory];
    setQuizHistory(updatedHistory);
    localStorage.setItem('emt1_history', JSON.stringify(updatedHistory));

    // 3. Update active session status to completed
    const updatedSession = {
      ...activeSession,
      isCompleted: true,
      score: score,
      duration: duration
    };
    setActiveSession(updatedSession);

    // 4. Update Streak metrics
    const todayStr = new Date().toDateString();
    let updatedStreak = streak;
    if (lastQuizDate) {
      const lastStr = new Date(lastQuizDate).toDateString();
      if (todayStr !== lastStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastStr === yesterday.toDateString()) {
          // Increment streak
          updatedStreak = streak + 1;
        } else {
          // Streak broken but restarted
          updatedStreak = 1;
        }
      }
    } else {
      updatedStreak = 1;
    }
    setStreak(updatedStreak);
    setLastQuizDate(new Date().toISOString());
    localStorage.setItem('emt1_streak', updatedStreak.toString());
    localStorage.setItem('emt1_last_quiz_date', new Date().toISOString());
  };

  // Handle Start Quiz
  const handleStartQuiz = (config: {
    chapters: number[];
    type: 'all' | 'single_choice' | 'true_false';
    count: number;
    mode: 'study' | 'exam';
    isMistakesOnly?: boolean;
    customQuestions?: Question[];
  }) => {
    let selectedQuestions: Question[] = [];

    if (config.customQuestions && config.customQuestions.length > 0) {
      selectedQuestions = config.customQuestions;
    } else {
      // Determine the pool to select questions from
      let pool = questions;
      
      // Filter by mistakes only if requested
      if (config.isMistakesOnly) {
        pool = questions.filter(q => mistakeIds.includes(q.id));
      } else {
        // Filter by selected chapters
        pool = questions.filter(q => config.chapters.includes(q.chapter));
      }

      // Filter by question type
      if (config.type !== 'all') {
        pool = pool.filter(q => q.type === config.type);
      }

      if (pool.length === 0) {
        alert('所選範圍無有效題目，請重新設定！');
        return;
      }

      // Randomize and slice
      const randomized = [...pool].sort(() => 0.5 - Math.random());
      selectedQuestions = randomized.slice(0, Math.min(config.count, pool.length));
    }

    const newSession: QuizSession = {
      id: `session-${Date.now()}`,
      startTime: new Date().toISOString(),
      chapters: config.chapters,
      questionCount: selectedQuestions.length,
      type: config.type,
      questions: selectedQuestions,
      attempts: {},
      isCompleted: false
    };

    // Store mode directly in session object using type assertion or expansion
    (newSession as any).mode = config.mode;
    (newSession as any).isMistakesOnly = config.isMistakesOnly || false;

    setActiveSession(newSession);
  };

  // Get aggregated stats for dashboard and progress report
  const getAggregatedStats = () => {
    const totalAnswered = Object.keys(progressLedger).length;
    const ledgerValues = Object.values(progressLedger) as { attempted: boolean; correct: boolean }[];
    const correctCount = ledgerValues.filter(p => p.correct).length;
    const averageAccuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    // Calculate progress for each chapter
    const uniqueChapters = (Array.from(new Set(questions.map((q) => q.chapter))) as number[]).sort((a, b) => a - b);
    
    const chapterProgress = uniqueChapters.map((chNum) => {
      const qInCh = questions.filter((q) => q.chapter === chNum);
      const attempted = qInCh.filter((q) => progressLedger[q.id]?.attempted).length;
      const correct = qInCh.filter((q) => progressLedger[q.id]?.correct).length;

      const qSample = questions.find(q => q.chapter === chNum);
      const title = qSample ? qSample.chapterTitle : `自訂章節 ${chNum}`;

      return {
        chapter: chNum,
        title: title,
        total: qInCh.length,
        attempted: attempted,
        correct: correct
      };
    });

    return {
      totalAnswered,
      averageAccuracy,
      streak,
      chapterProgress
    };
  };

  const appStats = getAggregatedStats();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans">
      
      {/* Top Professional Header Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <GraduationCap size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-slate-800 dark:text-slate-100 block leading-tight">
                EMT-1 模擬測驗系統
              </span>
              <span className="text-[10px] text-slate-400 font-bold tracking-wider">
                國家法定初級救護員備考輔助
              </span>
            </div>
          </div>

          {/* User status info */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">tseng1985@gmail.com</span>
              <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-1 justify-end">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span> 已認證備考帳號
              </span>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <User size={15} className="text-slate-500" />
            </div>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6">
        {activeSession ? (
          // Immersive test screen active
          <QuizEngine
            session={activeSession}
            onAnswer={handleAnswerQuestion}
            onComplete={handleCompleteQuiz}
            onExit={() => setActiveSession(null)}
          />
        ) : (
          // Tabbed Dashboard view
          <div className="space-y-6">
            {/* Elegant Tab Selectors */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-900/60 p-1.5 rounded-2xl w-fit border border-slate-200/50 dark:border-slate-800/40">
              {[
                { id: 'dashboard', label: '首頁控制台', icon: <BookOpen size={15} /> },
                { id: 'mistakes', label: `錯題練習庫 (${mistakeIds.length})`, icon: <AlertTriangle size={15} /> },
                { id: 'history', label: '歷史與進度', icon: <History size={15} /> },
                { id: 'importer', label: '匯入自訂考題', icon: <ListPlus size={15} /> }
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Active Tab rendering */}
            <div className="min-h-[500px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === 'dashboard' && (
                    <Dashboard
                      questions={questions}
                      mistakeCount={mistakeIds.length}
                      historyCount={quizHistory.length}
                      onStartQuiz={handleStartQuiz}
                      stats={appStats}
                      progressLedger={progressLedger}
                      mistakeIds={mistakeIds}
                    />
                  )}

                  {activeTab === 'mistakes' && (
                    <MistakeBank
                      questions={questions}
                      mistakeIds={mistakeIds}
                      onRemoveMistake={handleRemoveMistake}
                      onClearAllMistakes={handleClearAllMistakes}
                      onStartQuiz={handleStartQuiz}
                    />
                  )}

                  {activeTab === 'history' && (
                    <ProgressReport
                      history={quizHistory}
                      questions={questions}
                      stats={appStats}
                    />
                  )}

                  {activeTab === 'importer' && (
                    <QuestionImporter
                      customQuestionsCount={customQuestions.length}
                      onImportQuestions={handleImportQuestions}
                      onClearCustomQuestions={handleClearCustomQuestions}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* Sticky footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 py-6 mt-12 text-center text-xs text-slate-400">
        <p className="font-semibold">© 2026 EMT-1 模擬考題系統 • 醫學倫理與救護規範保障</p>
        <p className="mt-1">由 AI Studio 深度協作打造，提供安全且完全符合標準教材之院前緊急救護備考資源。</p>
      </footer>

    </div>
  );
}
