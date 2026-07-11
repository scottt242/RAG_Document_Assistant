"use client";

import { create } from "zustand";
import type {
  ChatApiResponse,
  ChatMessage,
  ConversationSummary,
  DocumentRecord,
  UploadProgressEvent,
} from "@/types/chat";

interface ChatStore {
  documents: DocumentRecord[];
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  draft: string;
  isHydrating: boolean;
  isSending: boolean;
  isUploading: boolean;
  uploadProgress: UploadProgressEvent[];
  error: string | null;
  typing: boolean;
  loadBootstrap: () => Promise<void>;
  refreshDocuments: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  setDraft: (value: string) => void;
  createConversation: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  sendMessage: () => Promise<void>;
  uploadPdf: (file: File) => Promise<void>;
}

function readNdjsonLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as UploadProgressEvent);
}

async function streamProgressEvents(
  response: Response,
  onEvent: (event: UploadProgressEvent) => void
) {
  if (!response.body) {
    const events = readNdjsonLines(await response.text());
    events.forEach(onEvent);
    return events;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  const events: UploadProgressEvent[] = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffered += decoder.decode(value, { stream: true });
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      const event = JSON.parse(trimmed) as UploadProgressEvent;
      events.push(event);
      onEvent(event);
    }
  }

  if (buffered.trim()) {
    const event = JSON.parse(buffered) as UploadProgressEvent;
    events.push(event);
    onEvent(event);
  }

  return events;
}

async function getJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    try {
      const payload = JSON.parse(text) as { error?: string };
      throw new Error(payload.error ?? text);
    } catch {
      throw new Error(text);
    }
  }

  return (await response.json()) as T;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  documents: [],
  conversations: [],
  activeConversationId: null,
  messages: [],
  draft: "",
  isHydrating: true,
  isSending: false,
  isUploading: false,
  uploadProgress: [],
  error: null,
  typing: false,
  loadBootstrap: async () => {
    set({ isHydrating: true, error: null });

    try {
      const [documentsResponse, conversationsResponse] = await Promise.all([
        getJson<{ documents: DocumentRecord[] }>("/api/documents"),
        getJson<{
          activeConversationId: string | null;
          conversations: ConversationSummary[];
        }>("/api/conversations"),
      ]);

      const activeConversationId = conversationsResponse.activeConversationId;
      set({
        documents: documentsResponse.documents,
        conversations: conversationsResponse.conversations,
        activeConversationId,
      });

      if (activeConversationId) {
        await get().selectConversation(activeConversationId);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      set({ isHydrating: false });
    }
  },
  refreshDocuments: async () => {
    const response = await getJson<{ documents: DocumentRecord[] }>("/api/documents");
    set({ documents: response.documents });
  },
  refreshConversations: async () => {
    const response = await getJson<{
      activeConversationId: string | null;
      conversations: ConversationSummary[];
    }>("/api/conversations");
    set({
      conversations: response.conversations,
      activeConversationId: response.activeConversationId,
    });
  },
  setDraft: (value: string) => set({ draft: value }),
  createConversation: async () => {
    const response = await getJson<{
      activeConversationId: string;
      conversations: ConversationSummary[];
    }>("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New conversation" }),
    });

    set({
      conversations: response.conversations,
      activeConversationId: response.activeConversationId,
      messages: [],
      error: null,
    });
  },
  selectConversation: async (id: string) => {
    const response = await getJson<{ conversation: { id: string; messages: ChatMessage[] } }>(
      `/api/conversations/${id}`
    );

    set({
      activeConversationId: response.conversation.id,
      messages: response.conversation.messages,
      error: null,
    });
  },
  sendMessage: async () => {
    const question = get().draft.trim();
    const activeConversationId = get().activeConversationId;

    if (!question || get().isSending) {
      return;
    }

    set({ isSending: true, typing: true, error: null, draft: "" });

    try {
      const response = await getJson<ChatApiResponse>("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, conversationId: activeConversationId }),
      });

      set({
        activeConversationId: response.conversationId,
        messages: response.messages,
        conversations: [
          {
            id: response.conversationId,
            title: response.title,
            createdAt: new Date().toISOString(),
            updatedAt: response.updatedAt,
            messageCount: response.messages.length,
            isActive: true,
          },
          ...get().conversations.filter((conversation) => conversation.id !== response.conversationId),
        ],
      });

      await get().refreshConversations();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      set({ isSending: false, typing: false });
    }
  },
  uploadPdf: async (file: File) => {
    set({ isUploading: true, uploadProgress: [], error: null });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await streamProgressEvents(response, (event) => {
        set((state) => ({
          uploadProgress: [...state.uploadProgress, event],
          error: event.type === "error" ? event.message : state.error,
        }));
      });

      await get().refreshDocuments();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      set({ isUploading: false });
    }
  },
}));
