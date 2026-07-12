import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  BookOpen, 
  HelpCircle, 
  CheckCircle, 
  XCircle, 
  Trophy, 
  AlertTriangle, 
  Flame, 
  Check, 
  Award,
  Sliders,
  Shuffle,
  Filter,
  Layers,
  Tag,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  BookMarked
} from 'lucide-react';
import { Question } from '../types';
import { CHAPTER_DETAILS } from '../data/questions';

interface DashboardProps {
  questions: Question[];
  mistakeCount: number;
  historyCount: number;
  onStartQuiz: (config: {
    chapters: number[];
    type: 'all' | 'single_choice' | 'true_false';
    count: number;
    mode: 'study' | 'exam';
    customQuestions?: Question[];
  }) => void;
  stats: {
    totalAnswered: number;
    averageAccuracy: number;
    streak: number;
    chapterProgress: {
      chapter: number;
      title: string;
      total: number;
      attempted: number;
      correct: number;
    }[];
  };
  progressLedger?: { [qId: string]: { attempted: boolean; correct: boolean } };
  mistakeIds?: string[];
}

const CHAPTER_GROUPS = [
  {
    id: "g1",
    name: "第一階段：救護基礎與安全學科",
    chapters: [1, 2, 3]
  },
  {
    id: "g2",
    name: "第二階段：呼吸、心肺與核心急救",
    chapters: [4, 5, 6]
  },
  {
    id: "g3",
    name: "第三階段：內外科與特殊病患處置",
    chapters: [7, 8, 9, 10]
  },
  {
    id: "g4",
    name: "第四階段：特殊勤務、大量傷病、資源管理與戰術",
    chapters: [11, 12, 13, 14, 15, 16, 17, 18]
  }
];

