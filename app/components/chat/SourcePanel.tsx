"use client";

import { useState } from "react";
import type { Source } from "@/types/chat";

interface SourcePanelProps {
  source: Source;
}

export default function SourcePanel({ source }: SourcePanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <button
        className="flex w-full items-start justify-between gap-4 text-left"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <div>
          <div className="text-sm font-medium text-cyan-200">{source.label}</div>
          <div className="text-xs text-slate-400">{source.filename}</div>
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
          {isOpen ? "Collapse" : "Expand"}
        </div>
      </button>

      {isOpen ? (
        <div className="mt-4 border-t border-white/10 pt-4 text-sm leading-6 text-slate-300">
          {source.content}
        </div>
      ) : null}
    </div>
  );
}
