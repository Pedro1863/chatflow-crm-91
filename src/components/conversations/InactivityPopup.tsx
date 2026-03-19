import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useContatos } from "@/hooks/use-crm-data";
import { useRegisterLeadAttempt } from "@/hooks/use-leads-actions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

const INACTIVITY_MS = 4 * 60 * 60 * 1000; // 4 hours

const etapaOptions = [
  { value: "primeiro_contato_sem_resposta", label: "Não respondeu após primeira mensagem" },
  { value: "proposta_sem_resposta", label: "Não respondeu após proposta" },
  { value: "negociacao_sem_resposta", label: "Não respondeu na negociação" },
  { value: "frete_sem_resposta", label: "Não respondeu no frete" },
];

type QueueItem = {
  contatoId: string;
  nome: string | null;
  telefone: string;
  origem: string | null;
  lastMessageAt: string;
};

/** Fetch the last message timestamp for every contato in a single query */
function useLastMessages() {
  return useQuery({
    queryKey: ["last_messages_all"],
    queryFn: async () => {
      // Get the most recent message per contato using a raw approach:
      // fetch all mensagens ordered desc, then deduplicate client-side
      const { data, error } = await supabase
        .from("mensagens")
        .select("contato_id, timestamp")
        .order("timestamp", { ascending: false });
      if (error) throw error;

      const map = new Map<string, string>();
      for (const row of data ?? []) {
        if (!map.has(row.contato_id)) {
          map.set(row.contato_id, row.timestamp);
        }
      }
      return map;
    },
    staleTime: 60_000,
  });
}

/** Fetch all customer phones */
function useCustomerPhones() {
  return useQuery({
    queryKey: ["customer_phones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("telefone");
      if (error) throw error;
      return new Set((data ?? []).map((c) => c.telefone));
    },
    staleTime: 60_000,
  });
}

/** Fetch leads_pipeline entries to know which inactivity periods are already classified */
function useLeadsPipeline() {
  return useQuery({
    queryKey: ["leads_pipeline_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads_pipeline")
        .select("telefone, data_interacao")
        .order("data_interacao", { ascending: false });
      if (error) throw error;

      // Map phone -> most recent data_interacao
      const map = new Map<string, string>();
      for (const row of data ?? []) {
        if (!map.has(row.telefone)) {
          map.set(row.telefone, row.data_interacao ?? "");
        }
      }
      return map;
    },
    staleTime: 30_000,
  });
}

export function InactivityPopup() {
  const { data: contatos = [] } = useContatos();
  const { data: lastMessages } = useLastMessages();
  const { data: customerPhones } = useCustomerPhones();
  const { data: leadsPipeline } = useLeadsPipeline();
  const registerAttempt = useRegisterLeadAttempt();
  const qc = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  // Track phones already processed in this session to avoid re-queuing after invalidation
  const [processedPhones, setProcessedPhones] = useState<Set<string>>(new Set());

  // Build the queue of eligible contacts
  const queue = useMemo<QueueItem[]>(() => {
    if (!lastMessages || !customerPhones || !leadsPipeline) return [];

    const now = Date.now();
    const eligible: QueueItem[] = [];

    for (const contato of contatos) {
      // Skip if already a customer
      if (customerPhones.has(contato.telefone)) continue;

      // Skip if already "cliente" stage
      if (contato.status_funil === "cliente") continue;

      // Skip if processed this session
      if (processedPhones.has(contato.telefone)) continue;

      // Check last message time
      const lastMsgTime = lastMessages.get(contato.id);
      if (!lastMsgTime) continue;

      const elapsed = now - new Date(lastMsgTime).getTime();
      if (elapsed < INACTIVITY_MS) continue;

      // Check if already classified for this inactivity period:
      // If the most recent leads_pipeline entry for this phone has data_interacao
      // AFTER the last message, it means this inactivity was already handled
      const lastPipelineTime = leadsPipeline.get(contato.telefone);
      if (lastPipelineTime && new Date(lastPipelineTime).getTime() > new Date(lastMsgTime).getTime()) {
        continue;
      }

      eligible.push({
        contatoId: contato.id,
        nome: contato.nome,
        telefone: contato.telefone,
        origem: contato.origem,
        lastMessageAt: lastMsgTime,
      });
    }

    return eligible;
  }, [contatos, lastMessages, customerPhones, leadsPipeline, processedPhones]);

  // Reset index when queue changes
  useEffect(() => {
    setCurrentIndex(0);
    setDismissed(false);
  }, [queue.length]);

  const currentItem = queue[currentIndex] ?? null;
  const isOpen = !dismissed && currentItem !== null;
  const total = queue.length;

  const handleSelect = (etapa: string) => {
    if (!currentItem) return;
    registerAttempt.mutate(
      {
        telefone: currentItem.telefone,
        nome: currentItem.nome,
        etapa_pipeline: etapa,
        origem: currentItem.origem,
      },
      {
        onSuccess: () => {
          toast.success(`Tentativa registrada para ${currentItem.nome || currentItem.telefone}`);
          // Mark as processed this session
          setProcessedPhones((prev) => new Set(prev).add(currentItem.telefone));
          // Invalidate leads pipeline cache
          qc.invalidateQueries({ queryKey: ["leads_pipeline_all"] });
          // Move to next
          if (currentIndex < total - 1) {
            setCurrentIndex((i) => i + 1);
          } else {
            setDismissed(true);
          }
        },
        onError: () => toast.error("Erro ao registrar tentativa"),
      }
    );
  };

  const handleSkip = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setDismissed(true);
    }
  };

  const handleDismissAll = () => {
    setDismissed(true);
  };

  if (!isOpen) return null;

  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) handleDismissAll(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center justify-between mb-1">
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Lead inativo há mais de 4 horas
            </AlertDialogTitle>
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
              {currentIndex + 1} de {total}
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
          <AlertDialogDescription className="pt-2">
            <strong>{currentItem.nome || currentItem.telefone}</strong> não recebeu interação.
            Em qual etapa esse lead parou?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          {etapaOptions.map((opt) => (
            <Button
              key={opt.value}
              variant="outline"
              className="w-full justify-start text-left h-auto py-3"
              onClick={() => handleSelect(opt.value)}
              disabled={registerAttempt.isPending}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <AlertDialogFooter className="flex-row gap-2 sm:justify-between">
          <AlertDialogCancel onClick={handleDismissAll}>
            Ignorar todos
          </AlertDialogCancel>
          {total > 1 && (
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Pular este →
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
