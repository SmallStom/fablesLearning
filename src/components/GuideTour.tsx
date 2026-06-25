import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'worldview_guided_explore';

/** 引导步骤配置 */
interface TourStep {
  selector: string;
  title: string;
  desc: string;
  placement: 'top' | 'bottom' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="input"]',
    title: '输入概念',
    desc: '输入你想理解的概念，或点击下方的预设标签',
    placement: 'bottom',
  },
  {
    selector: '[data-tour="fable"]',
    title: '寓言正文',
    desc: '寓言正文用熟悉的世界讲概念',
    placement: 'top',
  },
  {
    selector: '[data-tour="concept"]',
    title: '概念解析',
    desc: '展开看概念的解释说明和故事映射',
    placement: 'top',
  },
];

export default function GuideTour() {
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  /** 检查是否已引导过 */
  const checkGuided = useCallback(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }, []);

  /** 标记完成 */
  const markGuided = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  /** 启动引导 */
  const start = () => {
    if (!checkGuided()) {
      setActive(true);
      setStepIdx(0);
    }
  };

  useEffect(() => {
    // 延迟启动，等待页面渲染
    const timer = setTimeout(start, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 监听步骤变化，获取目标元素位置
  useEffect(() => {
    if (!active) return;
    const step = TOUR_STEPS[stepIdx];
    if (!step) return;

    const updateRect = () => {
      const el = document.querySelector(step.selector);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };

    updateRect();
    // 监听滚动和 resize 更新位置
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [active, stepIdx]);

  /** 下一步 / 完成 */
  const handleNext = () => {
    if (stepIdx < TOUR_STEPS.length - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      markGuided();
      setActive(false);
    }
  };

  /** 跳过 */
  const handleSkip = () => {
    markGuided();
    setActive(false);
  };

  if (!active) return null;

  const step = TOUR_STEPS[stepIdx];
  const elementExists = rect !== null;

  // 计算高亮框位置和提示气泡位置
  const highlightStyle: React.CSSProperties = elementExists
    ? {
        position: 'fixed',
        top: rect!.top - 4,
        left: rect!.left - 4,
        width: rect!.width + 8,
        height: rect!.height + 8,
        borderRadius: '12px',
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
        transition: 'all 0.3s ease',
        zIndex: 200,
        pointerEvents: 'none',
      }
    : {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 200,
      };

  // 提示气泡位置
  let tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 201,
    maxWidth: '300px',
  };

  if (elementExists && step.placement === 'bottom') {
    // 气泡在高亮下方
    tooltipStyle = {
      ...tooltipStyle,
      top: rect!.bottom + 16,
      left: Math.max(16, Math.min(rect!.left, window.innerWidth - 316)),
    };
  } else if (elementExists && step.placement === 'top') {
    // 气泡在高亮上方
    tooltipStyle = {
      ...tooltipStyle,
      top: Math.max(16, rect!.top - 130),
      left: Math.max(16, Math.min(rect!.left, window.innerWidth - 316)),
    };
  } else {
    // 元素不存在，居中显示
    tooltipStyle = {
      ...tooltipStyle,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  return (
    <>
      {/* 高亮遮罩 */}
      <div style={highlightStyle} />

      {/* 提示气泡 */}
      <div
        style={tooltipStyle}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-5 animate-fade-in"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {stepIdx + 1} / {TOUR_STEPS.length}
          </span>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
            {step.title}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
          {elementExists
            ? step.desc
            : `${step.desc}（生成寓言后会出现）`}
        </p>
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            跳过引导
          </button>
          <button
            onClick={handleNext}
            className="px-5 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            {stepIdx < TOUR_STEPS.length - 1 ? '知道了' : '完成'}
          </button>
        </div>
      </div>
    </>
  );
}
