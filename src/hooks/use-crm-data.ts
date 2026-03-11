import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export type Contato = {
  id: string;
  nome: string | null;
  telefone: string;
  empresa: string | null;
  cidade: string | null;
  status_funil: string;
  origem: string | null;
  ultima_interacao: string | null;
  data_criacao: string;
};

export type Mensagem = {
  id: string;
  contato_id: string;
  telefone: string | null;
  mensagem: string;
  direcao: string;
  vendedor: string | null;
  timestamp: string;
};

// ── Realtime helper ──

function useRealtimeInvalidation(table: string, queryKey: string[]) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}-${queryKey.join("-")}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          qc.invalidateQueries({ queryKey });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryKey.join("-"), qc]);
}

// ── Contatos ──

export function useContatos() {
  useRealtimeInvalidation("contatos", ["contatos"]);
  return useQuery({
    queryKey: ["contatos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contatos")
        .select("*")
        .order("ultima_interacao", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Contato[];
    },
  });
}

export function useContato(id: string | null) {
  return useQuery({
    queryKey: ["contato", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("contatos")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Contato;
    },
    enabled: !!id,
  });
}

export function useUpdateContato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase
        .from("contatos")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contatos"] });
      qc.invalidateQueries({ queryKey: ["contato"] });
    },
  });
}

// ── Mensagens ──

export function useMensagens(contatoId: string | null) {
  useRealtimeInvalidation("mensagens", ["mensagens", contatoId || ""]);
  return useQuery({
    queryKey: ["mensagens", contatoId],
    queryFn: async () => {
      if (!contatoId) return [];
      const { data, error } = await supabase
        .from("mensagens")
        .select("*")
        .eq("contato_id", contatoId)
        .order("timestamp", { ascending: true });
      if (error) throw error;
      return data as Mensagem[];
    },
    enabled: !!contatoId,
  });
}

export function useSendMensagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (msg: { contato_id: string; telefone: string; mensagem: string; vendedor?: string }) => {
      // Call edge function to send via WhatsApp and save to DB
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: msg,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["mensagens", vars.contato_id] });
      qc.invalidateQueries({ queryKey: ["contatos"] });
    },
  });
}
