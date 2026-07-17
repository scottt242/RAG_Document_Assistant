// Polyfill Web APIs that might be missing in serverless Node.js environments
if (typeof globalThis.DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {};
}
