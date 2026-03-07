import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

// ── Contatos ──

export function useContatos() {
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
    refetchInterval: 5000,
  });
}

export function useSendMensagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (msg: { contato_id: string; telefone: string; mensagem: string; vendedor?: string }) => {
      const { data, error } = await supabase
        .from("mensagens")
        .insert({ ...msg, direcao: "saida" })
        .select()
        .single();
      if (error) throw error;
      // Atualizar ultima_interacao
      await supabase
        .from("contatos")
        .update({ ultima_interacao: new Date().toISOString() })
        .eq("id", msg.contato_id);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["mensagens", vars.contato_id] });
      qc.invalidateQueries({ queryKey: ["contatos"] });
    },
  });
}
