export interface Source {
  id: string;
  label: string;
  heading: string;
  content: string;
  filename: string;
  pageNumber?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sources?: Source[];
}

export interface DocumentRecord {
  id: string;
  originalName: string;
  storedName: string;
  size: number;
  status: "processing" | "ready" | "error";
  uploadedAt: string;
  updatedAt: string;
  pages: number;
  chunks: number;
  error?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  isActive: boolean;
}

export interface ConversationDetail {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface UploadProgressEvent {
  type: "progress" | "done" | "error";
  stage?: string;
  message: string;
  progress?: number;
  document?: DocumentRecord;
}

export interface ChatApiResponse {
  conversationId: string;
  answer: string;
  sources: Source[];
  messages: ChatMessage[];
  title: string;
  updatedAt: string;
}
