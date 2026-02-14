'use client';

import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function MarkdownView({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        code(props) {
          const { children, className } = props;
          const match = /language-(\w+)/.exec(className || '');
          const code = String(children).replace(/\n$/, '');

          if (match) {
            return (
              <div className="relative">
                <button
                  className="absolute left-2 top-2 rounded bg-slate-700 px-2 py-1 text-xs"
                  onClick={() => void navigator.clipboard.writeText(code)}
                >
                  کپی
                </button>
                <SyntaxHighlighter language={match[1]} style={atomDark} PreTag="div">
                  {code}
                </SyntaxHighlighter>
              </div>
            );
          }

          return <code className="rounded bg-slate-800 px-1">{children}</code>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
