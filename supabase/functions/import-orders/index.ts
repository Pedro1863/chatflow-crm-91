import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderRow {
  bling_id?: string;
  order_id?: string;
  telefone?: string;
  valor_pedido: number;
  data_pedido?: string;
  nome_cliente?: string;
  raw: Record<string, string>;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(";").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = line.split(";").map(v => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  });
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) return "+" + digits;
  if (digits.length === 12 && digits.startsWith("55")) return "+" + digits;
  if (digits.length === 11) return "+55" + digits;
  if (digits.length === 10) return "+55" + digits;
  return phone.trim();
}

function parseValue(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDate(val: string): string | null {
  if (!val) return null;
  // Try dd/mm/yyyy
  const brMatch = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00Z`;
  }
  // Try yyyy-mm-dd
  const isoMatch = val.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00Z`;
  }
  return null;
}

function mapRow(raw: Record<string, string>): OrderRow {
  // "id contato" is the Bling CUSTOMER ID; "id" is the ORDER ID
  const bling_contact_id = raw["id contato"] || raw["id_contato"] || raw["bling_id"] || raw["codigo do contato"] || "";
  const order_id = raw["n° do pedido"] || raw["numero"] || raw["id_pedido"] || raw["id"] || "";
  const telefone = raw["telefone"] || raw["fone"] || raw["celular"] || raw["phone"] || "";
  const valor = raw["preço total"] || raw["valor"] || raw["valor_pedido"] || raw["total"] || raw["valor_total"] || "0";
  const data = raw["data"] || raw["data_pedido"] || raw["date"] || "";
  const nome = raw["nome do contato"] || raw["nome"] || raw["cliente"] || raw["nome_cliente"] || "";

  return {
    bling_id: bling_contact_id || undefined,
    order_id: order_id || undefined,
    telefone: telefone ? normalizePhone(telefone) : undefined,
    valor_pedido: parseValue(valor),
    data_pedido: data || undefined,
    nome_cliente: nome || undefined,
    raw,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const csvTexts: string[] = Array.isArray(body.csv_data) ? body.csv_data : [body.csv_data];

    // Parse all CSVs into one list
    const allRows: OrderRow[] = [];
    for (const csv of csvTexts) {
      const parsed = parseCSV(csv);
      allRows.push(...parsed.map(mapRow));
    }

    // Load all customers for matching
    const { data: customers } = await supabase.from("customers").select("id, bling_id, telefone, nome");
    const byBling = new Map<string, { id: string; telefone: string }>();
    const byPhone = new Map<string, { id: string; bling_id: string | null }>();

    for (const c of customers || []) {
      if (c.bling_id) byBling.set(c.bling_id, { id: c.id, telefone: c.telefone });
      if (c.telefone) byPhone.set(c.telefone, { id: c.id, bling_id: c.bling_id });
    }

    let vinculados = 0;
    let falhas = 0;
    let leadsConvertidos = 0;
    const inconsistencias: { order: OrderRow; motivo: string }[] = [];
    const clientesAtualizados = new Set<string>();

    for (const order of allRows) {
      if (order.valor_pedido <= 0 && !order.bling_id) {
        inconsistencias.push({ order, motivo: "Pedido sem valor e sem identificador" });
        falhas++;
        continue;
      }

      let matched: { id: string; telefone?: string; bling_id?: string | null } | null = null;
      let matchMethod = "";

      // Priority: bling_id
      if (order.bling_id && byBling.has(order.bling_id)) {
        const m = byBling.get(order.bling_id)!;
        matched = { id: m.id, telefone: m.telefone };
        matchMethod = "bling_id";
      }
      // Fallback: telefone
      if (!matched && order.telefone && byPhone.has(order.telefone)) {
        const m = byPhone.get(order.telefone)!;
        matched = { id: m.id, bling_id: m.bling_id };
        matchMethod = "telefone";
      }

      if (!matched) {
        inconsistencias.push({
          order,
          motivo: `Cliente não encontrado (bling_id: ${order.bling_id || "N/A"}, telefone: ${order.telefone || "N/A"})`,
        });
        falhas++;
        continue;
      }

      // Update customer with actual order date
      const parsedDate = order.data_pedido ? parseDate(order.data_pedido) : null;
      const { error } = await supabase.rpc("registrar_pedido", {
        _bling_id: order.bling_id || null,
        _telefone: order.telefone || null,
        _valor_pedido: order.valor_pedido,
        _data_pedido: parsedDate || new Date().toISOString(),
      });

      if (error) {
        inconsistencias.push({ order, motivo: `Erro ao atualizar: ${error.message}` });
        falhas++;
        continue;
      }

      vinculados++;
      clientesAtualizados.add(matched.id);
    }

    // Mark leads as converted for updated customers
    for (const customerId of clientesAtualizados) {
      const customer = (customers || []).find(c => c.id === customerId);
      if (!customer?.telefone) continue;

      const { data: leads } = await supabase
        .from("leads_pipeline")
        .select("id")
        .eq("telefone", customer.telefone)
        .eq("convertido", false)
        .order("data_interacao", { ascending: false })
        .limit(1);

      if (leads && leads.length > 0) {
        await supabase
          .from("leads_pipeline")
          .update({ convertido: true })
          .eq("id", leads[0].id);
        leadsConvertidos++;
      }
    }

    const resumo = {
      total_pedidos: allRows.length,
      vinculados,
      falhas,
      clientes_atualizados: clientesAtualizados.size,
      leads_convertidos: leadsConvertidos,
      inconsistencias: inconsistencias.map(i => ({
        bling_id: i.order.bling_id || null,
        telefone: i.order.telefone || null,
        nome: i.order.nome_cliente || null,
        valor: i.order.valor_pedido,
        motivo: i.motivo,
      })),
    };

    return new Response(JSON.stringify(resumo), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
