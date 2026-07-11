"use client";

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-400">
      <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse [animation-delay:-0.2s]" />
      <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse [animation-delay:-0.1s]" />
      <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
      <span>Gemini is typing</span>
    </div>
  );
}
