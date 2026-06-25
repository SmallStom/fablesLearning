import { useState, useEffect, useRef, useCallback } from 'react';
import type { FableResult, LLMConfig } from '@/types';
import { isLLMAvailable } from '@/services/llmService';
import { apiPost } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { trackEvent } from '@/lib/analytics';

function loadJSON(key: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {};
}

function saveJSON(key: string, data: Record<string, string>) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

export default function QuizPanel({
  fable,
  llmConfig,
}: {
  fable: FableResult;
  llmConfig: LLMConfig;
}) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? 'guest';
  const answerKey = `worldview_${userId}_quiz_answers`;
  const feedbackKey = `worldview_${userId}_quiz_feedback`;
  const abortRef = useRef<AbortController | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAnswers(loadJSON(answerKey));
    setFeedbacks(loadJSON(feedbackKey));
  }, [fable.id, answerKey, feedbackKey]);

  // 组件卸载时中断请求
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const updateAnswer = useCallback((key: string, value: string) => {
    const fullKey = `${fable.id}_${key}`;
    setAnswers((prev) => {
      const next = { ...prev, [fullKey]: value };
      // debounce 写入 localStorage
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveJSON(answerKey, next), 500);
      return next;
    });
  }, [fable.id, answerKey]);

  const handleSubmit = async (key: string, label: string, question: string) => {
    const fullKey = `${fable.id}_${key}`;
    const answer = answers[fullKey];
    if (!answer?.trim()) return;

    // 中断之前的评判请求
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSubmitting(key);
    try {
      const data = await apiPost<{ feedback: string }>(
        '/api/quiz/judge',
        {
          fableId: fable.id,
          questionKey: key,
          answer,
          question,
          label,
          conceptName: fable.conceptName || fable.concept,
          content: fable.content,
          conceptDefinition: fable.conceptDefinition,
        },
        { signal: controller.signal }
      );

      if (controller.signal.aborted) return;
      const feedback = data.feedback;
      trackEvent('complete_quiz', {
        fable_id: fable.id,
        question_key: key,
        concept: fable.conceptName || fable.concept,
      });
      // 函数式更新：从 localStorage 读取最新值再合并，避免并发覆盖
      setFeedbacks((prev) => {
        const latest = loadJSON(feedbackKey);
        const next = { ...latest, [fullKey]: feedback };
        saveJSON(feedbackKey, next);
        return next;
      });
    } catch (e) {
      if (controller.signal.aborted) return;
      const errMsg = `评判失败：${e instanceof Error ? e.message : '未知错误'}`;
      setFeedbacks((prev) => {
        const latest = loadJSON(feedbackKey);
        const next = { ...latest, [fullKey]: errMsg };
        saveJSON(feedbackKey, next);
        return next;
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setSubmitting(null);
    }
  };

  const questions = [
    { key: 'understanding', label: '理解检验', text: fable.quiz.understanding },
    { key: 'transfer', label: '迁移检验', text: fable.quiz.transfer },
  ].filter((q) => q.text);

  if (questions.length === 0) return null;

  const llmReady = isLLMAvailable(llmConfig);

  return (
    <div className="max-w-reader mx-auto mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition text-sm font-medium text-gray-700 dark:text-gray-200 border border-transparent"
      >
        <span>✅ 检验理解</span>
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="px-4 py-4 space-y-6 animate-fade-in">
          {questions.map((q) => {
            const ansKey = `${fable.id}_${q.key}`;
            const feedback = feedbacks[ansKey];
            const isSubmitting = submitting === q.key;
            return (
              <div key={q.key}>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">{q.label}</div>
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-2">
                  {q.text}
                </p>
                <textarea
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-y min-h-[72px]"
                  placeholder="写下你的理解……"
                  value={answers[ansKey] || ''}
                  onChange={(e) => updateAnswer(q.key, e.target.value)}
                />
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={() => handleSubmit(q.key, q.label, q.text)}
                    disabled={isSubmitting || !answers[ansKey]?.trim() || !llmReady}
                    className="px-3 py-1.5 text-xs bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-40 transition"
                  >
                    {isSubmitting ? '评判中…' : '提交评判'}
                  </button>
                  {!llmReady && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">需先配置 LLM</span>
                  )}
                </div>
                {feedback && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap animate-fade-in">
                    <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">导师反馈</div>
                    {feedback}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
