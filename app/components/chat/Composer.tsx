"use client";

import FileUploader from "../FileUploader";

interface ComposerProps {
  value: string;
  isSending: boolean;
  error: string | null;
  onValueChange: (value: string) => void;
  onSend: () => void;
}

export default function Composer({
  value,
  isSending,
  error,
  onValueChange,
  onSend,
}: ComposerProps) {
  return (
    <footer className="border-t border-white/10 bg-slate-950/85 px-4 py-4 backdrop-blur-xl md:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-3 shadow-[0_24px_80px_rgba(2,6,23,0.55)]">
          <textarea
            className="min-h-[84px] w-full resize-none bg-transparent px-3 py-2 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500"
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask a question about the uploaded PDFs..."
            value={value}
          />

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
            <FileUploader />

            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSending || !value.trim()}
              onClick={onSend}
              type="button"
            >
              <span>{isSending ? "Sending" : "Send"}</span>
              <span aria-hidden="true" className="text-base leading-none">^</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
