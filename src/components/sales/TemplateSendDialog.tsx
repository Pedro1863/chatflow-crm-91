import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Send,
  Loader2,
  Pencil,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  normalizePhone,
  getPhoneStatus,
  type PhoneStatus,
  type SendResult,
  useTodaySends,
  useUpdateCustomerPhone,
  useSendTemplates,
} from "@/hooks/use-template-sends";
import type { Customer } from "@/hooks/use-sales-data";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  templateName: string;
  templateLabel: string;
  webhookPath?: string;
};

const statusIcon: Record<PhoneStatus, React.ReactNode> = {
  valid: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  missing: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  invalid: <XCircle className="h-4 w-4 text-destructive" />,
};

const statusLabel: Record<PhoneStatus, string> = {
  valid: "Válido",
  missing: "Ausente",
  invalid: "Inválido",
};

export default function TemplateSendDialog({
  open,
  onOpenChange,
  customers,
  templateName,
  templateLabel,
  webhookPath = "webhook/send-template",
}: Props) {
  const { data: todaySends = [] } = useTodaySends(templateName);
  const updatePhone = useUpdateCustomerPhone();
  const sendTemplates = useSendTemplates();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[] | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setEditingId(null);
      setShowConfirm(false);
      setSendResults(null);
      setShowErrorDetails(false);
    }
  }, [open]);

  const alreadySentIds = useMemo(
    () => new Set(todaySends.map((s) => s.customer_id)),
    [todaySends]
  );

  const contactList = useMemo(() => {
    return customers.map((c) => {
      const normalized = normalizePhone(c.telefone);
      const status = getPhoneStatus(c.telefone);
      const alreadySent = alreadySentIds.has(c.id);
      return { ...c, normalizedPhone: normalized, phoneStatus: status, alreadySent };
    });
  }, [customers, alreadySentIds]);

  const validContacts = contactList.filter(
    (c) => c.phoneStatus === "valid" && !c.alreadySent
  );
  const invalidCount = contactList.filter(
    (c) => c.phoneStatus !== "valid"
  ).length;
  const alreadySentCount = contactList.filter((c) => c.alreadySent).length;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === validContacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(validContacts.map((c) => c.id)));
    }
  };

  const startEdit = (c: (typeof contactList)[0]) => {
    setEditingId(c.id);
    setEditValue(c.telefone || "");
  };

  const savePhone = async (id: string) => {
    const normalized = normalizePhone(editValue);
    await updatePhone.mutateAsync({ id, telefone: normalized });
    setEditingId(null);
    setEditValue("");
  };

  const selectedContacts = contactList.filter(
    (c) => selected.has(c.id) && c.phoneStatus === "valid" && !c.alreadySent
  );

  const handleSend = async () => {
    try {
      const results = await sendTemplates.mutateAsync({
        contacts: selectedContacts.map((c) => ({
          customer_id: c.id,
          telefone: c.normalizedPhone,
          nome: c.nome,
        })),
        template: templateName,
        webhookPath,
      });
      setSendResults(results);

      const ok = results.filter((r) => r.success).length;
      const fail = results.filter((r) => !r.success).length;
      if (ok > 0 && fail === 0) toast.success(`${ok} template(s) enviado(s) com sucesso`);
      else if (ok > 0 && fail > 0) toast.warning(`${ok} enviado(s), ${fail} falharam`);
      else if (fail > 0) toast.error(`Todos os ${fail} envio(s) falharam`);
    } catch (err: any) {
      if (err.message === "WEBHOOK_NOT_CONFIGURED") {
        toast.error("Webhook não configurado. Vá em Configurações para definir a URL.");
      } else {
        toast.error("Erro inesperado no envio.");
      }
      setSendResults(null);
    }
    setShowConfirm(false);
  };

  // Results screen
  if (sendResults) {
    const successes = sendResults.filter((r) => r.success);
    const failures = sendResults.filter((r) => !r.success);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Resultado do Envio</DialogTitle>
            <DialogDescription>
              {successes.length} enviado(s) com sucesso, {failures.length} falha(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Success summary */}
            {successes.length > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    {successes.length} envio(s) com sucesso
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Templates enviados e registrados
                  </p>
                </div>
              </div>
            )}

            {/* Failures */}
            {failures.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                <button
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  className="flex items-center justify-between w-full"
                >
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-destructive">
                        {failures.length} envio(s) falharam
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Clique para ver detalhes
                      </p>
                    </div>
                  </div>
                  {showErrorDetails ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {showErrorDetails && (
                  <div className="space-y-1.5 pt-2 border-t border-destructive/20 max-h-[30vh] overflow-y-auto">
                    {failures.map((f, i) => (
                      <div
                        key={i}
                        className="rounded border border-border bg-background p-2 space-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-foreground">
                            {f.nome || "Sem nome"}
                          </p>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {f.telefone}
                          </span>
                        </div>
                        <p className="text-[11px] text-destructive break-all">
                          {f.error || "Erro desconhecido"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Confirm screen
  if (showConfirm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Envio</DialogTitle>
            <DialogDescription>
              Revise os dados antes de confirmar o disparo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Template:</span>
              <Badge variant="secondary">{templateLabel}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Contatos válidos:</span>
              <span className="font-bold text-foreground">{selectedContacts.length}</span>
            </div>
            {invalidCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bloqueados (inválidos):</span>
                <span className="font-bold text-destructive">{invalidCount}</span>
              </div>
            )}
            {alreadySentCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Já enviados hoje:</span>
                <span className="font-bold text-amber-500">{alreadySentCount}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Voltar
            </Button>
            <Button
              onClick={handleSend}
              disabled={sendTemplates.isPending || selectedContacts.length === 0}
            >
              {sendTemplates.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Confirmar envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Main contact list screen
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Enviar Template: {templateLabel}</DialogTitle>
          <DialogDescription>
            Selecione os contatos para o disparo. Apenas números válidos podem receber o template.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1">
            Total: {contactList.length}
          </Badge>
          <Badge variant="secondary" className="gap-1 text-emerald-600">
            <CheckCircle2 className="h-3 w-3" /> Válidos: {validContacts.length}
          </Badge>
          {invalidCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" /> Inválidos: {invalidCount}
            </Badge>
          )}
          {alreadySentCount > 0 && (
            <Badge variant="outline" className="gap-1 text-amber-600">
              Já enviados hoje: {alreadySentCount}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Checkbox
            checked={validContacts.length > 0 && selected.size === validContacts.length}
            onCheckedChange={selectAll}
          />
          <span className="text-sm text-muted-foreground">
            Selecionar todos válidos ({validContacts.length})
          </span>
        </div>

        <div className="flex-1 min-h-0 max-h-[45vh] overflow-y-auto -mx-6 px-6">
          <div className="space-y-1.5 py-1">
            {contactList.map((c) => {
              const isEditing = editingId === c.id;
              const canSelect = c.phoneStatus === "valid" && !c.alreadySent;

              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-muted/20 p-2.5"
                >
                  <Checkbox
                    checked={selected.has(c.id)}
                    onCheckedChange={() => toggleSelect(c.id)}
                    disabled={!canSelect}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {c.nome || "Sem nome"}
                    </p>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="5511999999999"
                          className="h-7 text-xs"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => savePhone(c.id)}
                          disabled={updatePhone.isPending}
                        >
                          {updatePhone.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {c.telefone || "—"}
                        </span>
                        {c.phoneStatus !== "valid" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 px-1.5 text-[10px] text-primary"
                            onClick={() => startEdit(c)}
                          >
                            <Pencil className="h-2.5 w-2.5 mr-0.5" />
                            {c.phoneStatus === "missing" ? "Adicionar" : "Editar"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {c.alreadySent ? (
                      <Badge variant="outline" className="text-[10px] text-amber-600">
                        Enviado hoje
                      </Badge>
                    ) : (
                      <>
                        {statusIcon[c.phoneStatus]}
                        <span className="text-[10px] text-muted-foreground">
                          {statusLabel[c.phoneStatus]}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {contactList.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhum contato elegível.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={selectedContacts.length === 0}
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar ({selectedContacts.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
