import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { BaseMessage } from "@langchain/core/messages";
import type { DocumentInterface } from "@langchain/core/documents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

function getGoogleApiKey() {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is required to run chat.");
  }

  return apiKey;
}

function createChatModel() {
  return new ChatGoogleGenerativeAI({
    apiKey: getGoogleApiKey(),
    model: "gemini-2.5-flash",
  });
}

export async function loadPDF(path: string) {
  const loader = new PDFLoader(path);
  const docs = await loader.load();

  console.log(`Loaded ${docs.length} documents from ${path}`);
  return docs;
}

export async function splitDocuments(docs: DocumentInterface[]) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  return splitter.splitDocuments(docs);
}

export async function vectorStoreDocuments(docs: DocumentInterface[]) {
  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    apiKey: getGoogleApiKey(),
  });

  const vectorStore = new MemoryVectorStore(embeddings);
  await vectorStore.addDocuments(docs);

  return vectorStore;
}

export async function retrieveDocs(
  query: string,
  vectorDB: MemoryVectorStore,
  k = 3
) {
  const retriever = vectorDB.asRetriever(k);
  return retriever.invoke(query);
}

async function rewriteQuestion(question: string, history: BaseMessage[]) {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "Rewrite the user question into a standalone question. Use the conversation history. Do not answer the question.",
    ],
    new MessagesPlaceholder("history"),
    ["human", "{question}"],
  ]);

  const formatted = await prompt.formatMessages({ history, question });
  const response = await createChatModel().invoke(formatted);

  return typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);
}

export async function chat(
  question: string,
  history: BaseMessage[] = [],
  vectorStore: MemoryVectorStore
) {
  const standaloneQuestion = await rewriteQuestion(question, history);
  const docs = await retrieveDocs(standaloneQuestion, vectorStore, 3);
  const context = docs.map((doc) => doc.pageContent).join("\n\n");

  const promptStr = `You are a helpful assistant that answers questions based on the provided context.
If the answer is not contained within the context, respond with "I don't know.".

Context:
${context}
`;

const template = ChatPromptTemplate.fromMessages([
  ["system", promptStr],
  new MessagesPlaceholder("history"),
  ["user", "{question}"]
]);

const prompt = await template.formatMessages({ question, context, history });
const response = await createChatModel().invoke(prompt);

return {
  answer:
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content),
  sources: docs,
};
}