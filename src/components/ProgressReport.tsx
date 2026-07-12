import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Award, 
  BookOpen, 
  Eye, 
  Check, 
  X, 
  HelpCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FolderOpen
} from 'lucide-react';
import { QuizHistory, Question } from '../types';
import { CHAPTER_DETAILS } from '../data/questions';

interface ProgressReportProps {
  history: QuizHistory[];
  questions: Question[];
  stats: {
    totalAnswered: number;
    averageAccuracy: number;
    chapterProgress: {
      chapter: number;
      title: string;
      total: number;
      attempted: number;
      correct: number;
    }[];
  };
}

export default function ProgressReport({
  history,
  questions,
  stats
}: ProgressReportProps) {
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [expandedHistoryQ, setExpandedHistoryQ] = useState<string | null>(null);

  const averageScore = history.length > 0 
    ? Math.round(history.reduce((acc, h) => acc + h.score, 0) / history.length)
    : 0;

  const highestScore = history.length > 0
    ? Math.max(...history.map(h => h.score))
    : 0;

  const totalTime = history.length > 0
    ? history.reduce((acc, h) => acc + h.duration, 0)
    : 0;

  const formatTotalTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs} 小時 ${mins} 分鐘`;
    }
    return `${mins} 分鐘 ${seconds % 60} 秒`;
  };

  const getChapterTitle = (chNum: number) => {
    const detail = CHAPTER_DETAILS.find(d => d.chapter === chNum);
    return detail ? detail.title : `章節 ${chNum}`;
  };

  // Extract a list of weak tags based on custom tags in wrong answers, if we have that level of telemetry.
  // Alternatively, we can calculate weak chapters or write down dynamic, helpful advice!
  const weakChapters = [...stats.chapterProgress]
    .filter(cp => cp.attempted > 0)
    .map(cp => {
      const acc = cp.attempted > 0 ? (cp.correct / cp.attempted) * 100 : 100;
      return { ...cp, acc };
    })
    .sort((a, b) => a.acc - b.acc);

  return (
    <div className="space-y-8">
      {/* Visual Progress Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Study summary stats */}
        <div className="bg-radial from-slate-800 to-slate-950 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">累計備考總時長</span>
            <div className="p-2.5 bg-slate-800/60 rounded-xl">
              <Clock size={20} className="text-blue-400" />
            </div>
          </div>
          <div className="mt-6">
            <span className="text-2xl font-black block tracking-tight">
              {formatTotalTime(totalTime)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">
              由每次模擬測驗時間累計而成
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">歷史平均成績</span>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
              <Award size={20} className="text-emerald-600" />
            </div>
          </div>
          <div className="mt-6">
            <span className="text-2xl font-black block tracking-tight text-emerald-600 dark:text-emerald-400">
              {averageScore} 分
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">
              歷史最高成績：{highestScore} 分
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">完成測驗次數</span>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 rounded-xl">
              <History size={20} className="text-blue-600" />
            </div>
          </div>
          <div className="mt-6">
            <span className="text-2xl font-black block tracking-tight text-blue-600 dark:text-blue-400">
              {history.length} 次
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">
              積極備考，持之以恆！
            </span>
          </div>
        </div>
      </div>

      {/* Main progress table & dynamic diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: History Log */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={20} className="text-blue-600" />
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">測驗歷史紀錄表</h2>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            {history.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <FolderOpen size={48} className="mx-auto text-slate-300" />
                <h3 className="font-bold text-slate-600 dark:text-slate-300">尚未完成任何測驗</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  回到首頁，選擇您要挑戰的章節並點擊「開始測驗」，您的每次作答數據都將詳實記錄在這裡。
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-[10px] font-extrabold uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="px-5 py-3.5">測驗時間</th>
                      <th className="px-5 py-3.5">測驗題數</th>
                      <th className="px-5 py-3.5">答對 / 答錯</th>
                      <th className="px-5 py-3.5">測驗得分</th>
                      <th className="px-5 py-3.5 text-right">詳情</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {history.map((record) => {
                      const dateObj = new Date(record.date);
                      const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
                      
                      return (
                        <tr 
                          key={record.id} 
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <span className="font-bold text-slate-700 dark:text-slate-300 block text-xs">
                              {formattedDate}
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5 block truncate max-w-[150px]">
                              {record.chapterNames.join(', ')}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-slate-500 font-mono">
                            {record.totalQuestions} 題
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold font-mono">
                            <span className="text-emerald-600">{record.correctAnswers} 對</span>
                            <span className="text-slate-300 mx-1">•</span>
                            <span className="text-rose-600">{record.wrongAnswers} 錯</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-sm font-black font-mono ${
                              record.score >= 80 
                                ? 'text-emerald-600' 
                                : record.score >= 60 
                                ? 'text-blue-600' 
                                : 'text-amber-600'
                            }`}>
                              {record.score}分
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-xs text-slate-400 font-medium">
                              用時 {Math.floor(record.duration / 60)}分{record.duration % 60}秒
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Dynamic Diagnostics & Learning Advice */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">備考弱點分析與建議</h2>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            
            {/* Advice summary */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                💡 學習進度診斷報告
              </h3>
              
              {history.length === 0 ? (
                <p className="text-xs text-slate-500 leading-relaxed">
                  請先進行幾次模擬測驗，系統會自動收集您的答題盲點，並產出客觀的統計分析。
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Diagnose weakest area */}
                  {weakChapters.length > 0 && weakChapters[0].attempted > 0 && weakChapters[0].acc < 80 ? (
                    <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                        <AlertTriangle size={16} />
                        <span className="font-extrabold text-xs">優先加強章節警訊</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        您在 <span className="font-bold text-slate-800 dark:text-slate-100">第 {weakChapters[0].chapter} 章 {weakChapters[0].title}</span> 
                        的答對率僅有 <span className="font-extrabold text-rose-500">{Math.round(weakChapters[0].acc)}%</span>。
                        建議回到首頁單獨點選該章節，並開啟「隨答隨改」學習模式進行深化理解。
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                        <Award size={16} />
                        <span className="font-extrabold text-xs">備考狀況極為優異</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        目前各章節平均答對率皆在 80% 以上，理解度十分紮實。請持續維持模擬測驗頻率，並利用「錯題練習庫」進行零星盲點清除！
                      </p>
                    </div>
                  )}

                  {/* Suggestion list */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-slate-400 block">推薦備考排程建議：</span>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 pl-4 list-disc font-medium">
                      <li>安排每日利用 10-15 分鐘，隨機進行 10 題選擇題混合測驗。</li>
                      <li>當前錯題庫內題目建議在 3 日內透過「錯題消滅戰」至少跑過一次。</li>
                      <li>在救護現場職業安全一章，注意 BSI（身體物質隔離）與 PPE 的搭配對應頁面。</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Quick overview metric */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                各章節答題精確度
              </span>
              
              <div className="space-y-3">
                {stats.chapterProgress.map((cp) => {
                  const acc = cp.attempted > 0 ? Math.round((cp.correct / cp.attempted) * 100) : 0;
                  return (
                    <div key={cp.chapter} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-600 dark:text-slate-300">第 {cp.chapter} 章</span>
                        <span className="text-slate-500 font-mono">
                          {cp.attempted > 0 ? `${acc}% 答對` : '尚未作答'}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            acc >= 80 
                              ? 'bg-emerald-500' 
                              : acc >= 60 
                              ? 'bg-blue-500' 
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${cp.attempted > 0 ? acc : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
