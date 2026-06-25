import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { MODEL_PRESETS, testConnection } from '@/services/llmService';
import type { LLMConfig } from '@/types';

export default function LLMSettings() {
  const open = useAppStore((s) => s.llmSettingsOpen);
  const setOpen = useAppStore((s) => s.setLLMSettingsOpen);
  const config = useAppStore((s) => s.llmConfig);
  const setLLMConfig = useAppStore((s) => s.setLLMConfig);

  const [draft, setDraft] = useState<LLMConfig>(config);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | boolean>(null);

  if (!open) return null;

  const handlePreset = (preset: (typeof MODEL_PRESETS)[number]) => {
    setDraft({
      ...draft,
      baseURL: preset.baseURL,
      apiKey: preset.apiKey || draft.apiKey,
      model: preset.model,
      usePlatformLLM: false,
    });
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    // 先保存配置（后端需要读取已保存的配置来测试）
    setLLMConfig(draft);
    const ok = await testConnection(draft);
    setTestResult(ok);
    setTesting(false);
  };

  const handleSave = () => {
    setLLMConfig(draft);
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setOpen(false)}
      />
      <div className="relative bg-white dark:bg-gray-800 dark:text-gray-100 rounded-2xl shadow-xl w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">LLM 设置</h2>

        {/* 平台 LLM / 自带 Key 切换 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setDraft({ ...draft, usePlatformLLM: true }); setTestResult(null); }}
            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition ${
              draft.usePlatformLLM
                ? 'border-gray-800 bg-gray-800 text-white dark:border-gray-400 dark:bg-gray-600'
                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            使用平台 LLM（免费）
          </button>
          <button
            onClick={() => { setDraft({ ...draft, usePlatformLLM: false }); setTestResult(null); }}
            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition ${
              !draft.usePlatformLLM
                ? 'border-gray-800 bg-gray-800 text-white dark:border-gray-400 dark:bg-gray-600'
                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            自带 API Key
          </button>
        </div>

        {/* BYOK 配置区 */}
        {!draft.usePlatformLLM && (
          <>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">预设模型</label>
            <select
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-gray-400"
              value=""
              onChange={(e) => {
                const preset = MODEL_PRESETS.find((p) => p.label === e.target.value);
                if (preset) handlePreset(preset);
              }}
            >
              <option value="">选择预设…</option>
              {MODEL_PRESETS.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>

            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Base URL</label>
            <input
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-gray-400"
              value={draft.baseURL}
              onChange={(e) => { setDraft({ ...draft, baseURL: e.target.value }); setTestResult(null); }}
              placeholder="https://api.openai.com/v1"
            />

            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">API Key</label>
            <input
              type="password"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-gray-400"
              value={draft.apiKey}
              onChange={(e) => { setDraft({ ...draft, apiKey: e.target.value }); setTestResult(null); }}
              placeholder="sk-... （本地部署可留空或 EMPTY）"
            />

            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Model</label>
            <input
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-gray-400"
              value={draft.model}
              onChange={(e) => { setDraft({ ...draft, model: e.target.value }); setTestResult(null); }}
              placeholder="gpt-4o-mini"
            />
          </>
        )}

        {draft.usePlatformLLM && (
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4 leading-relaxed">
            使用平台提供的 LLM 服务，无需配置。适合大多数用户。
          </p>
        )}

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {testing ? '测试中…' : '测试连接'}
          </button>
          {testResult === true && (
            <span className="text-sm text-green-600 dark:text-green-400">✓ 连接成功</span>
          )}
          {testResult === false && (
            <span className="text-sm text-red-500 dark:text-red-400">✗ 连接失败</span>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
