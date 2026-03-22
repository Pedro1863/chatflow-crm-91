import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function para registrar pedidos via n8n ou chamadas externas.
 * 
 * POST body:
 * {
 *   "telefone": "+5551999999999",     // opcional se bling_id presente
 *   "bling_id": "12345678",           // opcional se telefone presente
 *   "nome_cliente": "Maria Silva",    // opcional, usado ao criar cliente novo
 *   "valor_pedido": 159.90,           // obrigatório
 *   "data_pedido": "2026-03-20",      // opcional, default = now()
 *   "id_pedido": "PED-001"            // opcional, evita duplicatas
 * }
 * 
 * Resposta:
 * {
 *   "success": true,
 *   "customer": { ... },
 *   "novo_cliente": true/false
 * }
 */
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
    const { telefone, bling_id, nome_cliente, valor_pedido, data_pedido, id_pedido } = body;

    if (!telefone && !bling_id) {
      return new Response(
        JSON.stringify({ error: "telefone ou bling_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (valor_pedido === undefined || valor_pedido === null) {
      return new Response(
        JSON.stringify({ error: "valor_pedido é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase.rpc("registrar_pedido", {
      _telefone: telefone || null,
      _bling_id: bling_id || null,
      _nome_cliente: nome_cliente || null,
      _valor_pedido: parseFloat(valor_pedido) || 0,
      _data_pedido: data_pedido || new Date().toISOString(),
      _id_pedido: id_pedido || null,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customer = data && data.length > 0 ? data[0] : null;

    return new Response(
      JSON.stringify({
        success: true,
        customer,
        novo_cliente: customer?.total_pedidos === 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
