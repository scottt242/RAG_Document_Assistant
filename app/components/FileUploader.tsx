"use client";

import { useRef } from "react";
import { useChatStore } from "@/store/chat-store";

export default function FileUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadPdf = useChatStore((state) => state.uploadPdf);
  const isUploading = useChatStore((state) => state.isUploading);
  const uploadProgress = useChatStore((state) => state.uploadProgress);
  const lastProgress = uploadProgress[uploadProgress.length - 1];

  return (
    <div className="flex items-center gap-3">
      <button
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        <span aria-hidden="true" className="text-base leading-none">+</span>
        {isUploading ? "Indexing" : "Upload PDF"}
      </button>

      <input
        accept="application/pdf"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }

          await uploadPdf(file);
          event.target.value = "";
        }}
        ref={inputRef}
        type="file"
      />

      {lastProgress ? (
        <div className="max-w-[12rem] text-xs leading-5 text-slate-400">
          <div className="truncate text-slate-200">{lastProgress.message}</div>
          <div>{lastProgress.progress ?? 0}% indexed</div>
        </div>
      ) : null}
    </div>
  );
}
