import { useState } from 'react';
import type { FableResult } from '@/types';

export default function ConceptReveal({ fable }: { fable: FableResult }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="max-w-reader mx-auto mt-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition text-sm font-medium text-gray-700 dark:text-gray-200 border border-transparent"
      >
        <span>📖 概念解析</span>
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="px-4 py-4 animate-fade-in">
          <div className="mb-4">
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">概念</div>
            <div className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {fable.conceptName || fable.concept}
            </div>
            {fable.conceptDefinition && (
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-2">
                {fable.conceptDefinition}
              </p>
            )}
          </div>

          {fable.mappings.length > 0 && (
            <div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">故事 → 概念映射</div>
              <ul className="space-y-2">
                {fable.mappings.map((m, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed flex gap-2"
                  >
                    <span className="text-gray-400 dark:text-gray-500 mt-0.5">·</span>
                    <span>
                      <span className="text-gray-800 dark:text-gray-100">{m.storyElement}</span>
                      <span className="text-gray-400 dark:text-gray-500 mx-1.5">→</span>
                      <span>{m.conceptPart}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
