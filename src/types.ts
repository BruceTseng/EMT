export type QuestionType = 'single_choice' | 'true_false';

export interface Question {
  id: string;
  level: string;
  chapter: number;
  chapterTitle: string;
  pageStart?: number;
  pageEnd?: number;
  type: QuestionType;
  question: string;
  options: string[]; // Options: for single_choice [A, B, C, D], for true_false [O, X] or [正確, 錯誤]
  answerIndex: number; // 0-based index of the correct option
  explanation?: string;
  practicalNote?: string;
  difficulty?: number;
  tags?: string[];
  source?: any;
  derivedFrom?: string;
}

export interface QuizAttempt {
  questionId: string;
  userAnswerIndex: number | null; // null if skipped
  isCorrect: boolean;
}

export interface QuizSession {
  id: string;
  startTime: string;
  endTime?: string;
  chapters: number[];
  questionCount: number;
  type: 'all' | 'single_choice' | 'true_false';
  questions: Question[];
  attempts: { [questionId: string]: number | null }; // map of questionId to selected option index
  isCompleted: boolean;
  duration?: number; // in seconds
  score?: number; // out of 100
}

export interface QuizHistory {
  id: string;
  date: string;
  chapterNames: string[];
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedAnswers: number;
  score: number;
  duration: number; // seconds
  type: string;
}

export interface ChapterProgress {
  chapter: number;
  title: string;
  totalQuestions: number;
  correctCount: number;
  attemptedCount: number;
}
