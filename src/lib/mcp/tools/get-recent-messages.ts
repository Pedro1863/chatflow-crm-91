import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_recent_messages",
  title: "Get recent messages",
  description: "Fetch the most recent WhatsApp messages for a given contato_id, newest first.",
  inputSchema: {
    contato_id: z.string().uuid().describe("Contato UUID."),
    limit: z.number().int().min(1).max(100).optional().describe("Max messages (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ contato_id, limit }) => {
    const { data, error } = await sb()
      .from("mensagens")
      .select("id, direcao, mensagem, type, timestamp, status")
      .eq("contato_id", contato_id)
      .order("timestamp", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { messages: data ?? [] },
    };
  },
});
