import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Webhook, Key, Globe, BookOpen, ArrowRight, Save } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { getN8nWebhookUrl, setN8nWebhookUrl } from "@/hooks/use-crm-data";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const CrmIntegrationTab = () => {
  const [webhookUrl, setWebhookUrl] = useState(getN8nWebhookUrl());

  const handleSaveWebhook = () => {
    setN8nWebhookUrl(webhookUrl);
    toast.success("URL do webhook salva com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Webhook n8n - Envio de mensagens */}
      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Webhook n8n - Enviar Mensagens</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            URL do webhook do n8n que será chamado quando o vendedor enviar uma mensagem pelo chat.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="https://seu-n8n.com/webhook/enviar-mensagem"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSaveWebhook} size="sm" className="gap-1.5">
              <Save className="h-4 w-4" />
              Salvar
            </Button>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Payload enviado pelo dashboard</p>
            <pre className="text-xs text-foreground whitespace-pre-wrap">
{`{
  "telefone": "+5511999999999",
  "mensagem": "Texto da mensagem"
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Webhook principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Webhook - Receber Mensagens</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Configure o n8n para enviar mensagens recebidas do WhatsApp para este endpoint.
          </p>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">URL do Webhook</p>
            <code className="text-sm text-foreground break-all">
              {SUPABASE_URL}/functions/v1/whatsapp-webhook
            </code>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Método</p>
            <Badge variant="secondary">POST</Badge>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Payload</p>
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
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Header obrigatório</p>
            <code className="text-xs text-foreground">
              Authorization: Bearer {`{SUPABASE_ANON_KEY}`}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">API Endpoints</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Base URL: <code className="text-foreground">{SUPABASE_URL}/functions/v1/crm-api</code>
          </p>
          <div className="space-y-2">
            {[
              { method: "GET", action: "list_contatos", desc: "Listar contatos", params: "?status_funil=novo_lead (opcional)" },
              { method: "GET", action: "get_contato&id={uuid}", desc: "Buscar contato por ID" },
              { method: "GET", action: "get_mensagens&contato_id={uuid}", desc: "Buscar mensagens de um contato" },
              { method: "POST", action: "update_status", desc: "Atualizar status do funil", body: '{ "contato_id": "uuid", "status_funil": "proposta_enviada" }' },
              { method: "POST", action: "create_contato", desc: "Criar contato", body: '{ "telefone": "+55...", "nome": "...", "empresa": "..." }' },
            ].map((ep) => (
              <div key={ep.action} className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{ep.method}</Badge>
                  <span className="text-xs text-muted-foreground">{ep.desc}</span>
                </div>
                <code className="text-xs text-foreground break-all">?action={ep.action}</code>
                {ep.body && (
                  <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">Body: {ep.body}</pre>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workflows n8n */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Workflows n8n - Guia Passo a Passo</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="wf1">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600 text-white">1</Badge>
                  Receber mensagens do WhatsApp
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <p><strong>Trigger:</strong> WhatsApp Business Cloud API Webhook (ou Evolution API)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <p><strong>Nó 2 - Set:</strong> Extrair telefone, mensagem, nome do payload</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <p><strong>Nó 3 - HTTP Request:</strong> POST para <code className="text-foreground">{SUPABASE_URL}/functions/v1/whatsapp-webhook</code></p>
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs mb-1">Exemplo de configuração do HTTP Request:</p>
                  <pre className="text-xs text-foreground whitespace-pre-wrap">
{`URL: ${SUPABASE_URL}/functions/v1/whatsapp-webhook
Method: POST
Headers:
  Content-Type: application/json
  Authorization: Bearer {SUPABASE_ANON_KEY}
Body:
{
  "telefone": "{{ $json.from }}",
  "mensagem": "{{ $json.text.body }}",
  "direcao": "entrada",
  "nome": "{{ $json.profile.name }}"
}`}
                  </pre>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="wf2">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600 text-white">2</Badge>
                  Criar contato automaticamente
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>O webhook já cria contatos automaticamente quando recebe uma mensagem de um número novo. Mas se quiser criar manualmente:</p>
                <div className="bg-muted rounded-lg p-3">
                  <pre className="text-xs text-foreground whitespace-pre-wrap">
{`URL: ${SUPABASE_URL}/functions/v1/crm-api?action=create_contato
Method: POST
Body:
{
  "telefone": "+5511999999999",
  "nome": "Maria Silva",
  "empresa": "Empresa X",
  "cidade": "São Paulo",
  "origem": "whatsapp"
}`}
                  </pre>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="wf3">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-600 text-white">3</Badge>
                  Atualizar status do funil via n8n
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>Use para mover contatos no funil automaticamente baseado em regras:</p>
                <div className="bg-muted rounded-lg p-3">
                  <pre className="text-xs text-foreground whitespace-pre-wrap">
{`URL: ${SUPABASE_URL}/functions/v1/crm-api?action=update_status
Method: POST
Body:
{
  "contato_id": "uuid-do-contato",
  "status_funil": "proposta_enviada"
}

Status disponíveis:
- novo_lead
- contato_iniciado
- proposta_enviada
- cliente`}
                  </pre>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="wf4">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-600 text-white">4</Badge>
                  Listar contatos e mensagens
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <div className="space-y-2">
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs mb-1 font-medium">Listar todos os contatos:</p>
                    <code className="text-xs text-foreground">GET {SUPABASE_URL}/functions/v1/crm-api?action=list_contatos</code>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs mb-1 font-medium">Filtrar por status:</p>
                    <code className="text-xs text-foreground">GET ...?action=list_contatos&status_funil=novo_lead</code>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs mb-1 font-medium">Buscar mensagens de um contato:</p>
                    <code className="text-xs text-foreground">GET ...?action=get_mensagens&contato_id=uuid</code>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="wf5">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-600 text-white">5</Badge>
                  Enviar mensagens pelo dashboard
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>O dashboard já envia mensagens diretamente via WhatsApp Cloud API usando a edge function <code className="text-foreground">send-whatsapp</code>. Não é necessário configurar no n8n.</p>
                <p>Para funcionar, configure os secrets:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>WHATSAPP_TOKEN</strong> - Token da WhatsApp Cloud API (Meta Business)</li>
                  <li><strong>WHATSAPP_PHONE_ID</strong> - ID do número de telefone no Meta Business</li>
                </ul>
                <p className="text-xs">Sem esses secrets, as mensagens são salvas no banco mas não enviadas pelo WhatsApp.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* WhatsApp Cloud API */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">WhatsApp Cloud API</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Para enviar mensagens diretamente pelo dashboard, configure os secrets no Lovable Cloud:
          </p>
          <div className="space-y-2">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs font-medium text-foreground">WHATSAPP_TOKEN</p>
              <p className="text-xs text-muted-foreground">Token de acesso permanente da Meta Business API</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs font-medium text-foreground">WHATSAPP_PHONE_ID</p>
              <p className="text-xs text-muted-foreground">ID do número de telefone registrado no Meta Business</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Obtenha em: <code className="text-foreground">developers.facebook.com → WhatsApp → API Setup</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CrmIntegrationTab;
