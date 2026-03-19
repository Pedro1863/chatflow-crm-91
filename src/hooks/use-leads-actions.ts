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
 * Checks for duplicates: won't insert if there's already an attempt
 * for the same phone+etapa with data_interacao in the last 4 hours.
 */
export function useRegisterLeadAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      telefone: string;
      nome?: string | null;
      etapa_pipeline: string;
      origem?: string | null;
      salvo_manualmente?: boolean;
    }) => {
      // Duplicate check: same phone, same etapa, within last 4 hours
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from("leads_pipeline")
        .select("id")
        .eq("telefone", params.telefone)
        .eq("etapa_pipeline", params.etapa_pipeline)
        .gte("data_interacao", fourHoursAgo)
        .limit(1);

      if (existing && existing.length > 0) {
        // Duplicate found — but if this is a manual save, upgrade the existing entry
        if (params.salvo_manualmente) {
          await supabase
            .from("leads_pipeline")
            .update({
              salvo_manualmente: true,
              popup_exibido: true,
            } as any)
            .eq("id", existing[0].id);
        }
        return existing[0];
      }

      const { data, error } = await supabase
        .from("leads_pipeline")
        .insert({
          telefone: params.telefone,
          nome: params.nome || null,
          etapa_pipeline: params.etapa_pipeline,
          status: "perdido",
          convertido: false,
          salvo_manualmente: params.salvo_manualmente ?? false,
          popup_exibido: false,
          popup_ciclo_data: new Date().toISOString().slice(0, 10),
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
      qc.invalidateQueries({ queryKey: ["leads_pipeline_all"] });
      qc.invalidateQueries({ queryKey: ["contatos"] });
      qc.invalidateQueries({ queryKey: ["contato"] });
    },
  });
}

/**
 * Mark the most recent unconverted attempt for a phone as converted.
 */
export function useMarkLeadConverted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (telefone: string) => {
      // Find the most recent unconverted attempt
      const { data: attempts } = await supabase
        .from("leads_pipeline")
        .select("id")
        .eq("telefone", telefone)
        .eq("convertido", false)
        .order("data_interacao", { ascending: false })
        .limit(1);

      if (attempts && attempts.length > 0) {
        const { error } = await supabase
          .from("leads_pipeline")
          .update({ convertido: true } as any)
          .eq("id", attempts[0].id);
        if (error) throw error;
      }
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads_pipeline"] });
      qc.invalidateQueries({ queryKey: ["leads_pipeline_all"] });
    },
  });
}

/**
 * Mark popup as shown for a specific lead pipeline entry (by phone, today).
 */
export function useMarkPopupShown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { telefone: string; leadId: string }) => {
      const { error } = await supabase
        .from("leads_pipeline")
        .update({
          popup_exibido: true,
          popup_ciclo_data: new Date().toISOString().slice(0, 10),
        } as any)
        .eq("id", params.leadId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads_pipeline_all"] });
    },
  });
}
