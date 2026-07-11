"use client";

import type { ChatMessage } from "@/types/chat";
import MarkdownMessage from "./MarkdownMessage";
import SourcePanel from "./SourcePanel";

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-3xl border border-white/10 bg-cyan-500/10 px-4 py-3 text-sm leading-7 text-slate-100 shadow-[0_10px_30px_rgba(8,15,31,0.35)]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
        <span className="text-xs font-semibold">AI</span>
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm leading-7 text-slate-100 shadow-[0_10px_30px_rgba(8,15,31,0.35)]">
          <MarkdownMessage content={message.content} />
        </div>

        {message.sources?.length ? (
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Sources
            </div>
            <div className="grid gap-3">
              {message.sources.map((source) => (
                <SourcePanel key={source.id} source={source} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
