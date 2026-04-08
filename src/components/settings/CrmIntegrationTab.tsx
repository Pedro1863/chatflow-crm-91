import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Webhook, Key, Globe, BookOpen, ArrowRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import OrderImportCard from "./OrderImportCard";
import ContactImportCard from "./ContactImportCard";
import WebhookSettingsCard from "./WebhookSettingsCard";
import ChatWebhookSettingsCard from "./ChatWebhookSettingsCard";
import PhotoWebhookSettingsCard from "./PhotoWebhookSettingsCard";
import TemplateMessagesCard from "./TemplateMessagesCard";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const CrmIntegrationTab = () => {
  return (
    <div className="space-y-6">
      {/* Importação de pedidos */}
      <OrderImportCard />

      {/* Importação de contatos */}
      <ContactImportCard />

      {/* Webhook URL — Templates */}
      <WebhookSettingsCard />

      {/* Webhook URL — Mensagens do Chat */}
      <ChatWebhookSettingsCard />

      {/* Webhook URL — Foto de Perfil */}
      <PhotoWebhookSettingsCard />

      {/* Mensagens dos Templates */}
      <TemplateMessagesCard />

      {/* Webhook principal - Receber Mensagens */}
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
            {/* WF1 - Receber mensagens */}
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
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-xs font-medium text-foreground mb-1">O que a Edge Function faz:</p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>Busca contato pelo telefone. Se não existir, cria automaticamente.</li>
                    <li>Salva a mensagem na tabela <strong>mensagens</strong>.</li>
                    <li>Atualiza <strong>ultima_interacao</strong> do contato.</li>
                  </ul>
                  <p className="text-[10px] text-muted-foreground mt-2">Campos alternativos aceitos: phone, from, wa_id (telefone) | message, text, body (mensagem)</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* WF2 - Criar contato */}
            <AccordionItem value="wf2">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600 text-white">2</Badge>
                  Criar contato via API
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>O webhook do WF1 já cria contatos automaticamente. Use este endpoint apenas para criação manual/direta:</p>
                <div className="bg-muted rounded-lg p-3">
                  <pre className="text-xs text-foreground whitespace-pre-wrap">
{`URL: ${SUPABASE_URL}/functions/v1/crm-api?action=create_contato
Method: POST
Headers:
  Content-Type: application/json
  Authorization: Bearer {SUPABASE_ANON_KEY}
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

            {/* WF3 - Atualizar status */}
            <AccordionItem value="wf3">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-600 text-white">3</Badge>
                  Atualizar status do funil via n8n
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>Mover contatos no funil automaticamente:</p>
                <div className="bg-muted rounded-lg p-3">
                  <pre className="text-xs text-foreground whitespace-pre-wrap">
{`URL: ${SUPABASE_URL}/functions/v1/crm-api?action=update_status
Method: POST
Headers:
  Content-Type: application/json
  Authorization: Bearer {SUPABASE_ANON_KEY}
Body:
{
  "contato_id": "uuid-do-contato",
  "status_funil": "proposta_enviada"
}

Status disponíveis:
- novo_lead (Sem Produto)
- contato_iniciado
- proposta_enviada
- cliente`}
                  </pre>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* WF4 - Listar contatos */}
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
                <p className="text-xs text-muted-foreground">Header obrigatório: <code className="text-foreground">Authorization: Bearer {`{SUPABASE_ANON_KEY}`}</code></p>
              </AccordionContent>
            </AccordionItem>

            {/* WF5 - Registrar Pedido */}
            <AccordionItem value="wf-rpc">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-600 text-white">5</Badge>
                  Registrar Pedido (RPC registrar_pedido)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>Função RPC para registrar vendas. Cria ou atualiza o cliente, insere o pedido e recalcula os totais automaticamente.</p>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs mb-1 font-medium">Via Supabase Client (frontend):</p>
                  <pre className="text-xs text-foreground whitespace-pre-wrap">
{`const { data } = await supabase.rpc("registrar_pedido", {
  _telefone: "+5511999999999",
  _valor_pedido: 150.00,
  _bling_id: "12345",
  _data_pedido: "2025-01-15T10:00:00Z",
  _id_pedido: "PED-001",
  _nome_cliente: "Maria Silva"
})`}
                  </pre>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs mb-1 font-medium">Via HTTP (n8n / API externa):</p>
                  <pre className="text-xs text-foreground whitespace-pre-wrap">
{`URL: ${SUPABASE_URL}/rest/v1/rpc/registrar_pedido
Method: POST
Headers:
  Content-Type: application/json
  apikey: {SUPABASE_ANON_KEY}
  Authorization: Bearer {SUPABASE_ANON_KEY}
Body:
{
  "_telefone": "+5511999999999",
  "_valor_pedido": 150.00,
  "_bling_id": "12345",
  "_data_pedido": "2025-01-15T10:00:00Z",
  "_id_pedido": "PED-001",
  "_nome_cliente": "Maria Silva"
}`}
                  </pre>
                </div>
                <div className="space-y-2 mt-2">
                  <p className="text-xs font-semibold text-foreground">Parâmetros:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li><strong>_bling_id</strong> (obrigatório) — ID do contato no Bling. Usado para identificar/criar o cliente.</li>
                    <li><strong>_telefone</strong> — Telefone do cliente. Se não informado, gera automaticamente.</li>
                    <li><strong>_valor_pedido</strong> — Valor do pedido (default: 0).</li>
                    <li><strong>_data_pedido</strong> — Data do pedido (default: agora).</li>
                    <li><strong>_id_pedido</strong> — ID único do pedido. Usado para deduplicação.</li>
                    <li><strong>_nome_cliente</strong> — Nome do cliente (atualizado se ainda não tiver).</li>
                  </ul>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-xs font-medium text-foreground mb-1">O que a função faz automaticamente:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Busca cliente pelo <strong>bling_id</strong>. Se não encontrar, cria um novo.</li>
                    <li>Insere o pedido na tabela <strong>orders</strong> (com deduplicação por id_pedido).</li>
                    <li>Recalcula <strong>total_pedidos</strong>, <strong>valor_total_comprado</strong> e <strong>data_ultimo_pedido</strong>.</li>
                    <li>Preserva <strong>data_conversao</strong> original (não sobrescreve).</li>
                    <li>Triggers automáticos marcam leads como convertidos na <strong>leads_pipeline</strong>.</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* WF6 - Enviar mensagens pelo chat */}
            <AccordionItem value="wf6">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-600 text-white">6</Badge>
                  Enviar mensagens pelo dashboard (Chat)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>Quando o vendedor envia uma mensagem pelo painel de conversas, o sistema:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Salva a mensagem na tabela <strong>mensagens</strong> (direção = saída).</li>
                  <li>Atualiza <strong>ultima_interacao</strong> do contato.</li>
                  <li>Envia para o webhook do <strong>n8n</strong> (URL base configurada em Configurações).</li>
                </ul>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs mb-1 font-medium">Payload enviado ao n8n:</p>
                  <pre className="text-xs text-foreground whitespace-pre-wrap">
{`POST {WEBHOOK_URL_CONFIGURADA}
{
  "telefone": "+5511999999999",
  "mensagem": "Texto da mensagem"
}`}
                  </pre>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-xs font-medium text-foreground mb-1">⚠️ Pré-requisito:</p>
                  <p className="text-xs">A <strong>Webhook URL (n8n)</strong> deve estar configurada na seção acima. O n8n deve ter um workflow que receba esse payload e envie a mensagem via WhatsApp (Cloud API ou Evolution API).</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* WF7 - Envio manual de templates */}
            <AccordionItem value="wf7">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-teal-600 text-white">7</Badge>
                  Envio manual de templates (Dashboard)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>Disparos manuais de templates nos dashboards de Aquisição e Retenção. Usa o webhook base + <code className="text-foreground">/webhook/send-template</code>.</p>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs mb-1 font-medium">Payload enviado ao n8n:</p>
                   <pre className="text-xs text-foreground whitespace-pre-wrap">
{`POST {WEBHOOK_URL}/webhook/send-template
{
  "telefone": "5511999999999",
  "nome": "Nome do cliente",
  "template": "template_aquisicao",
  "variaveis": ["Nome do cliente"],
  "mensagem_id": "uuid-do-log-envio"
}`}
                  </pre>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-xs font-medium text-foreground mb-1">Templates disponíveis (manual):</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li><strong>template_aquisicao</strong> — Aquisição → Novos Clientes</li>
                    <li><strong>template_retencao_ativos</strong> — Retenção → Clientes Ativos</li>
                    <li><strong>tamplate_cliente_risco</strong> — Retenção → Em Risco</li>
                    <li><strong>template_retencao_inativos</strong> — Retenção → Inativos</li>
                  </ul>
                </div>
                <div className="space-y-1 text-xs">
                  <p><strong>Validações:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Normalização E.164 (DDI 55)</li>
                    <li>Deduplicação diária (tabela <strong>template_sends</strong>)</li>
                    <li>Timeout de 5s por requisição</li>
                    <li>Logs de sucesso/erro na tabela <strong>logs_envio_template</strong></li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* WF8 - Automação de retenção */}
            <AccordionItem value="wf8">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-600 text-white">8</Badge>
                  Automação de Retenção (Cron Job)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>Edge function <code className="text-foreground">retention-automation</code> executada automaticamente <strong>todos os dias às 09:00</strong> (horário de Brasília). Também pode ser disparada manualmente pelo botão "Executar Agora" no dashboard.</p>

                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-xs font-medium text-foreground mb-1">O que a automação faz:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Verifica quais zonas têm automação <strong>habilitada</strong> (tabela automation_settings).</li>
                    <li>Classifica cada customer por saúde: <strong>saudável</strong> (≤15d), <strong>em_risco</strong> (15-30d), <strong>inativo</strong> (&gt;30d).</li>
                    <li>Atualiza a zona na tabela <strong>customer_zone_tracking</strong>.</li>
                    <li>Se a zona mudou ou template ainda não foi enviado, envia via webhook n8n.</li>
                    <li>Registra em <strong>template_sends</strong> e <strong>logs_envio_template</strong>.</li>
                  </ol>
                </div>

                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs mb-1 font-medium">Templates da automação:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li><strong>template_saudaveis</strong> — Clientes Saudáveis/Ativos</li>
                    <li><strong>tamplate_cliente_risco</strong> — Clientes Em Risco</li>
                    <li><strong>template_retencao_inativos</strong> — Clientes Inativos</li>
                  </ul>
                </div>

                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs mb-1 font-medium">Endpoint para execução manual:</p>
                  <pre className="text-xs text-foreground whitespace-pre-wrap">
{`POST ${SUPABASE_URL}/functions/v1/retention-automation
Headers:
  Authorization: Bearer {SUPABASE_ANON_KEY}`}
                  </pre>
                </div>

                <div className="space-y-1 text-xs">
                  <p><strong>Controles:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>ON/OFF por zona no dashboard (Saudáveis, Em Risco, Inativos)</li>
                    <li>Deduplicação diária automática</li>
                    <li>Validação de telefone E.164</li>
                    <li>Usa mesma Webhook URL configurada na seção de Configurações</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Configuração do n8n - Workflow de envio */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Configuração do n8n — Workflows necessários</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Para que o sistema funcione corretamente, o n8n precisa de dois workflows:
          </p>

          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground">1. Workflow: Enviar mensagem do chat</p>
            <p className="text-xs text-muted-foreground">Recebe o payload do dashboard (telefone + mensagem) e envia via WhatsApp Cloud API ou Evolution API.</p>
            <p className="text-xs text-muted-foreground">
              <strong>Trigger:</strong> Webhook no n8n apontando para a URL base configurada nas Configurações.
            </p>
          </div>

          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground">2. Workflow: Enviar template</p>
            <p className="text-xs text-muted-foreground">Recebe o payload de templates (telefone, nome, template, variaveis) e envia o template via WhatsApp.</p>
            <p className="text-xs text-muted-foreground">
              <strong>Trigger:</strong> Webhook no n8n na rota <code className="text-foreground">/webhook/send-template</code> (URL base + /webhook/send-template).
            </p>
             <pre className="text-xs text-foreground whitespace-pre-wrap bg-background rounded p-2 border mt-1">
{`Payload recebido:
{
  "telefone": "5511999999999",
  "nome": "Nome do cliente",
  "template": "template_aquisicao",
  "variaveis": ["Nome do cliente"],
  "mensagem_id": "uuid-do-log-envio"
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CrmIntegrationTab;
