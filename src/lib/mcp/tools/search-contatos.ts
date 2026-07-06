import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_contatos",
  title: "Search contatos",
  description: "Search CRM contacts by name or phone. Returns up to `limit` matches.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Name or phone fragment to search for."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const { data, error } = await sb()
      .from("contatos")
      .select("id, nome, telefone, status_funil, ultima_interacao")
      .or(`nome.ilike.%${query}%,telefone.ilike.%${query}%`)
      .order("ultima_interacao", { ascending: false, nullsFirst: false })
      .limit(limit ?? 10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { contatos: data ?? [] },
    };
  },
});
