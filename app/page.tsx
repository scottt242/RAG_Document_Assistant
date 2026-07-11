"use client";

import { useEffect } from "react";
import Composer from "./components/chat/Composer";
import MessageList from "./components/chat/MessageList";
import Sidebar from "./components/chat/Sidebar";
import { useChatStore } from "@/store/chat-store";

export default function ChatPage() {
  const documents = useChatStore((state) => state.documents);
  const conversations = useChatStore((state) => state.conversations);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const messages = useChatStore((state) => state.messages);
  const draft = useChatStore((state) => state.draft);
  const isHydrating = useChatStore((state) => state.isHydrating);
  const isSending = useChatStore((state) => state.isSending);
  const typing = useChatStore((state) => state.typing);
  const error = useChatStore((state) => state.error);
  const uploadProgress = useChatStore((state) => state.uploadProgress);
  const loadBootstrap = useChatStore((state) => state.loadBootstrap);
  const setDraft = useChatStore((state) => state.setDraft);
  const createConversation = useChatStore((state) => state.createConversation);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const sendMessage = useChatStore((state) => state.sendMessage);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#020617_100%)] text-slate-100 md:grid md:grid-cols-[20rem_minmax(0,1fr)]">
      <Sidebar
        activeConversationId={activeConversationId}
        conversations={conversations}
        documents={documents}
        onNewConversation={async () => {
          await createConversation();
          setDraft("");
        }}
        onSelectConversation={async (id) => {
          await selectConversation(id);
          setDraft("");
        }}
        uploadProgress={uploadProgress}
      />

      <main className="flex min-h-screen flex-col bg-slate-950/20">
        <header className="border-b border-white/10 bg-slate-950/40 px-4 py-4 backdrop-blur-xl md:px-8">
          <div className="mx-auto flex w-full max-w-4xl items-start justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">
                Manual Conversational RAG
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
                {activeConversation?.title ?? "New conversation"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Rewrite question, retrieve chunks, build context, prompt Gemini, and keep the conversation memory per chat.
              </p>
            </div>

            <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right text-xs text-slate-400 md:block">
              <div className="uppercase tracking-[0.24em] text-slate-500">Status</div>
              <div className="mt-2 text-sm text-slate-100">
                {isHydrating ? "Loading" : typing || isSending ? "Responding" : "Ready"}
              </div>
              <div className="mt-1 text-slate-500">
                {documents.length} PDFs / {conversations.length} conversations
              </div>
            </div>
          </div>
        </header>

        <MessageList isTyping={typing || isSending} messages={messages} />

        <Composer
          error={error}
          isSending={isSending}
          onSend={async () => {
            await sendMessage();
          }}
          onValueChange={setDraft}
          value={draft}
        />
      </main>
    </div>
  );
}
