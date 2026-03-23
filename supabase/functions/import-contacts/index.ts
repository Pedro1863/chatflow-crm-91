import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (!digits) return "";
  if (digits.length === 13 && digits.startsWith("55")) return digits;
  if (digits.length === 12 && digits.startsWith("55")) return digits;
  if (digits.length === 11) return "55" + digits;
  if (digits.length === 10) return "55" + digits;
  return digits;
}

function parseDateBR(dateStr: string): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return dateStr;
}

interface ContactRow {
  bling_id: string;
  nome: string;
  telefone: string;
  cidade: string;
  cliente_desde: string | null;
}

function mapRow(raw: Record<string, string>): ContactRow | null {
  const bling_id = raw["id"] || "";
  if (!bling_id) return null;

  const nome = raw["nome"] || "";
  const fone = raw["fone"] || "";
  const celular = raw["celular"] || "";
  const cidade = raw["cidade"] || "";
  const cliente_desde = raw["cliente desde"] || "";

  const telefone = normalizePhone(celular || fone);

  return {
    bling_id,
    nome: nome || "",
    telefone,
    cidade,
    cliente_desde: parseDateBR(cliente_desde),
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

    let total_linhas = 0;
    let importados = 0;
    let atualizados = 0;
    let ignorados = 0;
    const erros: { bling_id: string; nome: string; motivo: string }[] = [];

    for (const csv of csvTexts) {
      const parsed = parseCSV(csv);
      total_linhas += parsed.length;

      for (const raw of parsed) {
        const contact = mapRow(raw);
        if (!contact || !contact.bling_id) {
          ignorados++;
          continue;
        }

        // Check if customer already exists by bling_id
        const { data: existing } = await supabase
          .from("customers")
          .select("id, telefone, data_primeiro_contato, data_conversao")
          .eq("bling_id", contact.bling_id)
          .maybeSingle();

        if (existing) {
          // Update with contact info (fill missing data)
          const updates: Record<string, unknown> = {};
          if (contact.nome) updates.nome = contact.nome;
          if (contact.telefone && existing.telefone?.startsWith("bling_")) {
            updates.telefone = contact.telefone;
          }
          if (contact.cliente_desde) {
            // Always overwrite with contact's "Cliente desde" — it's the true origin date
            updates.data_primeiro_contato = contact.cliente_desde;
            updates.data_conversao = contact.cliente_desde;
          }

          if (Object.keys(updates).length > 0) {
            const { error } = await supabase
              .from("customers")
              .update(updates)
              .eq("id", existing.id);
            if (error) {
              erros.push({ bling_id: contact.bling_id, nome: contact.nome, motivo: error.message });
            } else {
              atualizados++;
            }
          } else {
            ignorados++;
          }
        } else {
          // Create new customer from contact
          const { error } = await supabase.from("customers").insert({
            bling_id: contact.bling_id,
            nome: contact.nome || null,
            telefone: contact.telefone || `bling_${contact.bling_id}`,
            data_primeiro_contato: contact.cliente_desde,
            data_conversao: contact.cliente_desde,
            status_cliente: "ativo",
          });
          if (error) {
            erros.push({ bling_id: contact.bling_id, nome: contact.nome, motivo: error.message });
          } else {
            importados++;
          }
        }
      }
    }

    const resumo = {
      total_linhas,
      importados,
      atualizados,
      ignorados,
      erros_count: erros.length,
      erros: erros.slice(0, 50),
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
