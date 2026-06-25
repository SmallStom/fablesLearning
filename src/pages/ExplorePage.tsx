import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { getWorldMeta, getSampleFable } from '@/data/worlds';
import { isLLMAvailable, streamFable } from '@/services/llmService';
import { trackEvent } from '@/lib/analytics';
import { parseFableResponse, extractStoryBody } from '@/utils/parseResponse';
import type { FableResult } from '@/types';
import FableViewer from '@/components/FableViewer';
import ConceptReveal from '@/components/ConceptReveal';
import QuizPanel from '@/components/QuizPanel';
import WorldSwitcher from '@/components/WorldSwitcher';
import ShareCard from '@/components/ShareCard';
import GuideTour from '@/components/GuideTour';
import SEO from '@/components/SEO';

const PRESET_CONCEPTS = ['内卷', '熵增', '边际效应', '认知失调', '奥德赛时期'];

function genId() {
  try {
    return crypto.randomUUID();
  } catch {
    return String(Date.now() + Math.random());
  }
}

export default function ExplorePage() {
  const { worldId = '' } = useParams();
  const navigate = useNavigate();
  const world = getWorldMeta(worldId);
  const sampleFable = getSampleFable(worldId);

  const currentConcept = useAppStore((s) => s.currentConcept);
  const setCurrentConcept = useAppStore((s) => s.setCurrentConcept);
  const currentFable = useAppStore((s) => s.currentFable);
  const setCurrentFable = useAppStore((s) => s.setCurrentFable);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const setIsGenerating = useAppStore((s) => s.setIsGenerating);
  const error = useAppStore((s) => s.error);
  const setError = useAppStore((s) => s.setError);
  const llmConfig = useAppStore((s) => s.llmConfig);
  const setLLMSettingsOpen = useAppStore((s) => s.setLLMSettingsOpen);
  const addToHistory = useAppStore((s) => s.addToHistory);
  const getWorldMemory = useAppStore((s) => s.getWorldMemory);
  const loadWorldMemories = useAppStore((s) => s.loadWorldMemories);

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [shareCardOpen, setShareCardOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  if (!world) {
    return (
      <div className="max-w-reader mx-auto px-4 py-20 text-center text-gray-400 dark:text-gray-500">
        没有找到这个世界。
        <button
          onClick={() => navigate('/')}
          className="block mx-auto mt-4 text-sm text-gray-600 dark:text-gray-300 underline"
        >
          返回首页
        </button>
      </div>
    );
  }

  const buildFable = (concept: string, raw: string, source: 'ai' | 'sample'): FableResult => {
    const parsed = parseFableResponse(raw, concept);
    const fable: FableResult = {
      id: source === 'sample' ? `sample-${worldId}` : genId(),
      concept,
      worldId,
      worldName: world.name,
      content: parsed?.content ?? raw,
      conceptName: parsed?.conceptName ?? '',
      conceptDefinition: parsed?.conceptDefinition ?? '',
      mappings: parsed?.mappings ?? [],
      quiz: {
        understanding: parsed?.understandingQuestion ?? '',
        transfer: parsed?.transferQuestion ?? '',
      },
      createdAt: new Date().toISOString(),
    };

    return fable;
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleGenerate = async (concept: string) => {
    const c = concept.trim();
    if (!c) return;
    setCurrentConcept(c);

    if (!isLLMAvailable(llmConfig)) {
      setLLMSettingsOpen(true);
      return;
    }

    // 中断上一个请求
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setError(null);
    setCurrentFable(null);
    setStreamingContent('');

    try {
      const worldMemories = getWorldMemory(worldId);
      const { raw, fable: serverFable } = await streamFable(
        worldId,
        c,
        worldMemories,
        (delta) => {
          setStreamingContent((prev) => prev + delta);
        },
        controller.signal
      );
      // 优先使用后端解析的寓言数据（含正确的 ID），否则前端本地解析
      const fable = serverFable ?? buildFable(c, raw, 'ai');
      // 确保有 worldName（后端返回的可能缺少此字段）
      if (!fable.worldName) fable.worldName = world.name;
      setCurrentFable(fable);
      addToHistory(fable);
      trackEvent('generate_fable_complete', { world_id: worldId, concept: c, fable_id: fable.id });
      // 后端在生成时已落库寓言与世界记忆，刷新本地缓存
      loadWorldMemories(worldId);
    } catch (e) {
      if (controller.signal.aborted) return;
      const errorMsg = e instanceof Error ? e.message : '生成失败';
      // 如果已有部分内容，尝试解析并展示
      if (streamingContent.length > 0) {
        const partialFable = buildFable(c, streamingContent, 'ai');
        setCurrentFable(partialFable);
        setError(null);
      } else {
        setError(errorMsg);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsGenerating(false);
      // 不清空 streamingContent，避免完成时界面闪烁
    }
  };

  const handleViewSample = () => {
    if (!sampleFable) return;
    setError(null);
    setCurrentFable(null);
    const fable = buildFable(world.demoConcept, sampleFable, 'sample');
    setCurrentFable(fable);
    trackEvent('view_sample_fable', { world_id: worldId, concept: world.demoConcept });
  };

  // 切换世界后中断正在进行的请求，清空之前的生成结果
  useEffect(() => {
    abortRef.current?.abort();
    setCurrentFable(null);
    setStreamingContent('');
    setError(null);
    loadWorldMemories(worldId);
    trackEvent('switch_world', { world_id: worldId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldId]);

  const displayedFable = currentFable;
  const showStreaming = isGenerating && streamingContent.length > 0;

  return (
    <div
      className="min-h-[calc(100vh-3.5rem)]"
      style={{
        // 使用 CSS 变量，自动适配暗色模式背景
        background: `linear-gradient(to bottom, ${world.theme.background} 0%, var(--bg-color) 320px)`,
      }}
    >
      <SEO
        title={currentConcept ? `用「${world.name}」解释「${currentConcept}」— 世界观` : `探索 ${world.name} — 世界观`}
        description={`在「${world.name}」的世界里，用一则寓言理解 ${currentConcept || '陌生概念'}。`}
      />
      <div className="max-w-reader mx-auto px-4 pt-6 sm:pt-8 pb-0">
        {/* 世界头 */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{world.icon}</span>
                <h1 className="font-serif text-xl sm:text-2xl font-bold" style={{ color: world.theme.textPrimary }}>
                  {world.name}
                </h1>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{world.tagline}</p>
            </div>
            <button
              onClick={() => setSwitcherOpen(true)}
              className="text-xs px-3 py-1.5 border rounded-lg hover:bg-white dark:hover:bg-gray-700 transition dark:border-gray-600 min-h-[36px]"
              style={{ borderColor: world.theme.primary, color: world.theme.primary }}
            >
              切换世界
            </button>
          </div>
        </div>

        {/* 输入区 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm mb-6" data-tour="input">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={currentConcept}
              onChange={(e) => setCurrentConcept(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGenerate(currentConcept);
              }}
              placeholder="输入一个你看不懂的名词……"
              className="w-full flex-1 px-4 py-3 text-base bg-gray-50 dark:bg-gray-700/50 dark:text-gray-100 dark:border-gray-600 rounded-xl border border-transparent focus:border-gray-300 dark:focus:border-gray-400 focus:outline-none"
            />
            <button
              onClick={() => handleGenerate(currentConcept)}
              disabled={isGenerating || !currentConcept.trim()}
              className="w-full sm:w-auto px-5 py-3 text-sm text-white rounded-xl font-medium disabled:opacity-40 transition hover:opacity-90 min-h-[48px]"
              style={{ backgroundColor: world.theme.primary }}
            >
              {isGenerating ? '生成中…' : '生成寓言'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-3 overflow-x-auto sm:overflow-visible">
            {[world.demoConcept, ...PRESET_CONCEPTS.filter((c) => c !== world.demoConcept)].map((c) => (
              <button
                key={c}
                onClick={() => handleGenerate(c)}
                disabled={isGenerating}
                className="text-xs px-2.5 py-1 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full transition disabled:opacity-40 whitespace-nowrap min-h-[32px]"
              >
                {c}
              </button>
            ))}
          </div>

          {sampleFable && !displayedFable && !isGenerating && (
            <button
              onClick={handleViewSample}
              className="mt-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            >
              📖 看这个世界的示例寓言
            </button>
          )}
        </div>

        {/* 错误 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-6 animate-fade-in">
            这个故事暂时讲不出来，换个世界试试？
            <div className="text-xs text-red-400 dark:text-red-500 mt-1">{error}</div>
            <button
              onClick={() => handleGenerate(currentConcept)}
              disabled={isGenerating}
              className="mt-2 px-3 py-1 text-xs text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition disabled:opacity-40"
            >
              重试
            </button>
          </div>
        )}

        {/* 流式输出中 — 只显示故事正文，隐藏概念解析和检验问题 */}
        {showStreaming && (
          <div>
            <FableViewer content={extractStoryBody(streamingContent)} streaming />
            <div className="text-center mt-4">
              <button
                onClick={handleStop}
                className="px-4 py-1.5 text-xs text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition min-h-[36px]"
              >
                ⏹ 停止生成
              </button>
            </div>
          </div>
        )}

        {/* 生成中但还没收到内容 */}
        {isGenerating && !showStreaming && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="w-8 h-8 border-3 border-gray-200 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              正在从「{world.name}」理解这个概念……
            </p>
            <button
              onClick={handleStop}
              className="px-4 py-1.5 text-xs text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition min-h-[36px]"
            >
              ⏹ 取消
            </button>
          </div>
        )}

        {/* 寓言展示（生成完成后） — 与流式共用同一个 FableViewer，避免闪烁 */}
        {displayedFable && !isGenerating && (
          <div data-tour="fable">
            <FableViewer content={displayedFable.content} />
            <div className="animate-fade-in">
              <div data-tour="concept">
                <ConceptReveal fable={displayedFable} />
              </div>
              <QuizPanel fable={displayedFable} llmConfig={llmConfig} />

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setShareCardOpen(true)}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  🔗 分享
                </button>
                <button
                  onClick={() => setSwitcherOpen(true)}
                  className="px-4 py-2 text-sm text-white rounded-xl font-medium transition hover:opacity-90"
                  style={{ backgroundColor: world.theme.secondary }}
                >
                  换个世界看同一个概念 →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 空状态引导 */}
        {!displayedFable && !isGenerating && !error && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm leading-relaxed">
            <p className="mb-2">{world.description}</p>
            <p>输入一个概念，或点击上方的预设标签开始。</p>
          </div>
        )}
      </div>

      <WorldSwitcher
        currentWorldId={worldId}
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
      />

      {/* 分享卡片弹窗 */}
      {shareCardOpen && displayedFable && (
        <ShareCard
          fable={displayedFable}
          worldIcon={world.icon}
          onClose={() => setShareCardOpen(false)}
        />
      )}

      {/* 探索页功能引导 */}
      <GuideTour />
    </div>
  );
}
