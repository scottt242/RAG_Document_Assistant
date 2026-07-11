"use client";

import type { ConversationSummary, DocumentRecord, UploadProgressEvent } from "@/types/chat";
import FileUploader from "../FileUploader";

interface SidebarProps {
  documents: DocumentRecord[];
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  uploadProgress: UploadProgressEvent[];
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
}

export default function Sidebar({
  documents,
  conversations,
  activeConversationId,
  uploadProgress,
  onNewConversation,
  onSelectConversation,
}: SidebarProps) {
  return (
    <aside className="flex h-full flex-col border-r border-white/10 bg-slate-950/90 px-4 py-5 backdrop-blur-xl md:w-80">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">
          RAG Workspace
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
          Document Assistant
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Manual rewrite, retrieval, context, prompt, and Gemini answer flow.
        </p>
      </div>

      <div className="space-y-3">
        <button
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15"
          onClick={onNewConversation}
          type="button"
        >
          <span aria-hidden="true" className="text-base leading-none">+</span>
          New conversation
        </button>
        <FileUploader />
      </div>

      <div className="mt-6 space-y-6 overflow-y-auto pr-1">
        <section className="space-y-3">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
            Current conversation
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            {conversations.find((conversation) => conversation.id === activeConversationId)?.title ?? "No conversation selected"}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-500">
            <span>Conversations</span>
            <span>{conversations.length}</span>
          </div>
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  conversation.id === activeConversationId
                    ? "border-cyan-400/30 bg-cyan-400/10 text-slate-50"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/8"
                }`}
                onClick={() => onSelectConversation(conversation.id)}
                type="button"
              >
                <div className="truncate text-sm font-medium">{conversation.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {conversation.messageCount} messages
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-500">
            <span>Uploaded PDFs</span>
            <span>{documents.length}</span>
          </div>
          <div className="space-y-2">
            {documents.length ? (
              documents.map((document) => (
                <div
                  key={document.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-100">
                        {document.originalName}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {document.pages} pages / {document.chunks} chunks
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.18em] ${
                        document.status === "ready"
                          ? "bg-emerald-400/15 text-emerald-200"
                          : document.status === "error"
                            ? "bg-rose-400/15 text-rose-200"
                            : "bg-amber-400/15 text-amber-200"
                      }`}
                    >
                      {document.status}
                    </span>
                  </div>
                  {document.error ? (
                    <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs leading-6 text-rose-100">
                      {document.error}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 p-4 text-sm text-slate-500">
                Upload a PDF to build the vector store.
              </div>
            )}
          </div>
        </section>

        {uploadProgress.length ? (
          <section className="space-y-3">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Indexing progress
            </div>
            <div className="space-y-2">
              {uploadProgress.slice(-4).map((item, index) => (
                <div key={`${item.stage ?? item.type}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-100">{item.message}</span>
                    <span className="text-xs text-slate-500">{item.progress ?? 0}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-cyan-400 transition-all"
                      style={{ width: `${item.progress ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
