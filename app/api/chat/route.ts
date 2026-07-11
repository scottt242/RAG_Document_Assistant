import { runConversationChat } from "@/lib/rag/runtime";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      question?: string;
      conversationId?: string;
    };

    const question = body.question?.trim();
    if (!question) {
      return Response.json({ error: "question is required" }, { status: 400 });
    }

    const result = await runConversationChat({
      conversationId: body.conversationId,
      question,
    });

    return Response.json({
      conversationId: result.conversation.id,
      answer: result.answer,
      sources: result.sources,
      messages: result.conversation.messages,
      title: result.conversation.title,
      updatedAt: result.conversation.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
