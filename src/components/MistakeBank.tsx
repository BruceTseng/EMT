import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trash2, 
  BookOpen, 
  Search, 
  Play, 
  HelpCircle, 
  Check, 
  Info, 
  ChevronDown, 
  ChevronUp,
  Award,
  AlertCircle,
  FileText
} from 'lucide-react';
import { Question } from '../types';
import { CHAPTER_DETAILS } from '../data/questions';

interface MistakeBankProps {
  questions: Question[];
  mistakeIds: string[];
  onRemoveMistake: (qId: string) => void;
  onClearAllMistakes: () => void;
  onStartQuiz: (config: {
    chapters: number[];
    type: 'all' | 'single_choice' | 'true_false';
    count: number;
    mode: 'study' | 'exam';
    isMistakesOnly: boolean;
  }) => void;
}

export default function MistakeBank({
  questions,
  mistakeIds,
  onRemoveMistake,
  onClearAllMistakes,
  onStartQuiz
}: MistakeBankProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);

  // Filter actual question objects that are marked as mistakes
  const mistakeQuestions = questions.filter((q) => mistakeIds.includes(q.id));

  // Search filter
  const filteredMistakes = mistakeQuestions.filter((q) => {
    const query = searchQuery.toLowerCase();
    const matchText = q.question.toLowerCase() || '';
    const matchExp = q.explanation?.toLowerCase() || '';
    const matchCh = q.chapterTitle.toLowerCase() || '';
    const matchTags = q.tags?.some(t => t.toLowerCase().includes(query)) || false;
    return matchText.includes(query) || matchExp.includes(query) || matchCh.includes(query) || matchTags;
  });

  const getChapterTitle = (chNum: number) => {
    const detail = CHAPTER_DETAILS.find(d => d.chapter === chNum);
    return detail ? detail.title : `章節 ${chNum}`;
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleStartMistakesQuiz = () => {
    // Collect all unique chapters represented in the current mistake list
    const chs = Array.from(new Set(mistakeQuestions.map(m => m.chapter)));
    onStartQuiz({
      chapters: chs.length > 0 ? chs : [1, 2, 3],
      type: 'all',
      count: mistakeQuestions.length,
      mode: 'study',
      isMistakesOnly: true
    } as any);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-500/10 to-orange-500/5 dark:from-rose-950/20 dark:to-orange-950/10 border border-rose-100 dark:border-rose-900/30 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertCircle size={24} />
            <h2 className="text-xl md:text-2xl font-black tracking-tight">個人專屬錯題練習庫</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
            這裡會自動彙整您在模擬測驗中答錯的題目。您可以透過「隨答隨改」模式逐題消滅這些弱點。只要在消滅戰中答對，該題便會自錯題庫中移除！
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {mistakeQuestions.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowConfirmClear(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/20 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-xl text-xs font-bold transition-all"
              >
                <Trash2 size={14} /> 清空錯題
              </button>
              <button
                type="button"
                onClick={handleStartMistakesQuiz}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <Play size={14} fill="currentColor" /> 啟動「錯題消滅戰」
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Stats and Search Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Count Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold block">錯題總數</span>
            <span className="text-3xl font-black font-mono text-rose-600">{mistakeQuestions.length} 題</span>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl">
            <FileText className="text-rose-600" size={24} />
          </div>
        </div>

        {/* Search Field */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl flex items-center gap-3">
          <Search className="text-slate-400 shrink-0 ml-1" size={18} />
          <input
            type="text"
            placeholder="搜尋題目關鍵字、解析說明或標籤標記..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-0 focus:ring-0 text-sm text-slate-700 dark:text-slate-300 outline-none"
          />
        </div>
      </div>

      {/* Mistake list container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        {filteredMistakes.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <HelpCircle size={48} className="mx-auto text-slate-300" />
            <h3 className="font-bold text-slate-600 dark:text-slate-300">目前沒有符合的錯題</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              太棒了！這代表您目前的複習狀態非常理想，或者目前的篩選條件沒有對應的資料。
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredMistakes.map((q, idx) => {
              const isExpanded = expandedId === q.id;
              const chTitle = getChapterTitle(q.chapter);

              return (
                <div 
                  key={q.id} 
                  className={`transition-colors ${
                    isExpanded 
                      ? 'bg-slate-50/50 dark:bg-slate-800/20' 
                      : 'hover:bg-slate-50/30'
                  }`}
                >
                  {/* Summary/Header row */}
                  <div 
                    onClick={() => toggleExpand(q.id)}
                    className="p-5 flex items-start gap-4 cursor-pointer select-none"
                  >
                    <span className="mt-1 h-6 w-6 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 text-rose-600 flex items-center justify-center font-bold font-mono text-[10px] shrink-0">
                      {idx + 1}
                    </span>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md font-bold font-mono uppercase">
                          {q.id}
                        </span>
                        <span className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md font-medium">
                          第 {q.chapter} 章：{chTitle.substring(0, 8)}...
                        </span>
                        {q.tags?.map(t => (
                          <span key={t} className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-xs font-medium">
                            #{t}
                          </span>
                        ))}
                      </div>

                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed truncate">
                        {q.question}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Manual delete button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveMistake(q.id);
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors"
                        title="已掌握，移出錯題庫"
                      >
                        <Trash2 size={15} />
                      </button>
                      
                      {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-slate-100 dark:border-slate-800/60"
                      >
                        <div className="p-5 pl-14 space-y-5 text-sm">
                          
                          {/* Full Question */}
                          <div className="space-y-1">
                            <span className="text-xs text-slate-400 font-bold block">完整考題題目：</span>
                            <p className="font-extrabold text-slate-800 dark:text-slate-100 leading-relaxed">
                              {q.question}
                            </p>
                          </div>

                          {/* Options list */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = oIdx === q.answerIndex;
                              return (
                                <div 
                                  key={oIdx}
                                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                                    isCorrect 
                                      ? 'border-emerald-500 bg-emerald-50/20 text-emerald-900 dark:text-emerald-200' 
                                      : 'border-slate-150 dark:border-slate-800 text-slate-500 bg-slate-50/20'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold font-mono text-[10px] ${
                                      isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    }`}>
                                      {q.type === 'true_false' ? (oIdx === 0 ? 'O' : 'X') : String.fromCharCode(65 + oIdx)}
                                    </span>
                                    <span>{opt}</span>
                                  </div>
                                  {isCorrect && <Check size={14} className="text-emerald-600 shrink-0" />}
                                </div>
                              );
                            })}
                          </div>

                          {/* Reference & Explanations */}
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-3 text-xs">
                            <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-bold">
                              <BookOpen size={15} />
                              <span>正確答案出處（PDF 參照頁面）</span>
                            </div>
                            
                            <p className="font-bold text-slate-700 dark:text-slate-200">
                              第 {q.chapter} 章：{getChapterTitle(q.chapter)} 
                              {q.pageStart && q.pageEnd ? `（第 ${q.pageStart} 至 ${q.pageEnd} 頁）` : ''}
                            </p>

                            <div className="border-t border-slate-200/50 dark:border-slate-700/50 pt-2.5 space-y-1">
                              <span className="font-bold text-slate-400">詳細解析：</span>
                              <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                {q.explanation || '本題考點為救護員基本常識，請參照最新 EMT 指引規範。'}
                              </p>
                            </div>

                            {q.practicalNote && (
                              <div className="border-t border-slate-200/50 dark:border-slate-700/50 pt-2.5 space-y-1">
                                <span className="font-bold text-amber-700 dark:text-amber-400">💡 臨床救護實務：</span>
                                <p className="text-slate-500 dark:text-slate-300 leading-relaxed font-medium">
                                  {q.practicalNote}
                                </p>
                              </div>
                            )}
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Dialog to clear all mistakes */}
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl max-w-sm w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-5"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle size={24} />
              <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">確定清空所有錯題？</h4>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              此動作將完全清除您目前所累積的 <span className="font-bold text-rose-500">{mistakeQuestions.length}</span> 題答錯紀錄，清除後將無法復原。
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAllMistakes();
                  setShowConfirmClear(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md"
              >
                確認清空
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
