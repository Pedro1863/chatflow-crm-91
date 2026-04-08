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
  novo_lead: "Sem Produto",
  contato_iniciado: "Contato Iniciado",
  proposta_enviada: "Proposta Enviada",
  cliente: "Cliente",
};

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

  const isDirty = contato && (
    form.nome !== (contato.nome || "") ||
    form.empresa !== (contato.empresa || "") ||
    form.cidade !== (contato.cidade || "") ||
    form.status_funil !== (contato.status_funil || "novo_lead")
  );

  const handleSave = () => {
    if (!contato) return;
    updateContato.mutate(
      { id: contatoId, ...form },
      {
        onSuccess: () => {
          toast.success("Contato atualizado!");
          if (form.status_funil === "cliente") {
            markConverted.mutate(contato.telefone);
          } else {
            const etapa = stageToEtapa[form.status_funil] || "primeiro_contato_sem_resposta";
            registerAttempt.mutate({
              telefone: contato.telefone,
              nome: form.nome || contato.nome,
              etapa_pipeline: etapa,
              origem: contato.origem,
              salvo_manualmente: true,
              origem_tentativa: "manual",
            });
          }
        },
      }
    );
  };

  if (isLoading) return <div className="w-80 border-l border-border p-4 text-muted-foreground text-sm">Carregando...</div>;

  return (
    <div className="w-80 border-l border-border bg-card/50 backdrop-blur-sm overflow-y-auto scrollbar-thin animate-slide-in shrink-0">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground text-sm">Detalhes do Contato</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{contato?.telefone}</p>
        {contato?.origem && (
          <p className="text-xs text-muted-foreground">Origem: {contato.origem}</p>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground font-medium">Nome</Label>
          <Input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome do contato"
            className="mt-1.5 bg-muted/50 border-border/50 rounded-xl"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground font-medium">Empresa</Label>
          <Input
            value={form.empresa}
            onChange={(e) => setForm({ ...form, empresa: e.target.value })}
            placeholder="Empresa"
            className="mt-1.5 bg-muted/50 border-border/50 rounded-xl"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground font-medium">Cidade</Label>
          <Input
            value={form.cidade}
            onChange={(e) => setForm({ ...form, cidade: e.target.value })}
            placeholder="Cidade"
            className="mt-1.5 bg-muted/50 border-border/50 rounded-xl"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground font-medium">Status do Funil</Label>
          <Select value={form.status_funil} onValueChange={(v) => setForm({ ...form, status_funil: v })}>
            <SelectTrigger className="mt-1.5 bg-muted/50 border-border/50 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isDirty && (
          <Button onClick={handleSave} className="w-full rounded-xl glow-primary" disabled={updateContato.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        )}
      </div>
    </div>
  );
}
