"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { Button } from "@/presentation/components/ui/button";

export function MarkdownView({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const text = String(children).replace(/\n$/, "");
          if (!match) return <code className="rounded bg-zinc-800 px-1" {...props}>{children}</code>;
          return (
            <div className="relative">
              <Button size="sm" variant="ghost" className="absolute left-2 top-2 z-10" onClick={() => navigator.clipboard.writeText(text)}>کپی</Button>
              <SyntaxHighlighter style={atomDark} language={match[1]} PreTag="div">{text}</SyntaxHighlighter>
            </div>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
