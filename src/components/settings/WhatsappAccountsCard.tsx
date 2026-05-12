import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Phone, Plus, Trash2, Star, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useWhatsappAccounts,
  useUpsertWhatsappAccount,
  useDeleteWhatsappAccount,
  useSetDefaultWhatsappAccount,
  type WhatsappAccount,
} from "@/hooks/use-whatsapp-accounts";

const empty = { label: "", phone_number_id: "", display_phone_number: "" };

const WhatsappAccountsCard = () => {
  const { data: accounts = [], isLoading } = useWhatsappAccounts();
  const upsert = useUpsertWhatsappAccount();
  const del = useDeleteWhatsappAccount();
  const setDefault = useSetDefaultWhatsappAccount();
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEdit = (a: WhatsappAccount) => {
    setEditingId(a.id);
    setForm({
      label: a.label || "",
      phone_number_id: a.phone_number_id || "",
      display_phone_number: a.display_phone_number || "",
    });
  };

  const reset = () => {
    setEditingId(null);
    setForm(empty);
  };

  const handleSave = () => {
    if (!form.label.trim() || !form.phone_number_id.trim()) {
      toast.error("Informe rótulo e phone_number_id");
      return;
    }
    upsert.mutate(
      { id: editingId || undefined, ...form },
      {
        onSuccess: () => {
          toast.success(editingId ? "Conta atualizada" : "Conta adicionada");
          reset();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
      }
    );
  };

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Contas WhatsApp (Multi-número)</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Cadastre os números de WhatsApp Business (ex: Loja POA, Loja Alvorada). O <code>phone_number_id</code> é
          encontrado no Meta Business Manager → WhatsApp → API Setup.
        </p>

        {/* Lista */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
            Nenhuma conta cadastrada ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 bg-muted/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{a.label || "(sem nome)"}</span>
                    {a.is_default && (
                      <Badge variant="default" className="gap-1 text-[10px]">
                        <Star className="h-3 w-3" /> Padrão
                      </Badge>
                    )}
                    {!a.is_active && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {a.display_phone_number || "—"} · ID: <code>{a.phone_number_id}</code>
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!a.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDefault.mutate(a.id, {
                          onSuccess: () => toast.success("Conta padrão definida"),
                        })
                      }
                    >
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => startEdit(a)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Remover "${a.label}"?`)) {
                        del.mutate(a.id, { onSuccess: () => toast.success("Removida") });
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form */}
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-sm font-medium text-foreground">
            {editingId ? "Editar conta" : "Adicionar conta"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Rótulo</Label>
              <Input
                placeholder="Loja POA"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">phone_number_id</Label>
              <Input
                placeholder="123456789012345"
                value={form.phone_number_id}
                onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Número (display)</Label>
              <Input
                placeholder="+55 51 99999-9999"
                value={form.display_phone_number}
                onChange={(e) => setForm({ ...form, display_phone_number: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} size="sm" disabled={upsert.isPending} className="gap-1.5">
              {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {editingId ? "Salvar alterações" : "Adicionar"}
            </Button>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={reset}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsappAccountsCard;
