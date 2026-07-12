import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Upload, 
  Download, 
  Check, 
  AlertTriangle, 
  FileText, 
  HelpCircle, 
  RefreshCcw, 
  Trash2,
  ListPlus
} from 'lucide-react';
import { Question } from '../types';

interface QuestionImporterProps {
  customQuestionsCount: number;
  onImportQuestions: (questions: Question[]) => void;
  onClearCustomQuestions: () => void;
}

export default function QuestionImporter({
  customQuestionsCount,
  onImportQuestions,
  onClearCustomQuestions
}: QuestionImporterProps) {
  const [csvText, setCsvText] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccess, setParseSuccess] = useState<number | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);

  // Function to download CSV sample template
  const downloadSampleTemplate = () => {
    const csvContent = "\ufeffid,level,chapter,chapterTitle,pageStart,pageEnd,type,question,optionA,optionB,optionC,optionD,answerIndex,answer,explanation,practicalNote,difficulty,tags\n" +
      "custom-001,EMT-1,1,臺灣緊急醫療救護體系概論,15,16,single_choice,臺灣主要的緊急求救電話號碼為下列何者？,110,119,120,112,1,119,臺灣的消防及救護報案專線為 119。,派遣中心在確認地點後會立即調度最近的救護車輛出勤。,1,EMS|基礎\n" +
      "custom-002,EMT-1,2,人體基本解剖生理學,35,36,true_false,一般成人的心臟位於胸腔偏右側。,正確 (O),錯誤 (X),,,1,錯誤 (X),成人心臟一般位於胸腔正中偏左側而非偏右側。,,2,心臟|解剖\n";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "EMT1_題庫匯入範本.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to download JSON sample template
  const downloadJsonTemplate = () => {
    const jsonContent = [
      {
        "id": "custom-json-001",
        "level": "EMT-1",
        "chapter": 1,
        "chapterTitle": "臺灣緊急醫療救護體系概論",
        "pageStart": 15,
        "pageEnd": 16,
        "type": "single_choice",
        "question": "臺灣主要的緊急求救電話號碼為下列何者？",
        "options": ["110", "119", "120", "112"],
        "answerIndex": 1,
        "explanation": "臺灣的消防及救護報案專線為 119。",
        "practicalNote": "派遣中心在確認地點後會立即調度最近的救護車輛出勤。",
        "difficulty": 1,
        "tags": ["EMS", "基礎"]
      },
      {
        "id": "custom-json-002",
        "level": "EMT-1",
        "chapter": 2,
        "chapterTitle": "人體基本解剖生理學",
        "pageStart": 35,
        "pageEnd": 36,
        "type": "true_false",
        "question": "一般成人的心臟位於胸腔偏右側。",
        "options": ["正確 (O)", "錯誤 (X)"],
        "answerIndex": 1,
        "explanation": "成人心臟一般位於胸腔正中偏左側而非偏右側。",
        "practicalNote": "評估心尖搏動位置多在左側第五肋間。",
        "difficulty": 2,
        "tags": ["心臟", "解剖", "是非題"]
      }
    ];

    const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "EMT1_題庫匯入範本.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper function to parse CSV lines safely, taking care of quotes
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleParse = () => {
    setParseError(null);
    setParseSuccess(null);
    setPreviewQuestions([]);

    const trimmedText = csvText.trim();
    if (!trimmedText) {
      setParseError('請輸入或貼上 CSV / JSON 考題內容。');
      return;
    }

    // 1. JSON Auto-detection & Parsing
    if (trimmedText.startsWith('[') || trimmedText.startsWith('{')) {
      try {
        let parsed = JSON.parse(trimmedText);
        if (!Array.isArray(parsed)) {
          if (parsed && typeof parsed === 'object') {
            parsed = [parsed];
          } else {
            throw new Error('JSON 格式不符。必須為 JSON 陣列或單一考題物件。');
          }
        }

        const parsedList: Question[] = [];
        parsed.forEach((item: any, i: number) => {
          if (!item.question) {
            throw new Error(`第 ${i + 1} 筆考題：題目 (question) 不能為空。`);
          }
          if (item.answerIndex === undefined || isNaN(parseInt(item.answerIndex))) {
            throw new Error(`第 ${i + 1} 筆考題：正確答案索引 (answerIndex) 必須存在且為數字。`);
          }

          const id = item.id || `imported-json-${Date.now()}-${i}`;
          const level = item.level || 'EMT-1';
          const chapter = parseInt(item.chapter) || 99;
          const chapterTitle = item.chapterTitle || '自訂匯入題庫';
          const pageStart = item.pageStart !== undefined ? parseInt(item.pageStart) : undefined;
          const pageEnd = item.pageEnd !== undefined ? parseInt(item.pageEnd) : undefined;
          const typeRaw = item.type || 'single_choice';
          const type = (typeRaw === 'true_false' || typeRaw === 'tf') ? 'true_false' : 'single_choice';

          let options = Array.isArray(item.options) ? item.options : [];
          if (type === 'true_false') {
            if (options.length === 0) {
              options = ['正確 (O)', '錯誤 (X)'];
            }
          } else {
            if (options.length < 2) {
              throw new Error(`第 ${i + 1} 筆考題：選擇題必須包含至少兩個選項 (options)。`);
            }
          }

          const answerIndex = parseInt(item.answerIndex);
          if (answerIndex < 0 || answerIndex >= options.length) {
            throw new Error(`第 ${i + 1} 筆考題：正確答案索引 answerIndex (${item.answerIndex}) 超出選項範圍 (0-${options.length - 1})。`);
          }

          parsedList.push({
            id,
            level,
            chapter,
            chapterTitle,
            pageStart,
            pageEnd,
            type,
            question: item.question,
            options,
            answerIndex,
            explanation: item.explanation || '',
            practicalNote: item.practicalNote || '',
            difficulty: parseInt(item.difficulty) || 2,
            tags: Array.isArray(item.tags) ? item.tags.map((t: any) => String(t)) : [],
            source: item.source || undefined
          });
        });

        if (parsedList.length === 0) {
          setParseError('未解析到任何有效 JSON 考題。');
        } else {
          setPreviewQuestions(parsedList);
          setParseSuccess(parsedList.length);
        }
        return;
      } catch (err: any) {
        setParseError(`JSON 語法或欄位解析錯誤：${err.message}`);
        return;
      }
    }

    // 2. CSV Parsing (Fallback)
    try {
      const lines = trimmedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length < 2) {
        setParseError('資料行數不足，請確認是否包含欄位首行（Header）與至少一筆資料。');
        return;
      }

      const headers = parseCSVLine(lines[0]);
      // Verify headers roughly
      const requiredHeaders = ['id', 'chapter', 'question', 'answerIndex'];
      const missing = requiredHeaders.filter(h => !headers.includes(h));
      if (missing.length > 0) {
        setParseError(`CSV 格式不符。缺少的必要欄位：${missing.join(', ')}。或請改用 JSON 格式。`);
        return;
      }

      const idIdx = headers.indexOf('id');
      const levelIdx = headers.indexOf('level');
      const chIdx = headers.indexOf('chapter');
      const chTitleIdx = headers.indexOf('chapterTitle');
      const pageStartIdx = headers.indexOf('pageStart');
      const pageEndIdx = headers.indexOf('pageEnd');
      const typeIdx = headers.indexOf('type');
      const questionIdx = headers.indexOf('question');
      const optAIdx = headers.indexOf('optionA');
      const optBIdx = headers.indexOf('optionB');
      const optCIdx = headers.indexOf('optionC');
      const optDIdx = headers.indexOf('optionD');
      const ansIdxIdx = headers.indexOf('answerIndex');
      const expIdx = headers.indexOf('explanation');
      const noteIdx = headers.indexOf('practicalNote');
      const diffIdx = headers.indexOf('difficulty');
      const tagsIdx = headers.indexOf('tags');

      const parsedList: Question[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (row.length < requiredHeaders.length) continue;

        const id = row[idIdx] || `imported-csv-${Date.now()}-${i}`;
        const level = row[levelIdx] || 'EMT-1';
        const chapter = parseInt(row[chIdx]) || 99; // default custom chapter 99
        const chapterTitle = row[chTitleIdx] || '自訂匯入題庫';
        const pageStart = parseInt(row[pageStartIdx]) || undefined;
        const pageEnd = parseInt(row[pageEndIdx]) || undefined;
        const typeRaw = row[typeIdx] || 'single_choice';
        const type = (typeRaw === 'true_false' || typeRaw === 'tf') ? 'true_false' : 'single_choice';
        const question = row[questionIdx];
        if (!question) {
          throw new Error(`第 ${i + 1} 行：考題題目不能為空`);
        }

        const optionA = row[optAIdx] || '';
        const optionB = row[optBIdx] || '';
        const optionC = row[optCIdx] || '';
        const optionD = row[optDIdx] || '';

        // Build options array
        let options: string[] = [];
        if (type === 'true_false') {
          options = [optionA || '正確 (O)', optionB || '錯誤 (X)'];
        } else {
          options = [optionA, optionB, optionC, optionD].filter(o => o !== '');
          if (options.length < 2) {
            throw new Error(`第 ${i + 1} 行：單選題（選擇題）必須包含至少兩個選項 (OptionA & OptionB)`);
          }
        }

        const answerIndex = parseInt(row[ansIdxIdx]);
        if (isNaN(answerIndex) || answerIndex < 0 || answerIndex >= options.length) {
          throw new Error(`第 ${i + 1} 行：正確答案索引 answerIndex (${row[ansIdxIdx]}) 必須為介於 0 到 ${options.length - 1} 之間的有效整數`);
        }

        const explanation = row[expIdx] || '';
        const practicalNote = row[noteIdx] || '';
        const difficulty = parseInt(row[diffIdx]) || 2;
        const tags = row[tagsIdx] ? row[tagsIdx].split('|').map(t => t.trim()).filter(t => t.length > 0) : [];

        parsedList.push({
          id,
          level,
          chapter,
          chapterTitle,
          pageStart,
          pageEnd,
          type,
          question,
          options,
          answerIndex,
          explanation,
          practicalNote,
          difficulty,
          tags
        });
      }

      if (parsedList.length === 0) {
        setParseError('未解析到任何有效 CSV 考題，請確認檔案內容是否填寫完整。');
      } else {
        setPreviewQuestions(parsedList);
        setParseSuccess(parsedList.length);
      }
    } catch (err: any) {
      setParseError(err.message || 'CSV 語法解析錯誤，請仔細檢查欄位與英文逗號分隔是否正確。');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCsvText(text);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleCommitImport = () => {
    if (previewQuestions.length > 0) {
      onImportQuestions(previewQuestions);
      setPreviewQuestions([]);
      setCsvText('');
      setParseSuccess(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <ListPlus className="text-blue-600" size={24} />
          <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100">匯入自訂題庫與 PDF 考題</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
          除了系統預設的 EMT-1 題庫外，您也可以利用標準 <strong>CSV</strong> 或 <strong>JSON</strong> 格式匯入自訂題庫（包含選擇題與是非題）。
          支援指定正確答案所在的 PDF 章節與頁數範圍。匯入後，您可以在首頁設定中勾選這些章節、參與正常的模擬測驗，並同樣享有「錯題統計」和「即時解析」功能！
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={downloadSampleTemplate}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors"
          >
            <Download size={14} /> 下載標準 CSV 範本
          </button>

          <button
            type="button"
            onClick={downloadJsonTemplate}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-colors"
          >
            <Download size={14} /> 下載標準 JSON 範本
          </button>
          
          {customQuestionsCount > 0 && (
            <button
              type="button"
              onClick={onClearCustomQuestions}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors"
            >
              <Trash2 size={14} /> 清除全部自訂題庫 ({customQuestionsCount} 題)
            </button>
          )}
        </div>
      </div>

      {/* CSV Input Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Editor Area */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">1. 輸入或上傳 CSV / JSON 題庫</h3>
            <label className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer transition-colors">
              <Upload size={13} /> 上傳 CSV / JSON 檔案
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="在此貼上符合 CSV 或 JSON 標準格式的題庫內容... 系統會自動辨識格式。如果是 JSON，請使用一組包含考題物件的陣列。"
            className="w-full h-80 p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-mono text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          ></textarea>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleParse}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              驗證並解析 (自動偵測格式)
            </button>
          </div>
        </div>

        {/* Status Area */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">2. 驗證與匯入狀態</h3>

            {/* Error State */}
            {parseError && (
              <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-start gap-3 text-xs">
                <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={16} />
                <div className="space-y-1 text-rose-800 dark:text-rose-300 font-medium leading-relaxed">
                  <span className="font-bold">驗證未通過：</span>
                  <p>{parseError}</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!parseError && !parseSuccess && (
              <div className="p-8 text-center text-slate-400 space-y-2 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                <FileText size={32} className="mx-auto text-slate-300" />
                <span className="text-xs font-semibold block text-slate-500">等待驗證中</span>
                <p className="text-[10px] text-slate-400">請在左側貼上資料或上傳 CSV / JSON 檔案後，點擊「驗證並解析」按鈕。</p>
              </div>
            )}

            {/* Success State */}
            {parseSuccess && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-start gap-3 text-xs">
                  <Check className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                  <div className="space-y-1 text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed">
                    <span className="font-bold">驗證成功！</span>
                    <p>成功解析出 <span className="font-extrabold font-mono text-emerald-600">{parseSuccess}</span> 筆有效考題。</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2 text-xs">
                  <span className="font-bold block text-slate-500">匯入預覽：</span>
                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1 font-mono text-[10px] text-slate-500 divide-y divide-slate-100 dark:divide-slate-800">
                    {previewQuestions.slice(0, 5).map((q, idx) => (
                      <div key={idx} className="py-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{q.id}:</span> {q.question.substring(0, 25)}...
                      </div>
                    ))}
                    {previewQuestions.length > 5 && (
                      <div className="text-center pt-1 text-slate-400 text-[9px]">
                        ...以及其他 {previewQuestions.length - 5} 題...
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCommitImport}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Check size={14} strokeWidth={3} /> 確認匯入自訂題庫
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
