"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface MarkdownMessageProps {
  content: string;
}

export default function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        p({ children }) {
          return <p className="mb-4 last:mb-0 leading-7">{children}</p>;
        },
        ul({ children }) {
          return <ul className="mb-4 list-disc space-y-2 pl-5">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="mb-4 list-decimal space-y-2 pl-5">{children}</ol>;
        },
        li({ children }) {
          return <li className="leading-7">{children}</li>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="mb-4 border-l-2 border-slate-600 pl-4 text-slate-300">
              {children}
            </blockquote>
          );
        },
        a({ children, href }) {
          return (
            <a
              className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-4 hover:text-cyan-200"
              href={href}
              rel="noreferrer"
              target="_blank"
            >
              {children}
            </a>
          );
        },
        code({ className, children, ...props }) {
          const text = String(children);
          const isInline = !className && !text.includes("\n");

          if (isInline) {
            return (
              <code
                className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[0.9em] text-cyan-200"
                {...props}
              >
                {children}
              </code>
            );
          }

          return (
            <pre className="mb-4 overflow-x-auto rounded-2xl border border-white/10 bg-[#0a1020] p-4 text-sm text-slate-100">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
