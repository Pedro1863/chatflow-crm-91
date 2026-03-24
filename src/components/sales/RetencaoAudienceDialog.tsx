import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HeartPulse, AlertTriangle, UserX, Send } from "lucide-react";

type AudienceOption = {
  key: string;
  label: string;
  icon: React.ElementType;
  template: string;
  description: string;
};

const audiences: AudienceOption[] = [
  {
    key: "saudavel",
    label: "Ativos",
    icon: HeartPulse,
    template: "template_retencao_ativos",
    description: "Clientes com pedido nos últimos 15 dias",
  },
  {
    key: "em_risco",
    label: "Em Risco",
    icon: AlertTriangle,
    template: "template_retencao_risco",
    description: "Clientes entre 15 e 30 dias sem pedido",
  },
  {
    key: "inativo",
    label: "Inativos",
    icon: UserX,
    template: "template_retencao_inativos",
    description: "Clientes com mais de 30 dias sem pedido",
  },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: string, label: string, audienceKey: string) => void;
};

export default function RetencaoAudienceDialog({ open, onOpenChange, onSelect }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Escolher Público</DialogTitle>
          <DialogDescription>
            Selecione o público-alvo para o template de retenção.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {audiences.map((a) => {
            const Icon = a.icon;
            return (
              <Button
                key={a.key}
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => {
                  onSelect(a.template, a.label, a.key);
                  onOpenChange(false);
                }}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium">{a.label}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
