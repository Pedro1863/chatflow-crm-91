import { useState, useEffect, useCallback } from "react";
import { useContato, useMensagens } from "@/hooks/use-crm-data";
import { useIsCustomer, useRegisterLeadAttempt } from "@/hooks/use-leads-actions";
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
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

const INACTIVITY_MS = 4 * 60 * 60 * 1000; // 4 hours

const etapaOptions = [
  { value: "primeiro_contato_sem_resposta", label: "Não respondeu após primeira mensagem" },
  { value: "proposta_sem_resposta", label: "Não respondeu após proposta" },
  { value: "negociacao_sem_resposta", label: "Não respondeu na negociação" },
  { value: "frete_sem_resposta", label: "Não respondeu no frete" },
];

interface Props {
  contatoId: string | null;
}

export function InactivityPopup({ contatoId }: Props) {
  const { data: contato } = useContato(contatoId);
  const { data: mensagens = [] } = useMensagens(contatoId);
  const { data: isCustomer } = useIsCustomer(contato?.telefone ?? null);
  const registerAttempt = useRegisterLeadAttempt();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const checkInactivity = useCallback(() => {
    if (!contatoId || !contato || isCustomer) return;
    if (dismissed === contatoId) return;

    // Check if pipeline stage is already set to "cliente"
    if (contato.status_funil === "cliente") return;

    // Find the last message timestamp
    const lastMsg = mensagens[mensagens.length - 1];
    if (!lastMsg) return;

    const lastTime = new Date(lastMsg.timestamp).getTime();
    const now = Date.now();

    if (now - lastTime >= INACTIVITY_MS) {
      setOpen(true);
    }
  }, [contatoId, contato, isCustomer, mensagens, dismissed]);

  useEffect(() => {
    // Reset dismissed when switching contacts
    setDismissed(null);
    setOpen(false);
  }, [contatoId]);

  useEffect(() => {
    const interval = setInterval(checkInactivity, 60_000); // check every minute
    checkInactivity(); // immediate check
    return () => clearInterval(interval);
  }, [checkInactivity]);

  const handleSelect = (etapa: string) => {
    if (!contato) return;
    registerAttempt.mutate(
      {
        telefone: contato.telefone,
        nome: contato.nome,
        etapa_pipeline: etapa,
        origem: contato.origem,
      },
      {
        onSuccess: () => {
          toast.success("Tentativa de venda registrada");
          setOpen(false);
          setDismissed(contatoId);
        },
        onError: () => toast.error("Erro ao registrar tentativa"),
      }
    );
  };

  if (!contatoId || isCustomer) return null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Lead inativo há mais de 4 horas
          </AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{contato?.nome || contato?.telefone}</strong> não recebeu interação.
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
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDismissed(contatoId)}>
            Ignorar por agora
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
