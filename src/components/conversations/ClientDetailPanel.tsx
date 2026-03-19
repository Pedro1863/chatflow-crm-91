import { useContato, useUpdateContato } from "@/hooks/use-crm-data";
import { useRegisterLeadAttempt, useMarkLeadConverted } from "@/hooks/use-leads-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save, User } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Props {
  contatoId: string;
}

const statusLabels: Record<string, string> = {
  novo_lead: "Novo Lead",
  contato_iniciado: "Contato Iniciado",
  proposta_enviada: "Proposta Enviada",
  cliente: "Cliente",
};

// Map funnel stages to pipeline etapas for lead attempts
const stageToEtapa: Record<string, string> = {
  novo_lead: "primeiro_contato_sem_resposta",
  contato_iniciado: "primeiro_contato_sem_resposta",
  proposta_enviada: "proposta_sem_resposta",
};

export function ClientDetailPanel({ contatoId }: Props) {
  const { data: contato, isLoading } = useContato(contatoId);
  const updateContato = useUpdateContato();
  const registerAttempt = useRegisterLeadAttempt();
  const markConverted = useMarkLeadConverted();

  const [form, setForm] = useState({
    nome: "",
    empresa: "",
    cidade: "",
    status_funil: "novo_lead",
  });

  useEffect(() => {
    if (contato) {
      setForm({
        nome: contato.nome || "",
        empresa: contato.empresa || "",
        cidade: contato.cidade || "",
        status_funil: contato.status_funil || "novo_lead",
      });
    }
  }, [contato]);

  const handleSave = () => {
    if (!contato) return;

    // 1. Update the contato
    updateContato.mutate(
      { id: contatoId, ...form },
      {
        onSuccess: () => {
          toast.success("Contato atualizado!");

          // 2. Register lead attempt based on the stage
          if (form.status_funil === "cliente") {
            // Mark latest attempt as converted
            markConverted.mutate(contato.telefone);
          } else {
            // Register as new attempt (salvo_manualmente = true blocks popup)
            const etapa = stageToEtapa[form.status_funil] || "primeiro_contato_sem_resposta";
            registerAttempt.mutate({
              telefone: contato.telefone,
              nome: form.nome || contato.nome,
              etapa_pipeline: etapa,
              origem: contato.origem,
              salvo_manualmente: true,
            });
          }
        },
      }
    );
  };

  if (isLoading) return <div className="w-80 border-l border-border p-4 text-muted-foreground text-sm">Carregando...</div>;

  return (
    <div className="w-80 border-l border-border bg-card overflow-y-auto scrollbar-thin animate-slide-in shrink-0">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <User className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Detalhes do Contato</h3>
        </div>
        <p className="text-xs text-muted-foreground">{contato?.telefone}</p>
        {contato?.origem && (
          <p className="text-xs text-muted-foreground">Origem: {contato.origem}</p>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Nome</Label>
          <Input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome do contato"
            className="mt-1 bg-muted border-0"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Empresa</Label>
          <Input
            value={form.empresa}
            onChange={(e) => setForm({ ...form, empresa: e.target.value })}
            placeholder="Empresa"
            className="mt-1 bg-muted border-0"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Cidade</Label>
          <Input
            value={form.cidade}
            onChange={(e) => setForm({ ...form, cidade: e.target.value })}
            placeholder="Cidade"
            className="mt-1 bg-muted border-0"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Status do Funil</Label>
          <Select value={form.status_funil} onValueChange={(v) => setForm({ ...form, status_funil: v })}>
            <SelectTrigger className="mt-1 bg-muted border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} className="w-full" disabled={updateContato.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Salvar
        </Button>
      </div>
    </div>
  );
}
