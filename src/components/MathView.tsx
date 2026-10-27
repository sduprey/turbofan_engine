import React, { useMemo } from 'react';
import katex from 'katex';

interface MathViewProps {
  math: string;
  display?: boolean;
  className?: string;
}

export const MathView: React.FC<MathViewProps> = ({ math, display = false, className = '' }) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: display,
        throwOnError: false,
        strict: false,
      });
    } catch (e) {
      console.error('KaTeX rendering error:', e);
      return `<span class="text-rose-400 font-mono text-xs">${math}</span>`;
    }
  }, [math, display]);

  return (
    <span
      className={`inline-block select-text ${display ? 'my-2 max-w-full overflow-x-auto text-center' : ''} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
