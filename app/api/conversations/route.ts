import { createConversation, ensureInitialConversation, listConversations } from "@/lib/rag/runtime";

export const runtime = "nodejs";

export async function GET() {
  const active = await ensureInitialConversation();

  return Response.json({
    activeConversationId: active.id,
    conversations: await listConversations(),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { title?: string };
    const conversation = await createConversation(body.title?.trim() || "New conversation");

    return Response.json({
      activeConversationId: conversation.id,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages,
      },
      conversations: await listConversations(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
