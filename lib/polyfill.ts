// Polyfill Web APIs that might be missing in serverless Node.js environments
if (typeof globalThis.DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {};
}

// Force Next.js NFT (Node File Trace) to bundle pdf.worker.mjs by statically importing it
import "pdfjs-dist/legacy/build/pdf.worker.mjs";

