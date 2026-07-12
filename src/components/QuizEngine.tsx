import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  BookOpen, 
  Clock, 
  Send, 
  AlertCircle, 
  RefreshCcw, 
  HelpCircle,
  Home,
  Bookmark,
  CheckCircle2,
  XCircle,
  Award,
  Info
} from 'lucide-react';
import { Question, QuizSession } from '../types';
import { CHAPTER_DETAILS } from '../data/questions';

interface QuizEngineProps {
  session: QuizSession;
  onAnswer: (questionId: string, selectedIndex: number, isCorrect: boolean) => void;
  onComplete: (score: number, duration: number) => void;
  onExit: () => void;
}

export default function QuizEngine({
  session,
  onAnswer,
  onComplete,
  onExit
}: QuizEngineProps) {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<{ [qId: string]: number }>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0); // elapsed seconds
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);
  const [reviewMode, setReviewMode] = useState<boolean>(false);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(false);

  // Auto-saved state of which questions are answered in study mode to freeze them
  const [studyAnswered, setStudyAnswered] = useState<{ [qId: string]: { selected: number; isCorrect: boolean } }>({});

  const questions = session.questions;
  const currentQuestion = questions[currentIdx];

  const nextTimerRef = useRef<any>(null);

  // Scroll to top when question changes
  useEffect(() => {
    // Scroll window smoothly to the top to avoid manual scrolling
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Clear any pending auto-advance timer when moving to another question manually
    if (nextTimerRef.current) {
      clearTimeout(nextTimerRef.current);
    }
  }, [currentIdx]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (nextTimerRef.current) {
        clearTimeout(nextTimerRef.current);
      }
    };
  }, []);

  // Timer Effect
  useEffect(() => {
    if (session.isCompleted || reviewMode) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [session.isCompleted, reviewMode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionIdx: number) => {
    if (session.isCompleted || reviewMode) return;

    const isStudy = (session as any).mode === 'study';
    if (isStudy) {
      if (studyAnswered[currentQuestion.id] !== undefined) return; // already selected
      const isCorrect = optionIdx === currentQuestion.answerIndex;
      setStudyAnswered(prev => ({
        ...prev,
        [currentQuestion.id]: { selected: optionIdx, isCorrect }
      }));
      onAnswer(currentQuestion.id, optionIdx, isCorrect);

      // In Study mode, if autoAdvance is checked and the user answers correctly, 
      // automatically move to the next question after a brief delay (1200ms) to read the checkmark
      if (autoAdvance && isCorrect && currentIdx < questions.length - 1) {
        if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
        nextTimerRef.current = setTimeout(() => {
          setCurrentIdx(prev => prev + 1);
        }, 1200);
      }
    } else {
      // Exam mode: allow changing answers silently
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: optionIdx
      }));

      // In Exam mode, automatically move to the next question after 500ms so they see selection change feedback
      if (autoAdvance && currentIdx < questions.length - 1) {
        if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
        nextTimerRef.current = setTimeout(() => {
          setCurrentIdx(prev => prev + 1);
        }, 500);
      }
    }
  };

  const getChapterReference = (q: Question) => {
    const detail = CHAPTER_DETAILS.find(d => d.chapter === q.chapter);
    const chapterLabel = detail ? `第 ${q.chapter} 章 ${detail.title}` : `第 ${q.chapter} 章 ${q.chapterTitle}`;
    const pageLabel = q.pageStart && q.pageEnd ? `（第 ${q.pageStart} - ${q.pageEnd} 頁）` : '';
    return `${chapterLabel}${pageLabel}`;
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const getUnansweredCount = () => {
    const isStudy = (session as any).mode === 'study';
    if (isStudy) {
      return questions.filter(q => studyAnswered[q.id] === undefined).length;
    } else {
      return questions.filter(q => answers[q.id] === undefined).length;
    }
  };

  const handleSubmitExam = () => {
    const isStudy = (session as any).mode === 'study';
    if (isStudy) {
      // In study mode, finalize exam immediately
      let correct = 0;
      let wrong = 0;
      let skipped = 0;

      questions.forEach(q => {
        const ans = studyAnswered[q.id];
        if (ans === undefined) skipped++;
        else if (ans.isCorrect) correct++;
        else wrong++;
      });

      const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
      setReviewMode(true);
      onComplete(score, timeLeft);
    } else {
      // In exam mode, grade all at once
      let correct = 0;
      let wrong = 0;
      let skipped = 0;

      questions.forEach(q => {
        const userAns = answers[q.id];
        if (userAns === undefined) {
          skipped++;
          // Register as skipped, but still trigger answer with wrong to log it in mistakes
          onAnswer(q.id, -1, false);
        } else {
          const isCorrect = userAns === q.answerIndex;
          if (isCorrect) correct++;
          else wrong++;
          onAnswer(q.id, userAns, isCorrect);
        }
      });

      const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
      setReviewMode(true);
      onComplete(score, timeLeft);
    }
    setShowConfirmSubmit(false);
  };

  const isStudy = (session as any).mode === 'study';
  const hasUserAnsweredCurrent = isStudy 
    ? studyAnswered[currentQuestion.id] !== undefined 
    : answers[currentQuestion.id] !== undefined;

  const currentSelectedOption = isStudy 
    ? studyAnswered[currentQuestion.id]?.selected 
    : answers[currentQuestion.id];

  const currentIsCorrect = isStudy 
    ? studyAnswered[currentQuestion.id]?.isCorrect 
    : (reviewMode ? answers[currentQuestion.id] === currentQuestion.answerIndex : null);

  return (
    <div className="space-y-6 pb-28">
      {/* Quiz Top Action Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Home size={20} />
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block tracking-wider uppercase">
              {isStudy ? '學習模式 (即時解析)' : '模擬考試模式 (整卷批改)'}
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {questions.length} 題測驗 • 第 {currentIdx + 1} 題
            </span>
          </div>
        </div>

        {/* Timer & Submit Button */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-mono text-sm font-bold">
            <Clock size={16} className="text-slate-500" />
            {formatTime(timeLeft)}
          </div>

          {!reviewMode && (
            <button
              onClick={() => setShowConfirmSubmit(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all"
            >
              <Send size={15} /> 交卷
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Quiz Area and Nav Map */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Question Panel */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6"
            >
              {/* Category, Difficulty & Chapter Tags */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-md text-xs font-bold font-mono">
                    {currentQuestion.id.toUpperCase()}
                  </span>
                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md text-xs font-semibold">
                    {currentQuestion.type === 'single_choice' ? '選擇題' : '是非題'}
                  </span>
                </div>
                
                <span className="text-xs text-slate-400 font-medium">
                  出處：{getChapterReference(currentQuestion)}
                </span>
              </div>

              {/* Question Text */}
              <div className="space-y-4">
                <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100 leading-relaxed">
                  {currentQuestion.question}
                </p>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((option, optIdx) => {
                  const isSelected = currentSelectedOption === optIdx;
                  
                  // Styles depending on state: study mode instant correction vs exam mode standard selection
                  let optionStyle = "border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40";
                  let iconElement = null;

                  if (isStudy && hasUserAnsweredCurrent) {
                    const isCorrectOption = optIdx === currentQuestion.answerIndex;
                    if (isCorrectOption) {
                      optionStyle = "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 font-semibold";
                      iconElement = <CheckCircle2 size={18} className="text-emerald-600" />;
                    } else if (isSelected) {
                      optionStyle = "border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 text-rose-950 dark:text-rose-200 font-semibold";
                      iconElement = <XCircle size={18} className="text-rose-600" />;
                    } else {
                      optionStyle = "border-slate-100 dark:border-slate-800/50 text-slate-400 opacity-60";
                    }
                  } else if (reviewMode) {
                    // review mode after final submission
                    const isCorrectOption = optIdx === currentQuestion.answerIndex;
                    const wasSelected = answers[currentQuestion.id] === optIdx;
                    if (isCorrectOption) {
                      optionStyle = "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 font-semibold";
                      iconElement = <CheckCircle2 size={18} className="text-emerald-600" />;
                    } else if (wasSelected) {
                      optionStyle = "border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 text-rose-950 dark:text-rose-200 font-semibold";
                      iconElement = <XCircle size={18} className="text-rose-600" />;
                    } else {
                      optionStyle = "border-slate-100 dark:border-slate-800/50 text-slate-400 opacity-60";
                    }
                  } else {
                    // Normal active taking test
                    if (isSelected) {
                      optionStyle = "border-blue-500 bg-blue-50/30 dark:bg-blue-950/10 text-blue-900 dark:text-blue-200 font-semibold shadow-xs";
                    }
                  }

                  const getOptionLetter = (idx: number) => {
                    if (currentQuestion.type === 'true_false') {
                      return idx === 0 ? 'O' : 'X';
                    }
                    return String.fromCharCode(65 + idx); // A, B, C, D
                  };

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={hasUserAnsweredCurrent || reviewMode}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`flex items-center justify-between p-4 rounded-2xl border text-left card-hover-effect transition-all text-sm font-medium ${optionStyle}`}
                    >
                      <div className="flex items-center gap-3.5 pr-2">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold font-mono border text-xs transition-colors shrink-0 ${
                          isSelected 
                            ? 'bg-blue-600 border-blue-600 text-white' 
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}>
                          {getOptionLetter(optIdx)}
                        </span>
                        <span className="leading-relaxed">{option}</span>
                      </div>
                      {iconElement}
                    </button>
                  );
                })}
              </div>

              {/* Instant Explanation Board (Study Mode only, or Review Mode) */}
              {(reviewMode || (isStudy && hasUserAnsweredCurrent)) && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 md:p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-700/50 pb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen size={18} className="text-blue-600" />
                      <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">詳細解析說明</span>
                    </div>
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                      PDF 對應頁碼
                    </span>
                  </div>

                  {/* Reference Address */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex items-start gap-2.5">
                    <Info size={15} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-slate-400 block mb-0.5">教材正確答案出處：</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {getChapterReference(currentQuestion)}
                      </span>
                    </div>
                  </div>

                  {/* Detailed Explanation Text */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400">解析內文：</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {currentQuestion.explanation || '本題考點為救護員專業基本常識，請熟記法規及應變流程。'}
                    </p>
                  </div>

                  {/* Practical Note / Clinical context */}
                  {currentQuestion.practicalNote && (
                    <div className="mt-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-100/50 dark:border-amber-900/40 text-xs space-y-1">
                      <span className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1">
                        💡 實務臨床備註要點
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        {currentQuestion.practicalNote}
                      </p>
                    </div>
                  )}

                  {/* Convenient "Next Question" helper button right inside the explanation section to avoid scrolling down */}
                  {isStudy && !reviewMode && (
                    <div className="pt-4 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-end">
                      {currentIdx === questions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setShowConfirmSubmit(true)}
                          className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all"
                        >
                          <Send size={15} /> 送出結算
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleNext}
                          className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all"
                        >
                          下一題 <ChevronRight size={15} />
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Bottom Next/Prev Pagination */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border font-bold text-xs transition-colors ${
                currentIdx === 0
                  ? 'bg-slate-50 dark:bg-slate-800 text-slate-300 border-slate-100 dark:border-slate-800 cursor-not-allowed'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <ChevronLeft size={16} /> 上一題
            </button>

            <span className="text-xs text-slate-400 font-bold font-mono">
              第 {currentIdx + 1} 頁 / 共 {questions.length} 頁
            </span>

            {currentIdx === questions.length - 1 ? (
              !reviewMode ? (
                <button
                  onClick={() => setShowConfirmSubmit(true)}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all"
                >
                  <Send size={15} /> 交卷結算
                </button>
              ) : (
                <button
                  onClick={onExit}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-800 hover:bg-slate-950 text-white rounded-xl font-bold text-xs shadow-md transition-all"
                >
                  回主控制台
                </button>
              )
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs transition-colors"
              >
                下一題 <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Nav Map & Session Score */}
        <div className="space-y-6">
          {/* Correction Score Board if completed */}
          {reviewMode && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-radial from-slate-900 to-slate-950 text-white rounded-3xl p-5 border border-slate-800 text-center space-y-4"
            >
              <Award size={48} className="text-amber-400 mx-auto" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block">
                  測驗最終評分
                </span>
                <span className="text-4xl font-black font-mono tracking-tight text-amber-300">
                  {session.score !== undefined ? session.score : 0}分
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 text-center border-t border-b border-slate-800 text-xs">
                <div>
                  <span className="text-emerald-500 block font-black">
                    {questions.filter(q => isStudy ? studyAnswered[q.id]?.isCorrect : (answers[q.id] === q.answerIndex)).length}
                  </span>
                  <span className="text-slate-400 text-[10px]">答對</span>
                </div>
                <div>
                  <span className="text-rose-500 block font-black">
                    {questions.filter(q => isStudy ? (studyAnswered[q.id] !== undefined && !studyAnswered[q.id].isCorrect) : (answers[q.id] !== undefined && answers[q.id] !== q.answerIndex)).length}
                  </span>
                  <span className="text-slate-400 text-[10px]">答錯</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-black">
                    {questions.filter(q => isStudy ? studyAnswered[q.id] === undefined : (answers[q.id] === undefined)).length}
                  </span>
                  <span className="text-slate-400 text-[10px]">未答</span>
                </div>
              </div>

              <button
                onClick={onExit}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-colors"
              >
                回到首頁
              </button>
            </motion.div>
          )}

          {/* Question Nav Map */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
              <span>題目導航圖</span>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono text-slate-500">
                {currentIdx + 1}/{questions.length}
              </span>
            </h3>

            {/* Auto advance toggle option */}
            {!reviewMode && (
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100/60 dark:border-slate-800/60">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  答題後自動跳下一題
                </span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoAdvance}
                    onChange={(e) => setAutoAdvance(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            )}

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = currentIdx === idx;
                const isAns = isStudy ? studyAnswered[q.id] !== undefined : answers[q.id] !== undefined;

                let btnStyle = "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400";
                
                if (reviewMode) {
                  const userChoice = answers[q.id];
                  const correctAns = q.answerIndex;
                  const isUserCorrect = isStudy ? studyAnswered[q.id]?.isCorrect : (userChoice === correctAns);

                  if (userChoice === undefined && studyAnswered[q.id] === undefined) {
                    btnStyle = "bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-400";
                  } else if (isUserCorrect) {
                    btnStyle = "bg-emerald-500 border-emerald-500 text-white font-bold";
                  } else {
                    btnStyle = "bg-rose-500 border-rose-500 text-white font-bold";
                  }
                } else if (isStudy) {
                  const wasAnswered = studyAnswered[q.id];
                  if (wasAnswered) {
                    btnStyle = wasAnswered.isCorrect 
                      ? "bg-emerald-50 border-emerald-400 text-emerald-700 font-bold" 
                      : "bg-rose-50 border-rose-400 text-rose-700 font-bold";
                  }
                } else {
                  // Exam Mode regular
                  if (isAns) {
                    btnStyle = "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600 dark:text-blue-300 font-bold";
                  }
                }

                if (isCurrent) {
                  btnStyle += " ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-slate-900";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 w-9 text-xs font-bold font-mono rounded-xl border flex items-center justify-center transition-all ${btnStyle}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] space-y-1.5 text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-slate-100 dark:bg-slate-800 border rounded-xs"></div>
                <span>未作答</span>
              </div>
              {!reviewMode && !isStudy && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-blue-50 border border-blue-500 rounded-xs"></div>
                  <span>已標記解答</span>
                </div>
              )}
              {(reviewMode || isStudy) && (
                <>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-xs"></div>
                    <span>答對</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-rose-500 rounded-xs"></div>
                    <span>答錯</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Confirmation Submit Dialog Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl max-w-md w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6"
          >
            <div className="flex items-center gap-3 text-amber-500">
              <AlertCircle size={28} />
              <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">準備交卷結算？</h4>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              您目前還有 <span className="font-extrabold text-rose-500">{getUnansweredCount()}</span> 題尚未回答。
              送出試卷後，系統將立即為您批改考卷並計算最終成績，並將答錯的題目彙整至您的錯題練習庫中。
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors"
              >
                繼續作答
              </button>
              <button
                type="button"
                onClick={handleSubmitExam}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                確認送出
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 浮動式下導航列：始終在螢幕下方，解決上下滑動的麻煩 */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 md:px-0">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-2xl rounded-2xl p-3 flex items-center justify-between gap-4"
        >
          
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className={`flex items-center justify-center h-10 w-10 md:w-auto md:px-4 rounded-xl border font-extrabold text-xs transition-colors shrink-0 ${
              currentIdx === 0
                ? 'bg-slate-50 dark:bg-slate-800 text-slate-300 border-slate-100 dark:border-slate-800 cursor-not-allowed'
                : 'bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
            title="上一題"
          >
            <ChevronLeft size={18} /> <span className="hidden md:inline ml-1">上一題</span>
          </button>

          <div className="text-center">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono block">
              第 {currentIdx + 1} 題 / 共 {questions.length} 題
            </span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold tracking-wider block">
              {reviewMode ? '複習模式' : isStudy ? '學習模式' : '模擬考試模式'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentIdx === questions.length - 1 ? (
              !reviewMode ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(true)}
                  className="flex items-center gap-1.5 h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all shrink-0"
                >
                  <Send size={15} /> 交卷結算
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onExit}
                  className="flex items-center gap-1.5 h-10 px-5 bg-slate-800 hover:bg-slate-950 text-white rounded-xl font-extrabold text-xs shadow-md transition-all shrink-0"
                >
                  回控制台
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center justify-center gap-1 h-10 w-10 md:w-auto md:px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all shrink-0"
                title="下一題"
              >
                <span className="hidden md:inline mr-1">下一題</span> <ChevronRight size={18} />
              </button>
            )}
          </div>

        </motion.div>
      </div>
    </div>
  );
}
