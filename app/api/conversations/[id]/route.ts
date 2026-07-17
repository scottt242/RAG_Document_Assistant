import { getConversation, setActiveConversation } from "@/lib/rag/runtime";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const conversation = await getConversation(id);

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  await setActiveConversation(id);

  return Response.json({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages,
    },
  });
}
