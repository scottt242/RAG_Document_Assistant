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

const stateFile = process.env.VERCEL
  ? path.join("/tmp", "state.json")
  : path.join(process.cwd(), "uploads", "state.json");

async function saveState() {
  try {
    const data = {
      documents: state.documents,
      conversations: state.conversations,
      activeConversationId: state.activeConversationId,
    };
    await fs.mkdir(path.dirname(stateFile), { recursive: true });
    await fs.writeFile(stateFile, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save state:", error);
  }
}

async function restoreVectorStore() {
  try {
    const uploadsDir = process.env.VERCEL
      ? path.join("/tmp", "uploads")
      : path.join(process.cwd(), "uploads");

    for (const doc of state.documents) {
      if (doc.status !== "ready") continue;
      const storedPath = path.join(uploadsDir, doc.storedName);
      
      try {
        await fs.access(storedPath);
        const pages = await loadPDF(storedPath);
        if (pages.length) {
          const chunks = await splitDocuments(pages);
          if (!state.vectorStore) {
            state.vectorStore = await vectorStoreDocuments(chunks);
          } else {
            await state.vectorStore.addDocuments(chunks);
          }
        }
      } catch (e) {
        console.warn(`Could not restore file ${doc.storedName}:`, e);
      }
    }
  } catch (error) {
    console.error("Failed to restore vector store:", error);
  }
}

async function loadState() {
  try {
    const content = await fs.readFile(stateFile, "utf-8");
    const data = JSON.parse(content);
    state.documents = data.documents || [];
    state.conversations = data.conversations || [];
    state.activeConversationId = data.activeConversationId || null;
    
    if (!state.vectorStore && state.documents.length > 0) {
      console.log("Restoring vector store from saved documents...");
      void restoreVectorStore();
    }
  } catch (error) {
    // If state file doesn't exist, that's fine
  }
}

let isLoaded = false;
const loadPromise = loadState().then(() => {
  isLoaded = true;
});

async function ensureLoaded() {
  if (!isLoaded) {
    await loadPromise;
  }
}

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

async function getOrCreateConversation(id?: string) {
  await ensureLoaded();
  if (id) {
    const existing = state.conversations.find((conversation) => conversation.id === id);
    if (existing) {
      return existing;
    }
  }

  const conversation: ConversationRecord = {
    id: id || randomUUID(),
    title: "New conversation",
    createdAt: now(),
    updatedAt: now(),
    messages: [],
    history: [],
  };

  state.conversations.unshift(conversation);
  state.activeConversationId = conversation.id;
  await saveState();
  return conversation;
}

export async function createConversation(title = "New conversation") {
  await ensureLoaded();
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
  await saveState();
  return conversation;
}

export async function listConversations() {
  await ensureLoaded();
  return state.conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: conversation.messages.length,
    isActive: conversation.id === state.activeConversationId,
  }));
}

export async function listDocuments() {
  await ensureLoaded();
  return state.documents;
}

export async function getConversation(id: string) {
  await ensureLoaded();
  let conversation = state.conversations.find((conversation) => conversation.id === id);
  if (!conversation) {
    conversation = {
      id,
      title: "New conversation",
      createdAt: now(),
      updatedAt: now(),
      messages: [],
      history: [],
    };
    state.conversations.push(conversation);
    await saveState();
  }
  return conversation;
}

export async function getActiveConversation() {
  await ensureLoaded();
  const active = state.activeConversationId
    ? await getConversation(state.activeConversationId)
    : null;

  return active ?? (state.conversations[0] ?? await createConversation());
}

export async function setActiveConversation(id: string) {
  await ensureLoaded();
  const conversation = await getOrCreateConversation(id);
  state.activeConversationId = conversation.id;
  await saveState();
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
  await ensureLoaded();
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
  await saveState();

  const progress = (stage: string, message: string, progressValue: number) => {
    onProgress?.({ type: "progress", stage, message, progress: progressValue });
  };

  try {
    progress("saving", "Saving uploaded PDF", 10);
    const { storedName, storedPath, size } = await saveUploadFile(file);
    document.storedName = storedName;
    document.size = size;
    await saveState();

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
    await saveState();

    progress("ready", "Document is ready to chat", 100);

    return document;
  } catch (error) {
    document.status = "error";
    document.error = error instanceof Error ? error.message : String(error);
    document.updatedAt = now();
    await saveState();
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
  await ensureLoaded();
  const conversation = await getOrCreateConversation(conversationId);

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
  await saveState();

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
  await saveState();

  return {
    conversation,
    answer,
    sources,
  };
}

export async function ensureInitialConversation() {
  await ensureLoaded();
  if (!state.conversations.length) {
    await createConversation();
  }

  return getActiveConversation();
}
