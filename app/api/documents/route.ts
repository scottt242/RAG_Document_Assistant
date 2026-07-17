import { listDocuments } from "@/lib/rag/runtime";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    documents: await listDocuments(),
  });
}
