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
  convertido: boolean;
  data_interacao: string | null;
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

export type ChurnMensal = {
  mes: string;
  total_clientes_ativos_inicio: number;
  total_clientes_churnados_no_mes: number;
  taxa_churn_percentual: number;
};

export function useChurnMensal(mesesAtras = 6) {
  return useQuery({
    queryKey: ["churn_mensal", mesesAtras],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("churn_mensal", {
        meses_atras: mesesAtras,
      });
      if (error) throw error;
      return (data as ChurnMensal[]).reverse();
    },
  });
}

export type AquisicaoMensal = {
  mes: string;
  novos_clientes: number;
  receita_novos: number;
  receita_recorrentes: number;
};

export function useAquisicaoMensal(mesesAtras = 6) {
  return useQuery({
    queryKey: ["aquisicao_mensal", mesesAtras],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("metricas_aquisicao_mensal", {
        meses_atras: mesesAtras,
      });
      if (error) throw error;
      return (data as AquisicaoMensal[]).reverse();
    },
  });
}

export type Order = {
  id: string;
  customer_id: string;
  id_pedido: string | null;
  valor: number;
  data_pedido: string;
};

export function useOrders() {
  useRealtimeInvalidation("orders", ["orders"]);
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, customer_id, id_pedido, valor, data_pedido")
        .order("data_pedido", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });
}
