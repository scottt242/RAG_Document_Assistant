import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { loadPDF, splitDocuments, vectorStoreDocuments, chat } from "@/lib/loader";
import type { DocumentInterface } from "@langchain/core/documents";

export type DocumentStatus = "processing" | "ready" | "error";

export interface StoredDocument {
  id: string;
  originalName: string;
  storedName: string;
  size: number;
  status: DocumentStatus;
  uploadedAt: string;
  updatedAt: string;
  pages: number;
  chunks: number;
  error?: string;
}

export interface SourceRecord {
  id: string;
  label: string;
  heading: string;
  content: string;
  filename: string;
  pageNumber?: number;
}

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sources?: SourceRecord[];
}

export interface ConversationRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: StoredMessage[];
  history: BaseMessage[];
}

interface RuntimeState {
  vectorStore: MemoryVectorStore | null;
  documents: StoredDocument[];
  conversations: ConversationRecord[];
  activeConversationId: string | null;
}

type ProgressHandler = (event: {
  type: "progress";
  stage: string;
  message: string;
  progress: number;
}) => void;

declare global {
  var __ragRuntimeState: RuntimeState | undefined;
}

const state: RuntimeState =
  globalThis.__ragRuntimeState ??
  (globalThis.__ragRuntimeState = {
    vectorStore: null,
    documents: [],
    conversations: [],
    activeConversationId: null,
  });

function now() {
  return new Date().toISOString();
}

function toTitle(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return "New conversation";
  }

  return trimmed.length > 42 ? `${trimmed.slice(0, 42)}...` : trimmed;
}

function contentToString(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }

        return JSON.stringify(part);
      })
      .join("\n");
  }

  return JSON.stringify(content);
}

function extractPageNumber(doc: DocumentInterface) {
  const pageNumber = doc.metadata?.loc?.pageNumber;

  return typeof pageNumber === "number" ? pageNumber : undefined;
}

function normalizeSource(doc: DocumentInterface, index: number): SourceRecord {
  const filename =
    typeof doc.metadata?.source === "string"
      ? path.basename(doc.metadata.source)
      : "Uploaded PDF";
  const pageNumber = extractPageNumber(doc);

  return {
    id: doc.id ?? `${index + 1}`,
    label: pageNumber ? `Page ${pageNumber}` : `Chunk ${index + 1}`,
    heading: pageNumber
      ? `Context from Page ${pageNumber}`
      : `Context from Chunk ${index + 1}`,
    content: doc.pageContent,
    filename,
    pageNumber,
  };
}

function getOrCreateConversation(id?: string) {
  if (id) {
    const existing = state.conversations.find((conversation) => conversation.id === id);
    if (existing) {
      return existing;
    }
  }

  const conversation: ConversationRecord = {
    id: randomUUID(),
    title: "New conversation",
    createdAt: now(),
    updatedAt: now(),
    messages: [],
    history: [],
  };

  state.conversations.unshift(conversation);
  state.activeConversationId = conversation.id;
  return conversation;
}

export function createConversation(title = "New conversation") {
  const conversation: ConversationRecord = {
    id: randomUUID(),
    title,
    createdAt: now(),
    updatedAt: now(),
    messages: [],
    history: [],
  };

  state.conversations.unshift(conversation);
  state.activeConversationId = conversation.id;
  return conversation;
}

export function listConversations() {
  return state.conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: conversation.messages.length,
    isActive: conversation.id === state.activeConversationId,
  }));
}

export function listDocuments() {
  return state.documents;
}

export function getConversation(id: string) {
  return state.conversations.find((conversation) => conversation.id === id) ?? null;
}

export function getActiveConversation() {
  const active = state.activeConversationId
    ? getConversation(state.activeConversationId)
    : null;

  return active ?? (state.conversations[0] ?? createConversation());
}

export function setActiveConversation(id: string) {
  const conversation = getOrCreateConversation(id);
  state.activeConversationId = conversation.id;
  return conversation;
}

export async function saveUploadFile(file: File) {
  const uploadsDir = process.env.VERCEL
    ? path.join("/tmp", "uploads")
    : path.join(process.cwd(), "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const storedName = `${Date.now()}-${file.name ?? "upload.pdf"}`;
  const storedPath = path.join(uploadsDir, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(storedPath, buffer);

  return { storedName, storedPath, size: file.size };
}

export async function ingestPdfUpload({
  file,
  onProgress,
}: {
  file: File;
  onProgress?: ProgressHandler;
}) {
  const document: StoredDocument = {
    id: randomUUID(),
    originalName: file.name,
    storedName: file.name,
    size: file.size,
    status: "processing",
    uploadedAt: now(),
    updatedAt: now(),
    pages: 0,
    chunks: 0,
  };

  state.documents.unshift(document);

  const progress = (stage: string, message: string, progressValue: number) => {
    onProgress?.({ type: "progress", stage, message, progress: progressValue });
  };

  try {
    progress("saving", "Saving uploaded PDF", 10);
    const { storedName, storedPath, size } = await saveUploadFile(file);
    document.storedName = storedName;
    document.size = size;

    progress("loading", "Extracting PDF pages", 35);
    const pages = await loadPDF(storedPath);
    if (!pages.length) {
      throw new Error("The uploaded PDF is empty.");
    }

    progress("splitting", "Splitting text into chunks", 60);
    const chunks = await splitDocuments(pages as DocumentInterface[]);

    progress("embedding", "Creating embeddings", 80);
    if (!state.vectorStore) {
      state.vectorStore = await vectorStoreDocuments(chunks);
    } else {
      await state.vectorStore.addDocuments(chunks);
    }

    document.pages = pages.length;
    document.chunks = chunks.length;
    document.status = "ready";
    document.updatedAt = now();

    progress("ready", "Document is ready to chat", 100);

    return document;
  } catch (error) {
    document.status = "error";
    document.error = error instanceof Error ? error.message : String(error);
    document.updatedAt = now();
    throw error;
  }
}

export async function runConversationChat({
  conversationId,
  question,
}: {
  conversationId?: string;
  question: string;
}) {
  const conversation = getOrCreateConversation(conversationId);

  if (!state.vectorStore) {
    throw new Error("Upload a PDF before starting a conversation.");
  }

  const userMessage: StoredMessage = {
    id: randomUUID(),
    role: "user",
    content: question,
    createdAt: now(),
  };
  conversation.messages.push(userMessage);
  conversation.history.push(new HumanMessage(question));

  const result = await chat(question, conversation.history, state.vectorStore);
  const answer = contentToString(result.answer);
  const sources = result.sources.map(normalizeSource);

  conversation.messages.push({
    id: randomUUID(),
    role: "assistant",
    content: answer,
    createdAt: now(),
    sources,
  });
  conversation.history.push(new AIMessage(answer));
  conversation.updatedAt = now();
  if (conversation.title === "New conversation") {
    conversation.title = toTitle(question);
  }

  state.activeConversationId = conversation.id;

  return {
    conversation,
    answer,
    sources,
  };
}

export function ensureInitialConversation() {
  if (!state.conversations.length) {
    createConversation();
  }

  return getActiveConversation();
}
