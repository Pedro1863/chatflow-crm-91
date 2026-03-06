import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Webhook, Key, Globe } from "lucide-react";

const SettingsPage = () => {
  return (
    <div className="h-full p-6 overflow-y-auto scrollbar-thin max-w-3xl">
      <h1 className="text-xl font-bold text-foreground mb-6">Configurações</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Webhook n8n</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Configure o webhook do n8n para receber mensagens do WhatsApp Cloud API.
            </p>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">URL do Webhook</p>
              <code className="text-sm text-foreground break-all">
                {`{SUPABASE_URL}/functions/v1/whatsapp-webhook`}
              </code>
            </div>
            <Badge variant="secondary">POST</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">API para n8n</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Endpoints disponíveis para integração com o n8n:
            </p>
            <div className="space-y-2">
              {[
                { method: "GET", path: "/functions/v1/crm-api?action=list_contacts", desc: "Listar clientes" },
                { method: "GET", path: "/functions/v1/crm-api?action=get_contact&id={id}", desc: "Buscar cliente" },
                { method: "POST", path: "/functions/v1/crm-api?action=update_stage", desc: "Atualizar etapa do funil" },
                { method: "POST", path: "/functions/v1/crm-api?action=update_contact", desc: "Atualizar dados do cliente" },
              ].map((ep) => (
                <div key={ep.path} className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{ep.method}</Badge>
                    <span className="text-xs text-muted-foreground">{ep.desc}</span>
                  </div>
                  <code className="text-xs text-foreground break-all">{ep.path}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">WhatsApp Cloud API</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              As mensagens do WhatsApp são recebidas via webhook do n8n que processa os eventos
              da WhatsApp Cloud API e envia para o endpoint do CRM.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
