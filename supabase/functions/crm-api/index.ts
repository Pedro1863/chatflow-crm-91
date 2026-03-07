import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // GET actions
    if (req.method === "GET") {
      if (action === "list_contatos") {
        const status = url.searchParams.get("status_funil");
        let query = supabase.from("contatos").select("*").order("ultima_interacao", { ascending: false, nullsFirst: false });
        if (status) query = query.eq("status_funil", status);
        const { data, error } = await query;
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "get_contato") {
        const id = url.searchParams.get("id");
        if (!id) throw new Error("id is required");
        const { data, error } = await supabase.from("contatos").select("*").eq("id", id).single();
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "get_mensagens") {
        const contato_id = url.searchParams.get("contato_id");
        if (!contato_id) throw new Error("contato_id is required");
        const { data, error } = await supabase
          .from("mensagens")
          .select("*")
          .eq("contato_id", contato_id)
          .order("timestamp", { ascending: true });
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // POST actions
    if (req.method === "POST") {
      const body = await req.json();

      if (action === "update_status") {
        const { contato_id, status_funil } = body;
        if (!contato_id || !status_funil) throw new Error("contato_id and status_funil are required");
        const { data, error } = await supabase
          .from("contatos")
          .update({ status_funil })
          .eq("id", contato_id)
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "create_contato") {
        const { data, error } = await supabase
          .from("contatos")
          .insert(body)
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("CRM API error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