export default function Dashboard({
  questions,
  mistakeCount,
  historyCount,
  onStartQuiz,
  stats,
  progressLedger = {},
  mistakeIds = []
}: DashboardProps) {
  // Advanced Training (扣題) States
  const [selectedChapters, setSelectedChapters] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [questionType, setQuestionType] = useState<'all' | 'single_choice' | 'true_false'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | '2' | '3' | '4'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unattempted' | 'incorrect' | 'correct'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [orderMode, setOrderMode] = useState<'random' | 'sequential'>('random');
  
  // Custom question counts
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [practiceMode, setPracticeMode] = useState<'study' | 'exam'>('study');
  
  // Expand/collapse state for chapter groups
  const [expandedGroups, setExpandedGroups] = useState<{ [gId: string]: boolean }>({
    g1: true,
    g2: true,
    g3: false,
    g4: false
  });

  // Unique chapters in the questions pool
  const availableChapters = useMemo(() => {
    return Array.from(new Set(questions.map((q) => q.chapter))).sort((a, b) => a - b);
  }, [questions]);

  // Extract top tags for quick filtering
  const availableTags = useMemo(() => {
    const counts: { [tag: string]: number } = {};
    questions.forEach(q => {
      if (q.tags) {
        q.tags.forEach(t => {
          counts[t] = (counts[t] || 0) + 1;
        });
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }));
  }, [questions]);

  const getChapterTitle = (chNum: number) => {
    const detail = CHAPTER_DETAILS.find(d => d.chapter === chNum);
    if (detail) return detail.title;
    const qFromCh = questions.find(q => q.chapter === chNum);
    return qFromCh ? qFromCh.chapterTitle : `自訂章節 ${chNum}`;
  };

  const toggleChapter = (chNum: number) => {
    if (selectedChapters.includes(chNum)) {
      if (selectedChapters.length > 1) {
        setSelectedChapters(selectedChapters.filter((c) => c !== chNum));
      }
    } else {
      setSelectedChapters([...selectedChapters, chNum]);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Group quick toggles
  const handleSelectGroupChapters = (groupChapters: number[], select: boolean) => {
    if (select) {
      setSelectedChapters(prev => Array.from(new Set([...prev, ...groupChapters])));
    } else {
      const remaining = selectedChapters.filter(c => !groupChapters.includes(c));
      setSelectedChapters(remaining.length > 0 ? remaining : [1]); // fall back to chapter 1
    }
  };

  // Preset Shortcut Toggles
  const applyPreset = (preset: 'all' | 'none' | 'ch1_6' | 'ch7_12' | 'ch13_18') => {
    if (preset === 'all') {
      setSelectedChapters(availableChapters);
    } else if (preset === 'none') {
      setSelectedChapters([1]);
    } else if (preset === 'ch1_6') {
      setSelectedChapters(availableChapters.filter(c => c >= 1 && c <= 6));
    } else if (preset === 'ch7_12') {
      setSelectedChapters(availableChapters.filter(c => c >= 7 && c <= 12));
    } else if (preset === 'ch13_18') {
      setSelectedChapters(availableChapters.filter(c => c >= 13 && c <= 18));
    }
  };

  // Filter Pool dynamically based on advanced criteria
  const filteredPool = useMemo(() => {
    return questions.filter((q) => {
      // 1. Chapter
      if (!selectedChapters.includes(q.chapter)) return false;

      // 2. Type (mixed vs selection vs true/false)
      if (questionType !== 'all' && q.type !== questionType) return false;

      // 3. Difficulty
      if (difficultyFilter !== 'all' && q.difficulty !== parseInt(difficultyFilter)) return false;

      // 4. Learning Status
      if (statusFilter !== 'all') {
        const entry = progressLedger[q.id];
        const isMistake = mistakeIds.includes(q.id);
        if (statusFilter === 'unattempted' && entry?.attempted) return false;
        if (statusFilter === 'incorrect' && !isMistake) return false;
        if (statusFilter === 'correct' && (!entry?.attempted || !entry.correct)) return false;
      }

      // 5. Tag Focus
      if (selectedTag && (!q.tags || !q.tags.includes(selectedTag))) return false;

      return true;
    });
  }, [questions, selectedChapters, questionType, difficultyFilter, statusFilter, selectedTag, progressLedger, mistakeIds]);

  // Keep questionCount inside valid range
  const displayCount = useMemo(() => {
    if (filteredPool.length === 0) return 0;
    return Math.min(questionCount, filteredPool.length);
  }, [questionCount, filteredPool]);

  const handleStart = () => {
    if (filteredPool.length === 0) return;

    let finalQuestions = [...filteredPool];
    
    // Order mode application
    if (orderMode === 'random') {
      finalQuestions = finalQuestions.sort(() => 0.5 - Math.random());
    } else {
      // Sequential sort by chapter number first, then by id order
      finalQuestions = finalQuestions.sort((a, b) => {
        if (a.chapter !== b.chapter) return a.chapter - b.chapter;
        return a.id.localeCompare(b.id);
      });
    }

    // Limit to user chosen count
    const limit = displayCount;
    const slicedQuestions = finalQuestions.slice(0, limit);

    onStartQuiz({
      chapters: selectedChapters,
      type: questionType,
      count: slicedQuestions.length,
      mode: practiceMode,
      customQuestions: slicedQuestions
    });
  };

  return (
    <div className="space-y-8">
      {/* Dynamic welcome banner */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-slate-700/30"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <BookOpen size={240} className="text-slate-200" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold tracking-wider border border-blue-500/30">
            <Award size={14} className="text-amber-400" /> EMT-1 全功能精準特訓系統
          </span>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
            {questions.length}題全章節覆蓋，高效率「精準扣題」模式
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-2xl">
            此系統已完整收錄 1~18 章所有標準 EMT-1 備考題庫。您可以使用下方的「進階扣題特訓控制台」，依照章節、題型、答題紀錄、難度、甚至是特定的急救技術標籤（如 AED/CPR）進行客製化高效刷題。
          </p>
        </div>
      </motion.div>

      {/* Top Stats Overview (Bento Grid Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: '學習天數連續紀錄',
            value: `${stats.streak} 天`,
            desc: '每日登入練習，保持手感',
            icon: <Flame className="text-amber-500" size={24} />,
            bg: 'bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-800/20'
          },
          {
            title: '總回答次數',
            value: `${stats.totalAnswered} 次`,
            desc: '累計作答，熟能生巧',
            icon: <HelpCircle className="text-blue-500" size={24} />,
            bg: 'bg-blue-500/5 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-800/20'
          },
          {
            title: '平均答對率',
            value: `${stats.averageAccuracy}%`,
            desc: '全庫答對比率',
            icon: <Trophy className="text-emerald-500" size={24} />,
            bg: 'bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-800/20'
          },
          {
            title: '錯題練習庫',
            value: `${mistakeCount} 題`,
            desc: '針對弱點，各個擊破',
            icon: <AlertTriangle className="text-rose-500" size={24} />,
            bg: 'bg-rose-500/5 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-800/20'
          }
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.4 }}
            className={`p-5 rounded-2xl flex flex-col justify-between shadow-xs ${item.bg}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">{item.title}</span>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-100 dark:border-slate-800">{item.icon}</div>
            </div>
            <div className="mt-4">
              <div className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {item.value}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Grid: Config Area & Chapter Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Advanced Quiz Spec Setup */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <Sliders size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">進階扣題特訓控制台</h2>
                <p className="text-xs text-slate-400">精確篩選，打造最有效率的練習組合</p>
              </div>
            </div>
          </div>

          {/* Step 1: Chapter Selectors */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers size={16} className="text-blue-500" /> 1. 選擇特訓章節
              </label>
              
              {/* Presets Row */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: '全選' },
                  { id: 'ch1_6', label: '第1-6章 (基礎)' },
                  { id: 'ch7_12', label: '第7-12章 (急症)' },
                  { id: 'ch13_18', label: '第13-18章 (勤務/戰術)' },
                  { id: 'none', label: '清除' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id as any)}
                    className="px-2 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold rounded-md border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 transition-all"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grouped Chapter Panels */}
            <div className="space-y-3">
              {CHAPTER_GROUPS.map((group) => {
                const isExpanded = !!expandedGroups[group.id];
                const selectedInGroup = group.chapters.filter(c => selectedChapters.includes(c));
                const allSelected = selectedInGroup.length === group.chapters.length;
                const someSelected = selectedInGroup.length > 0 && !allSelected;

                return (
                  <div key={group.id} className="border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/10">
                    {/* Group Header */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/50">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">{group.name}</span>
                      </div>

                      {/* Group toggle helper */}
                      <button
                        type="button"
                        onClick={() => handleSelectGroupChapters(group.chapters, !allSelected)}
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full transition-all ${
                          allSelected 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' 
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-300'
                        }`}
                      >
                        {allSelected ? '取消全選' : '全選此組'}
                      </button>
                    </div>

                    {/* Group Chapters list */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white dark:bg-slate-900"
                        >
                          {group.chapters.map((chNum) => {
                            if (!availableChapters.includes(chNum)) return null;
                            const isSelected = selectedChapters.includes(chNum);
                            const countInCh = questions.filter(q => q.chapter === chNum).length;

                            return (
                              <button
                                key={chNum}
                                type="button"
                                onClick={() => toggleChapter(chNum)}
                                className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/15 text-blue-900 dark:text-blue-200'
                                    : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-all ${
                                    isSelected 
                                      ? 'bg-blue-600 border-blue-600 text-white' 
                                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950'
                                  }`}>
                                    {isSelected && <Check size={11} strokeWidth={3} />}
                                  </div>
                                  <div className="text-[11px] truncate leading-tight">
                                    <span className="font-extrabold mr-1">Ch {chNum}</span>
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">{getChapterTitle(chNum)}</span>
                                  </div>
                                </div>
                                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0">
                                  {countInCh} 題
                                </span>
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Advanced filters */}
          <div className="p-5 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-4">
            <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Filter size={16} className="text-blue-500" /> 2. 高級過濾與排序設定
            </label>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Question type */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-extrabold text-slate-400 block">題型</span>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as any)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">混合題型</option>
                  <option value="single_choice">單一選擇題</option>
                  <option value="true_false">是非題</option>
                </select>
              </div>

              {/* Difficulty */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-extrabold text-slate-400 block">難易度</span>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value as any)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">不限難度 (All)</option>
                  <option value="2">基礎認知 (Level 2)</option>
                  <option value="3">核心學科 (Level 3)</option>
                  <option value="4">實務情境 (Level 4)</option>
                </select>
              </div>

              {/* Answer status */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-extrabold text-slate-400 block">答題歷史狀態</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">全部考題 (無過濾)</option>
                  <option value="unattempted">未曾作答過之題目</option>
                  <option value="incorrect">曾答錯之題目 (錯題本)</option>
                  <option value="correct">已掌握題目 (答對過)</option>
                </select>
              </div>

              {/* Quiz Order */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-extrabold text-slate-400 block">出題順序</span>
                <div className="grid grid-cols-2 gap-1.5 h-8">
                  <button
                    type="button"
                    onClick={() => setOrderMode('random')}
                    className={`flex items-center justify-center gap-1 rounded-xl text-[10px] font-bold border transition-all ${
                      orderMode === 'random'
                        ? 'border-blue-500 bg-blue-50/20 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Shuffle size={12} /> 隨機亂序
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderMode('sequential')}
                    className={`flex items-center justify-center gap-1 rounded-xl text-[10px] font-bold border transition-all ${
                      orderMode === 'sequential'
                        ? 'border-blue-500 bg-blue-50/20 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-500'
                    }`}
                  >
                    <BookMarked size={12} /> 章節順序
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Tag Focusing */}
          {availableTags.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Tag size={16} className="text-blue-500" /> 3. 核心急救技術與主題聚焦 (標籤過濾)
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full transition-all border ${
                    selectedTag === null
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 border-slate-200/80 dark:border-slate-700/80'
                  }`}
                >
                  不限主題
                </button>
                {availableTags.map((tag) => {
                  const isSelected = selectedTag === tag.name;
                  return (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() => setSelectedTag(isSelected ? null : tag.name)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all border flex items-center gap-1 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80'
                      }`}
                    >
                      <span>#{tag.name}</span>
                      <span className={`text-[8px] font-black px-1 py-0.2 rounded-full font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        {tag.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Practice Count & Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 dark:border-slate-800 pt-6">
            
            {/* Practice Count Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                  4. 特訓出題數量
                </span>
                <span className="text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/30">
                  {displayCount} 題 / 共 {filteredPool.length} 題
                </span>
              </div>

              {/* Slider & Input Combined */}
              {filteredPool.length > 0 ? (
                <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/40">
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={1}
                      max={filteredPool.length}
                      value={displayCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <input
                      type="number"
                      min={1}
                      max={filteredPool.length}
                      value={displayCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) {
                          setQuestionCount(Math.max(1, Math.min(val, filteredPool.length)));
                        }
                      }}
                      className="w-16 p-1.5 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                    />
                  </div>

                  {/* Preset Buttons */}
                  <div className="grid grid-cols-5 gap-1.5 pt-1.5">
                    {[5, 10, 20, 50, -1].map((num) => {
                      const isAll = num === -1;
                      const targetNum = isAll ? filteredPool.length : num;
                      const isCurrent = displayCount === targetNum;
                      const isDisabled = filteredPool.length < targetNum && num !== 5;

                      return (
                        <button
                          key={num}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => setQuestionCount(targetNum)}
                          className={`py-1 text-[10px] font-mono font-bold rounded-lg border transition-all text-center ${
                            isDisabled
                              ? 'opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-100 dark:border-slate-800'
                              : isCurrent
                              ? 'border-blue-500 bg-blue-50/40 text-blue-700 dark:text-blue-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-white dark:hover:bg-slate-800'
                          }`}
                        >
                          {isAll ? '全部' : `${num} 題`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-950/40 text-xs font-bold">
                  當前過濾條件下「無可用題目」，請重設篩選！
                </div>
              )}
            </div>

            {/* Mode selection */}
            <div className="space-y-3">
              <span className="text-sm font-black text-slate-700 dark:text-slate-300 block">
                5. 測驗特訓模式
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPracticeMode('study')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    practiceMode === 'study'
                      ? 'border-blue-500 bg-blue-50/25 dark:bg-blue-950/15'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-2 h-2 rounded-full ${practiceMode === 'study' ? 'bg-blue-600' : 'bg-slate-400'}`}></span>
                    <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">隨答隨改 (學習)</span>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-relaxed">
                    立刻判定對錯，並提供完整 PDF 頁碼對照與詳解。
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPracticeMode('exam')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    practiceMode === 'exam'
                      ? 'border-blue-500 bg-blue-50/25 dark:bg-blue-950/15'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-2 h-2 rounded-full ${practiceMode === 'exam' ? 'bg-blue-600' : 'bg-slate-400'}`}></span>
                    <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">整卷批改 (模擬)</span>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-relaxed">
                    限時內答完全部再交卷計算分數，體驗最逼真的考場氣氛。
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-[10px] text-slate-400">
              已過濾特訓題庫共 <span className="font-extrabold text-slate-700 dark:text-slate-200">{filteredPool.length}</span> 題。
              將{orderMode === 'random' ? '亂序抽樣' : '循序抽出'} <span className="font-black text-blue-600 dark:text-blue-400">{displayCount}</span> 題。
            </div>
            <button
              type="button"
              onClick={handleStart}
              disabled={filteredPool.length === 0}
              className={`flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold shadow-md transition-all shrink-0 ${
                filteredPool.length === 0
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              <Play size={16} fill="currentColor" /> 開始特訓
            </button>
          </div>
        </div>

        {/* Chapter Stats and Mastery */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-emerald-600 rounded-full"></div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">章節學習目標熟練度</h2>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            根據您的歷史答題結果，分析 1~18 各章節之答對率與練習進度：
          </p>

          <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
            {stats.chapterProgress.map((item) => {
              const accuracy = item.attempted > 0 ? Math.round((item.correct / item.attempted) * 100) : 0;
              const coverage = Math.round((item.attempted / item.total) * 100);

              return (
                <div key={item.chapter} className="space-y-1.5 p-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/40">
                  <div className="flex justify-between items-start text-xs">
                    <span className="font-extrabold text-slate-700 dark:text-slate-300 truncate max-w-[170px]" title={`第 ${item.chapter} 章 ${getChapterTitle(item.chapter)}`}>
                      第 {item.chapter} 章 {getChapterTitle(item.chapter)}
                    </span>
                    <span className="font-bold text-[10px] text-slate-400 font-mono shrink-0 ml-1">
                      已練 {item.attempted}/{item.total} 題
                    </span>
                  </div>

                  {/* Mastery & Coverage indicators */}
                  <div className="space-y-1 pt-0.5">
                    {/* Mastery */}
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-slate-400">答對率 (Mastery)</span>
                      <span className={`font-bold font-mono ${accuracy >= 80 ? 'text-emerald-600' : accuracy >= 60 ? 'text-blue-600' : item.attempted > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {item.attempted > 0 ? `${accuracy}%` : '未練習'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200/60 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          accuracy >= 80 
                            ? 'bg-emerald-500' 
                            : accuracy >= 60 
                            ? 'bg-blue-500' 
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${item.attempted > 0 ? accuracy : 0}%` }}
                      ></div>
                    </div>

                    {/* Coverage */}
                    <div className="flex items-center justify-between text-[9px] pt-0.5">
                      <span className="text-slate-400">題庫涵蓋率</span>
                      <span className="font-bold text-slate-500 font-mono">{coverage}%</span>
                    </div>
                    <div className="h-1 bg-slate-200/60 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-400 rounded-full transition-all duration-500"
                        style={{ width: `${coverage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
              <CheckCircle size={12} className="text-emerald-500 shrink-0" />
              答對率 80% 以上將呈現代表過關的 <span className="text-emerald-500 font-bold">綠色</span>。
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
