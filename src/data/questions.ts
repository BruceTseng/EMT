import { Question } from '../types';
import { QUESTIONS_1_6 } from './questions_1_6';
import { QUESTIONS_7_12 } from './questions_7_12';
import { QUESTIONS_TF_1_12 } from './questions_tf_1_12';
import { QUESTIONS_13_15 } from './questions_13_15';
import { QUESTIONS_16_18 } from './questions_16_18';

export const DEFAULT_QUESTIONS: Question[] = [
  ...QUESTIONS_1_6,
  ...QUESTIONS_7_12,
  ...QUESTIONS_TF_1_12,
  ...QUESTIONS_13_15,
  ...QUESTIONS_16_18
];

export const CHAPTER_DETAILS = [
  { chapter: 1, title: "臺灣緊急醫療救護體系概論", pageStart: 6, pageEnd: 33 },
  { chapter: 2, title: "人體基本解剖與生理學", pageStart: 34, pageEnd: 61 },
  { chapter: 3, title: "緊急醫療救護職業安全", pageStart: 62, pageEnd: 89 },
  { chapter: 4, title: "到院前五級檢傷概論", pageStart: 90, pageEnd: 113 },
  { chapter: 5, title: "緊急救護技術", pageStart: 114, pageEnd: 187 },
  { chapter: 6, title: "病人評估", pageStart: 188, pageEnd: 215 },
  { chapter: 7, title: "常見非外傷的評估、處置與情境操作", pageStart: 216, pageEnd: 249 },
  { chapter: 8, title: "常見外傷評估、處置與情境操作", pageStart: 250, pageEnd: 291 },
  { chapter: 9, title: "小兒與孕婦評估、處置與情境操作", pageStart: 292, pageEnd: 303 },
  { chapter: 10, title: "長者緊急醫療救護", pageStart: 304, pageEnd: 323 },
  { chapter: 11, title: "行為急症", pageStart: 324, pageEnd: 339 },
  { chapter: 12, title: "病人轉送、轉診或轉院", pageStart: 340, pageEnd: 351 },
  { chapter: 13, title: "環境急症與野外地區緊急救護", pageStart: 352, pageEnd: 375 },
  { chapter: 14, title: "空中救護概論、現況與相關法規", pageStart: 376, pageEnd: 395 },
  { chapter: 15, title: "核生化緊急事件概論", pageStart: 396, pageEnd: 415 },
  { chapter: 16, title: "大量傷病患與檢傷分類概論及演練", pageStart: 416, pageEnd: 433 },
  { chapter: 17, title: "團隊資源管理介紹與應用", pageStart: 434, pageEnd: 447 },
  { chapter: 18, title: "戰術緊急傷患救護", pageStart: 448, pageEnd: 467 }
];
