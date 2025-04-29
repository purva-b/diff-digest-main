import React from 'react';

interface DiffViewerProps {
  diff: string;
}

export default function DiffViewer({ diff }: DiffViewerProps) {
  const lines = diff.split('\n');

  return (
    <pre className="overflow-auto rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 text-sm font-mono">
      {lines.map((line, idx) => {
        let lineClass = 'text-gray-600 dark:text-gray-400';

        if (line.startsWith('+')) {
          lineClass = 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400';
        } else if (line.startsWith('-')) {
          lineClass = 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400';
        } else if (line.startsWith('@@')) {
          lineClass = 'text-blue-600 dark:text-blue-400 font-semibold';
        }

        return (
          <div key={idx} className={`${lineClass} whitespace-pre-wrap`}>
            {line}
          </div>
        );
      })}
    </pre>
  );
}
