import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, ArrowRight, Database, AlertTriangle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const MetricsIntegrationTab = () => {
  return (
    <div className="space-y-6">
      {/* Visão geral */}
      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Integração - Dashboard de Métricas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            O dashboard de métricas é alimentado por duas tabelas: <strong>customers</strong> (clientes convertidos)
            e <strong>leads_pipeline</strong> (leads que não converteram). Os dados devem ser inseridos via
            automações do n8n usando a REST API.
          </p>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Base URL da API REST</p>
            <code className="text-sm text-foreground break-all">
              {SUPABASE_URL}/rest/v1/
            </code>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Headers obrigatórios em todas as requisições</p>
            <pre className="text-xs text-foreground whitespace-pre-wrap">
{`apikey: ${SUPABASE_ANON_KEY}
Content-Type: application/json
Prefer: return=representation`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Passo a passo */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Passo a Passo - Alimentar Métricas via n8n</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {/* Passo 1 - Inserir cliente convertido */}
            <AccordionItem value="m1">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600 text-white">1</Badge>
                  Inserir cliente convertido (customers)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>Quando um lead converter em cliente, insira na tabela <strong>customers</strong>:</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <p><strong>Trigger:</strong> Lead marcado como "cliente" no seu CRM ou planilha</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <p><strong>Ação:</strong> HTTP Request POST para inserir na tabela</p>
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs mb-1 font-medium">Configuração do HTTP Request:</p>
                  <pre className="text-xs text-foreground whitespace-pre-wrap">
{`URL: ${SUPABASE_URL}/rest/v1/customers
Method: POST
Headers:
  apikey: ${SUPABASE_ANON_KEY}
  Content-Type: application/json
  Prefer: return=representation
Body:
{
  "nome": "Maria Silva",
  "telefone": "+5511999999999",
  "data_primeiro_contato": "2025-01-15T10:00:00Z",
  "data_conversao": "2025-02-01T14:30:00Z",
  "total_pedidos": 1,
  "valor_total_comprado": 1500.00,
  "data_ultimo_pedido": "2025-02-01T14:30:00Z",
  "origem_lead": "whatsapp",
  "status_cliente": "ativo"
}`}
                  </pre>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Passo 2 - Registrar recompra (automático) */}
            <AccordionItem value="m2">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600 text-white">2</Badge>
                  Registrar recompra (função automática)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>Quando um cliente existente fizer um novo pedido, use a função <strong>registrar_pedido</strong>. Ela incrementa automaticamente o <code className="text-foreground">total_pedidos</code>, soma o valor ao <code className="text-foreground">valor_total_comprado</code> e atualiza a <code className="text-foreground">data_ultimo_pedido</code>.</p>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs mb-1 font-medium">Configuração do HTTP Request:</p>
                  <pre className="text-xs text-foreground whitespace-pre-wrap">
{`URL: ${SUPABASE_URL}/rest/v1/rpc/registrar_pedido
Method: POST
Headers:
  apikey: ${SUPABASE_ANON_KEY}
  Content-Type: application/json
  Prefer: return=representation
Body:
{
  "_telefone": "+5511999999999",
  "_valor_pedido": 500.00
}`}
                  </pre>
                </div>
                <div className="bg-muted rounded-lg p-3 mt-2">
                  <p className="text-xs font-medium text-foreground">✅ Campos atualizados automaticamente:</p>
                  <ul className="text-xs mt-1 space-y-1 list-disc list-inside">
                    <li><code className="text-foreground">total_pedidos</code> → incrementa +1</li>
                    <li><code className="text-foreground">valor_total_comprado</code> → soma o valor do pedido</li>
                    <li><code className="text-foreground">data_ultimo_pedido</code> → atualiza para agora</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Passo 3 - Inserir lead perdido */}
            <AccordionItem value="m3">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-600 text-white">3</Badge>
                  Inserir lead perdido (leads_pipeline)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>Quando um lead for marcado como perdido, insira na tabela <strong>leads_pipeline</strong>:</p>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs mb-1 font-medium">Configuração do HTTP Request:</p>
                  <pre className="text-xs text-foreground whitespace-pre-wrap">
{`URL: ${SUPABASE_URL}/rest/v1/leads_pipeline
Method: POST
Headers:
  apikey: ${SUPABASE_ANON_KEY}
  Content-Type: application/json
  Prefer: return=representation
Body:
{
  "nome": "João Santos",
  "telefone": "+5511988888888",
  "data_entrada": "2025-01-10T08:00:00Z",
  "etapa_pipeline": "proposta_sem_resposta",
  "motivo_perda": "Sem resposta após envio da proposta",
  "data_ultima_interacao": "2025-01-25T16:00:00Z",
  "status": "perdido"
}`}
                  </pre>
                </div>
                <div className="bg-muted rounded-lg p-3 mt-2">
                  <p className="text-xs font-medium text-foreground mb-2">Etapas de pipeline válidas:</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">primeiro_contato_sem_resposta</Badge>
                      <span className="text-xs">Lead não respondeu ao primeiro contato</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">proposta_sem_resposta</Badge>
                      <span className="text-xs">Lead não respondeu após envio da proposta</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">negociacao_sem_resposta</Badge>
                      <span className="text-xs">Lead parou de responder durante negociação</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">frete_sem_resposta</Badge>
                      <span className="text-xs">Lead desistiu após informação de frete</span>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Passo 4 - Listar dados */}
            <AccordionItem value="m4">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-600 text-white">4</Badge>
                  Consultar dados das tabelas
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <div className="space-y-2">
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs mb-1 font-medium">Listar todos os clientes:</p>
                    <code className="text-xs text-foreground break-all">
                      GET {SUPABASE_URL}/rest/v1/customers?select=*
                    </code>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs mb-1 font-medium">Listar clientes ativos:</p>
                    <code className="text-xs text-foreground break-all">
                      GET {SUPABASE_URL}/rest/v1/customers?status_cliente=eq.ativo
                    </code>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs mb-1 font-medium">Listar leads perdidos:</p>
                    <code className="text-xs text-foreground break-all">
                      GET {SUPABASE_URL}/rest/v1/leads_pipeline?status=eq.perdido
                    </code>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs mb-1 font-medium">Filtrar leads por etapa:</p>
                    <code className="text-xs text-foreground break-all">
                      GET {SUPABASE_URL}/rest/v1/leads_pipeline?etapa_pipeline=eq.proposta_sem_resposta
                    </code>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Passo 5 - Fluxo completo */}
            <AccordionItem value="m5">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-600 text-white">5</Badge>
                  Exemplo de fluxo completo no n8n
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>Monte um workflow no n8n com a seguinte lógica:</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <p><strong>Trigger:</strong> Webhook ou Schedule (ex: a cada 1 hora)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <p><strong>Nó 2:</strong> Buscar dados da sua planilha/CRM externo</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <p><strong>Nó 3 - IF:</strong> Verificar se é cliente convertido ou lead perdido</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <p><strong>Nó 4a:</strong> Se convertido → POST para <code className="text-foreground">/rest/v1/customers</code></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <p><strong>Nó 4b:</strong> Se perdido → POST para <code className="text-foreground">/rest/v1/leads_pipeline</code></p>
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3 mt-2">
                  <p className="text-xs font-medium text-foreground">💡 Dica:</p>
                  <p className="text-xs mt-1">O dashboard atualiza automaticamente em tempo real. Assim que os dados forem inseridos, as métricas serão recalculadas na tela.</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Campos das tabelas */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Referência dos Campos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Tabela: customers</p>
            <div className="bg-muted rounded-lg p-3">
              <pre className="text-xs text-foreground whitespace-pre-wrap">
{`nome              (text)      - Nome do cliente
telefone          (text)      - Telefone com código do país
data_primeiro_contato (timestamp) - Data do primeiro contato
data_conversao    (timestamp) - Data da conversão
total_pedidos     (integer)   - Quantidade total de pedidos
valor_total_comprado (numeric) - Valor total comprado (R$)
data_ultimo_pedido (timestamp) - Data do último pedido
origem_lead       (text)      - Origem (whatsapp, instagram, etc)
status_cliente    (text)      - Status (ativo, inativo, churned)`}
              </pre>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Tabela: leads_pipeline</p>
            <div className="bg-muted rounded-lg p-3">
              <pre className="text-xs text-foreground whitespace-pre-wrap">
{`nome              (text)      - Nome do lead
telefone          (text)      - Telefone com código do país
data_entrada      (timestamp) - Data de entrada no pipeline
etapa_pipeline    (text)      - Etapa onde o lead parou
motivo_perda      (text)      - Motivo da perda
data_ultima_interacao (timestamp) - Última interação
status            (text)      - Status (ativo, perdido)`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsIntegrationTab;
