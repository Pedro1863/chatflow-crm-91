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
  status: string;
  whatsapp_message_id: string | null;
  type: string;
  media_url: string | null;
  media_id: string | null;
  mime_type: string | null;
  file_name: string | null;
};

// ── Realtime helper ──

function useRealtimeInvalidation(table: string, queryKey: string[]) {
  const qc = useQueryClient();
  const keyStr = queryKey.join("-");

  useEffect(() => {
    const channelName = `rt-${table}-${keyStr}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, keyStr]);
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

const MESSAGES_PAGE_SIZE = 20;

export function useMensagens(contatoId: string | null) {
  useRealtimeInvalidation("mensagens", ["mensagens", contatoId || ""]);
  return useQuery({
    queryKey: ["mensagens", contatoId],
    queryFn: async () => {
      if (!contatoId) return { messages: [] as Mensagem[], hasMore: false };
      // Get total count
      const { count, error: countError } = await supabase
        .from("mensagens")
        .select("*", { count: "exact", head: true })
        .eq("contato_id", contatoId);
      if (countError) throw countError;

      const total = count || 0;
      const offset = Math.max(0, total - MESSAGES_PAGE_SIZE);

      const { data, error } = await supabase
        .from("mensagens")
        .select("*")
        .eq("contato_id", contatoId)
        .order("timestamp", { ascending: true })
        .range(offset, offset + MESSAGES_PAGE_SIZE - 1);
      if (error) throw error;
      return { messages: data as Mensagem[], hasMore: offset > 0, total };
    },
    enabled: !!contatoId,
  });
}

export function useLoadMoreMensagens(contatoId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ currentCount, total }: { currentCount: number; total: number }) => {
      if (!contatoId) return [];
      const remaining = total - currentCount;
      const loadSize = Math.min(MESSAGES_PAGE_SIZE, remaining);
      const offset = Math.max(0, remaining - loadSize);

      const { data, error } = await supabase
        .from("mensagens")
        .select("*")
        .eq("contato_id", contatoId)
        .order("timestamp", { ascending: true })
        .range(offset, offset + loadSize - 1);
      if (error) throw error;
      return data as Mensagem[];
    },
    onSuccess: (olderMessages) => {
      qc.setQueryData(["mensagens", contatoId], (old: any) => {
        if (!old) return old;
        const combined = [...olderMessages, ...old.messages];
        // deduplicate
        const seen = new Set<string>();
        const unique = combined.filter((m: Mensagem) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        const newCount = unique.length;
        return {
          messages: unique,
          hasMore: newCount < old.total,
          total: old.total,
        };
      });
    },
  });
}

// ── Webhook URL helper (now reads from DB) ──

export { getWebhookUrlFromDb as getN8nWebhookUrlAsync } from "@/hooks/use-system-settings";

// Legacy sync accessor — kept only for chat send which needs it inline
// New code should use getWebhookUrlFromDb() or useSystemSetting("n8n_webhook_url")
export function getN8nWebhookUrl(): string {
  // Deprecated — returns empty; callers should migrate to async version
  return "";
}

export function setN8nWebhookUrl(_url: string) {
  // No-op — webhook URL is now stored in system_settings table
}

export function useSendMensagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (msg: { contato_id: string; telefone: string; mensagem: string; vendedor?: string }) => {
      // Get chat webhook URL from DB
      const { data: chatUrlData, error: chatUrlError } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "n8n_chat_webhook_url")
        .maybeSingle();
      if (chatUrlError) throw chatUrlError;
      const webhookUrl = chatUrlData?.value || "";
      if (!webhookUrl) {
        throw new Error("URL do webhook de chat não configurada. Vá em Configurações para definir.");
      }

      // 1. Save outgoing message to Supabase
      const { data: inserted, error: dbError } = await supabase.from("mensagens").insert({
        contato_id: msg.contato_id,
        telefone: msg.telefone,
        mensagem: msg.mensagem,
        direcao: "saida",
        vendedor: msg.vendedor || null,
      }).select("id").single();
      if (dbError) throw dbError;

      // 2. Update ultima_interacao
      await supabase
        .from("contatos")
        .update({ ultima_interacao: new Date().toISOString() })
        .eq("id", msg.contato_id);

      // 3. Send to n8n webhook (includes our internal message ID)
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefone: msg.telefone,
          mensagem: msg.mensagem,
          mensagem_id: inserted.id,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Webhook error (message already saved):", errorText);
      }

      return { success: true };
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["mensagens", vars.contato_id] });
      const previous = qc.getQueryData<Mensagem[]>(["mensagens", vars.contato_id]);

      const optimistic: Mensagem = {
        id: `temp-${Date.now()}`,
        contato_id: vars.contato_id,
        telefone: vars.telefone,
        mensagem: vars.mensagem,
        direcao: "saida",
        vendedor: vars.vendedor || null,
        timestamp: new Date().toISOString(),
        status: "sent",
        whatsapp_message_id: null,
        type: "text",
        media_url: null,
        media_id: null,
        mime_type: null,
        file_name: null,
      };

      qc.setQueryData<Mensagem[]>(["mensagens", vars.contato_id], (old = []) => [...old, optimistic]);

      return { previous };
    },
    onError: (_err, vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["mensagens", vars.contato_id], context.previous);
      }
    },
    onSettled: (_, __, vars) => {
      qc.invalidateQueries({ queryKey: ["mensagens", vars.contato_id] });
      qc.invalidateQueries({ queryKey: ["contatos"] });
    },
  });
}
