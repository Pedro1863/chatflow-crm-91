import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderRow {
  id_pedido?: string;
  bling_id?: string;
  telefone?: string;
  valor_pedido: number;
  data_pedido?: string;
  nome_cliente?: string;
  raw: Record<string, string>;
}

interface GroupedOrder {
  id_pedido: string;
  bling_id?: string;
  telefone?: string;
  valor_total: number;
  data_pedido?: string;
  nome_cliente?: string;
}

function parseCSV(text: string): Record<string, string>[] {
  const clean = text.replace(/^\uFEFF/, "").trim();
  const lines = clean.split("\n");
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

function parseDateBR(dateStr: string): string {
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return dateStr;
}

function mapRow(raw: Record<string, string>): OrderRow {
  const id_pedido = raw["n° do pedido"] || raw["nº do pedido"] || raw["numero"] || raw["número"] || raw["id_pedido"] || raw["id"] || "";
  const bling_id = raw["id contato"] || raw["id_contato"] || raw["bling_id"] || "";
  const telefone = raw["telefone"] || raw["fone"] || raw["celular"] || raw["phone"] || "";
  const valor = raw["preço total"] || raw["preco total"] || raw["valor"] || raw["valor_pedido"] || raw["total"] || raw["valor_total"] || raw["totalvenda"] || "0";
  const data = raw["data"] || raw["data_pedido"] || raw["date"] || "";
  const nome = raw["nome do contato"] || raw["nome_contato"] || raw["nomecontato"] || raw["nome"] || raw["cliente"] || raw["nome_cliente"] || "";

  return {
    id_pedido: id_pedido || undefined,
    bling_id: bling_id || undefined,
    telefone: telefone ? normalizePhone(telefone) : undefined,
    valor_pedido: parseValue(valor),
    data_pedido: data ? parseDateBR(data) : undefined,
    nome_cliente: nome || undefined,
    raw,
  };
}

function groupByOrderId(rows: OrderRow[]): GroupedOrder[] {
  const groups = new Map<string, OrderRow[]>();
  const noId: OrderRow[] = [];

  for (const row of rows) {
    if (row.id_pedido) {
      const existing = groups.get(row.id_pedido) || [];
      existing.push(row);
      groups.set(row.id_pedido, existing);
    } else {
      noId.push(row);
    }
  }

  const result: GroupedOrder[] = [];

  for (const [id_pedido, orderRows] of groups) {
    const first = orderRows[0];
    const valor_total = orderRows.reduce((sum, r) => sum + r.valor_pedido, 0);
    result.push({
      id_pedido,
      bling_id: first.bling_id,
      telefone: first.telefone,
      valor_total,
      data_pedido: first.data_pedido,
      nome_cliente: first.nome_cliente,
    });
  }

  for (const row of noId) {
    result.push({
      id_pedido: `no_id_${Math.random().toString(36).slice(2)}`,
      bling_id: row.bling_id,
      telefone: row.telefone,
      valor_total: row.valor_pedido,
      data_pedido: row.data_pedido,
      nome_cliente: row.nome_cliente,
    });
  }

  return result;
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

    const allRows: OrderRow[] = [];
    for (const csv of csvTexts) {
      const parsed = parseCSV(csv);
      allRows.push(...parsed.map(mapRow));
    }

    const groupedOrders = groupByOrderId(allRows);

    let vinculados = 0;
    let falhas = 0;
    let novos_clientes = 0;
    const inconsistencias: { order: GroupedOrder; motivo: string }[] = [];

    for (const order of groupedOrders) {
      if (order.valor_total <= 0 && !order.bling_id) {
        inconsistencias.push({ order, motivo: "Pedido sem valor e sem identificador" });
        falhas++;
        continue;
      }

      // Use the updated RPC that handles orders table + customer creation
      const { data, error } = await supabase.rpc("registrar_pedido", {
        _bling_id: order.bling_id || null,
        _telefone: order.telefone || null,
        _valor_pedido: order.valor_total,
        _data_pedido: order.data_pedido || new Date().toISOString(),
        _id_pedido: order.id_pedido || null,
        _nome_cliente: order.nome_cliente || null,
      });

      if (error) {
        inconsistencias.push({ order, motivo: `Erro: ${error.message}` });
        falhas++;
        continue;
      }

      // Check if a new customer was created (data_conversao matches this order date)
      if (data && data.length > 0 && data[0].total_pedidos === 1) {
        novos_clientes++;
      }

      vinculados++;
    }

    const resumo = {
      total_linhas_csv: allRows.length,
      total_pedidos_unicos: groupedOrders.length,
      vinculados,
      falhas,
      novos_clientes,
      inconsistencias: inconsistencias.map(i => ({
        id_pedido: i.order.id_pedido || null,
        bling_id: i.order.bling_id || null,
        telefone: i.order.telefone || null,
        nome: i.order.nome_cliente || null,
        valor: i.order.valor_total,
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
