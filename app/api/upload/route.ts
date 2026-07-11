import { ingestPdfUpload } from "@/lib/rag/runtime";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return Response.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    if (file.size > 25 * 1024 * 1024) {
      return Response.json({ error: "File is too large" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (event: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        try {
          const document = await ingestPdfUpload({
            file,
            onProgress: emit as (event: {
              type: "progress";
              stage: string;
              message: string;
              progress: number;
            }) => void,
          });

          emit({ type: "done", message: "Document is ready", progress: 100, document });
        } catch (error) {
          emit({
            type: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
