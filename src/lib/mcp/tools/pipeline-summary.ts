import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "pipeline_summary",
  title: "Pipeline summary",
  description: "Return counts of contatos grouped by status_funil (CRM pipeline stage).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const { data, error } = await sb()
      .from("contatos")
      .select("status_funil");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const counts: Record<string, number> = {};
    for (const r of data ?? []) {
      const k = (r as any).status_funil ?? "unknown";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return {
      content: [{ type: "text", text: JSON.stringify(counts) }],
      structuredContent: { counts },
    };
  },
});
