import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Check if a phone number belongs to an existing customer (has orders).
 */
export function useIsCustomer(telefone: string | null) {
  return useQuery({
    queryKey: ["is_customer", telefone],
    queryFn: async () => {
      if (!telefone) return false;
      const { data, error } = await supabase
        .from("customers")
        .select("id")
        .eq("telefone", telefone)
        .limit(1);
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
    enabled: !!telefone,
  });
}

/**
 * Register a new lead attempt (tentativa) in leads_pipeline.
 * Allows multiple records per phone number.
 */
export function useRegisterLeadAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      telefone: string;
      nome?: string | null;
      etapa_pipeline: string;
      origem?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("leads_pipeline")
        .insert({
          telefone: params.telefone,
          nome: params.nome || null,
          etapa_pipeline: params.etapa_pipeline,
          status: "perdido",
          convertido: false,
          data_interacao: new Date().toISOString(),
          data_entrada: new Date().toISOString(),
          data_ultima_interacao: new Date().toISOString(),
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads_pipeline"] });
    },
  });
}
