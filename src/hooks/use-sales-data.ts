import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export type Customer = {
  id: string;
  nome: string | null;
  telefone: string;
  data_primeiro_contato: string | null;
  data_conversao: string | null;
  total_pedidos: number;
  valor_total_comprado: number;
  data_ultimo_pedido: string | null;
  origem_lead: string | null;
  status_cliente: string | null;
};

export type LeadPipeline = {
  id: string;
  nome: string | null;
  telefone: string;
  data_entrada: string | null;
  etapa_pipeline: string | null;
  motivo_perda: string | null;
  data_ultima_interacao: string | null;
  status: string | null;
};

function useRealtimeInvalidation(table: string, queryKey: string[]) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}-${queryKey.join("-")}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        qc.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryKey.join("-"), qc]);
}

export function useCustomers() {
  useRealtimeInvalidation("customers", ["customers"]);
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("data_conversao", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useLeadsPipeline() {
  useRealtimeInvalidation("leads_pipeline", ["leads_pipeline"]);
  return useQuery({
    queryKey: ["leads_pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads_pipeline")
        .select("*")
        .order("data_entrada", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as LeadPipeline[];
    },
  });
}
