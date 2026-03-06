import { useContact, useUpdateContact } from "@/hooks/use-crm-data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save, User } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Props {
  contactId: string;
}

const stageLabels: Record<string, string> = {
  novo_lead: "Novo Lead",
  qualificacao: "Qualificação",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechamento: "Fechamento",
  pos_venda: "Pós-venda",
  perdido: "Perdido",
};

const prefLabels: Record<string, string> = {
  a_vista: "À vista",
  parcelado: "Parcelado",
  financiamento: "Financiamento",
  indefinido: "Indefinido",
};

const probLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  muito_alta: "Muito Alta",
};

export function ClientDetailPanel({ contactId }: Props) {
  const { data: contact, isLoading } = useContact(contactId);
  const updateContact = useUpdateContact();

  const [form, setForm] = useState({
    name: "",
    product_interest: "",
    sale_stage: "novo_lead",
    purchase_preference: "indefinido",
    conversion_probability: "media",
    notes: "",
  });

  useEffect(() => {
    if (contact) {
      setForm({
        name: contact.name || "",
        product_interest: contact.product_interest || "",
        sale_stage: contact.sale_stage || "novo_lead",
        purchase_preference: contact.purchase_preference || "indefinido",
        conversion_probability: contact.conversion_probability || "media",
        notes: contact.notes || "",
      });
    }
  }, [contact]);

  const handleSave = () => {
    updateContact.mutate(
      { id: contactId, ...form },
      { onSuccess: () => toast.success("Cliente atualizado!") }
    );
  };

  if (isLoading) return <div className="w-80 border-l border-border p-4 text-muted-foreground text-sm">Carregando...</div>;

  return (
    <div className="w-80 border-l border-border bg-card overflow-y-auto scrollbar-thin animate-slide-in shrink-0">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <User className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Detalhes do Cliente</h3>
        </div>
        <p className="text-xs text-muted-foreground">{contact?.phone}</p>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Nome</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nome do cliente"
            className="mt-1 bg-muted border-0"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Produto de Interesse</Label>
          <Input
            value={form.product_interest}
            onChange={(e) => setForm({ ...form, product_interest: e.target.value })}
            placeholder="Ex: Plano Pro"
            className="mt-1 bg-muted border-0"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Etapa da Venda</Label>
          <Select value={form.sale_stage} onValueChange={(v) => setForm({ ...form, sale_stage: v })}>
            <SelectTrigger className="mt-1 bg-muted border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(stageLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Preferência de Compra</Label>
          <Select value={form.purchase_preference} onValueChange={(v) => setForm({ ...form, purchase_preference: v })}>
            <SelectTrigger className="mt-1 bg-muted border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(prefLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Probabilidade de Conversão</Label>
          <Select value={form.conversion_probability} onValueChange={(v) => setForm({ ...form, conversion_probability: v })}>
            <SelectTrigger className="mt-1 bg-muted border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(probLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Observações</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Anotações sobre o cliente..."
            className="mt-1 bg-muted border-0 min-h-[80px]"
          />
        </div>

        <Button onClick={handleSave} className="w-full" disabled={updateContact.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Salvar
        </Button>
      </div>
    </div>
  );
}
