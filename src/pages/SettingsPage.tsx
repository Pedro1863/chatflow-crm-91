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
              Configure o webhook do n8n para receber mensagens do WhatsApp.
            </p>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">URL do Webhook</p>
              <code className="text-sm text-foreground break-all">
                {`{SUPABASE_URL}/functions/v1/whatsapp-webhook`}
              </code>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Payload esperado</p>
              <pre className="text-xs text-foreground whitespace-pre-wrap">
{`{
  "telefone": "+5511999999999",
  "mensagem": "Olá, quero saber mais",
  "direcao": "entrada",
  "vendedor": "João",
  "nome": "Maria Silva",
  "empresa": "Empresa X",
  "cidade": "São Paulo",
  "origem": "whatsapp"
}`}
              </pre>
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
                { method: "GET", path: "/functions/v1/crm-api?action=list_contatos", desc: "Listar contatos" },
                { method: "GET", path: "/functions/v1/crm-api?action=get_contato&id={id}", desc: "Buscar contato" },
                { method: "GET", path: "/functions/v1/crm-api?action=get_mensagens&contato_id={id}", desc: "Buscar mensagens de um contato" },
                { method: "POST", path: "/functions/v1/crm-api?action=update_status", desc: "Atualizar status do funil" },
                { method: "POST", path: "/functions/v1/crm-api?action=create_contato", desc: "Criar contato" },
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
              As mensagens do WhatsApp são recebidas via webhook do n8n. O dashboard apenas lê e exibe os dados.
              Os contatos são criados e atualizados pelo n8n.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
