import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_orders",
  title: "List orders",
  description: "List recent orders, optionally filtered by customer telefone (E.164 digits only).",
  inputSchema: {
    telefone: z.string().trim().optional().describe("Optional E.164 digits-only phone filter."),
    limit: z.number().int().min(1).max(100).optional().describe("Max orders (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ telefone, limit }) => {
    let q = sb()
      .from("orders")
      .select("id, telefone, valor_total, data_pedido, bling_id, produtos")
      .order("data_pedido", { ascending: false })
      .limit(limit ?? 20);
    if (telefone) q = q.eq("telefone", telefone);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { orders: data ?? [] },
    };
  },
});
