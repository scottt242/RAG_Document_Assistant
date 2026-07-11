"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/types/chat";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";

interface MessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
}

export default function MessageList({ messages, isTyping }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        {messages.length ? (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 text-slate-300 shadow-[0_10px_30px_rgba(8,15,31,0.35)]">
            Upload a PDF, then ask a question about it.
          </div>
        )}

        {isTyping ? <TypingIndicator /> : null}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
