import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * FableViewer：寓言正文渲染。
 * 流式模式下对 markdown 内容做 debounce，避免每个 delta 都重新解析。
 */
export default function FableViewer({
  content,
  streaming = false,
}: {
  content: string;
  streaming?: boolean;
}) {
  const [debouncedContent, setDebouncedContent] = useState(content);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 非流式模式直接使用原始内容
    if (!streaming) {
      setDebouncedContent(content);
      return;
    }

    // 流式模式：debounce 150ms，减少 ReactMarkdown 重新解析频率
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedContent(content);
    }, 150);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content, streaming]);

  // 流式结束时立即刷新最终内容
  useEffect(() => {
    if (!streaming && timerRef.current) {
      clearTimeout(timerRef.current);
      setDebouncedContent(content);
    }
  }, [streaming, content]);

  return (
    <div className="max-w-reader mx-auto dark:text-gray-200">
      <div className="fable-content" style={streaming ? { animation: 'none' } : undefined}>
        <ReactMarkdown
          components={{
            // 流式模式下禁用段落动画
            p: ({ children }) => (
              <p style={streaming ? { animation: 'none' } : undefined}>{children}</p>
            ),
          }}
        >
          {debouncedContent}
        </ReactMarkdown>
        {streaming && (
          <span className="inline-block w-[2px] h-[1.1em] bg-gray-400 dark:bg-gray-500 align-text-bottom animate-pulse" />
        )}
      </div>
      {!streaming && (
        <div className="text-center text-gray-300 dark:text-gray-600 text-lg mt-8 mb-4">✦</div>
      )}
    </div>
  );
}
