import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Calculator, ShieldCheck, Table2, ArrowRight } from "lucide-react";

/* ────────────────────────────── helpers ────────────────────────────── */

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="text-base font-bold text-foreground">{title}</h2>
    </div>
  );
}

function FieldChip({ name }: { name: string }) {
  return (
    <Badge variant="secondary" className="text-xs font-mono">
      {name}
    </Badge>
  );
}

function RuleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">{children}</CardContent>
    </Card>
  );
}

/* ══════════════════════════ SEÇÃO 1 — TABELAS ══════════════════════════ */

const tables = [
  {
    name: "contatos",
    description: "Contatos de WhatsApp recebidos via webhook.",
    triggers: [
      "Webhook do n8n ao receber nova mensagem de um número desconhecido",
      "Criação automática ao processar mensagem de entrada (edge function whatsapp-webhook)",
    ],
    updates: [
      "Atualização de status_funil ao salvar no painel de conversa",
      "Atualização de nome, empresa, cidade via painel de detalhes",
      "Atualização de ultima_interacao ao receber/enviar mensagem",
    ],
    fields: ["id", "nome", "telefone", "empresa", "cidade", "status_funil", "origem", "ultima_interacao", "data_criacao"],
  },
  {
    name: "mensagens",
    description: "Histórico de mensagens de cada contato.",
    triggers: [
      "Webhook do n8n ao receber mensagem de entrada",
      "Envio de mensagem pelo vendedor via painel de chat",
    ],
    updates: [],
    fields: ["id", "contato_id", "telefone", "mensagem", "direcao", "vendedor", "timestamp"],
  },
  {
    name: "customers",
    description: "Clientes convertidos (importados via Bling/n8n).",
    triggers: [
      "Integração via n8n/API (importação do Bling)",
      "Função RPC registrar_pedido ao registrar novo pedido",
    ],
    updates: [
      "total_pedidos e valor_total_comprado ao registrar novo pedido (via RPC)",
      "data_ultimo_pedido atualizado automaticamente",
      "Trigger marcar_lead_convertido_insert marca lead como convertido ao inserir novo customer",
      "Trigger marcar_lead_convertido_por_telefone ao atualizar data_ultimo_pedido",
    ],
    fields: ["id", "nome", "telefone", "bling_id", "total_pedidos", "valor_total_comprado", "data_conversao", "data_primeiro_contato", "data_ultimo_pedido", "origem_lead", "status_cliente"],
  },
  {
    name: "leads_pipeline",
    description: "Registro de tentativas de venda e leads não convertidos.",
    triggers: [
      "Salvar contato no painel de conversa (exceto etapa 'cliente') → salvo_manualmente = true",
      "Popup de inatividade (+4h sem interação) → salvo_manualmente = false",
      "Movimentação de etapa na página de Pipeline",
    ],
    updates: [
      "convertido = true quando contato vira cliente (manual ou trigger automático)",
      "popup_exibido = true quando popup é exibido para aquele contato",
      "popup_ciclo_data atualizado com a data do dia ao exibir popup",
      "salvo_manualmente atualizado para true se salvo manualmente após registro do popup",
    ],
    fields: ["id", "telefone", "nome", "etapa_pipeline", "status", "convertido", "salvo_manualmente", "popup_exibido", "popup_ciclo_data", "data_interacao", "data_entrada", "data_ultima_interacao", "motivo_perda"],
  },
];

function TabelasSection() {
  return (
    <div>
      <SectionTitle icon={Database} title="Registro de Dados (Tabelas)" />
      <Accordion type="multiple" className="space-y-2">
        {tables.map((t) => (
          <AccordionItem key={t.name} value={t.name} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Table2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm font-semibold">{t.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{t.description}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              {/* Triggers */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Quando um registro é criado:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {t.triggers.map((tr, i) => (
                    <li key={i}>{tr}</li>
                  ))}
                </ul>
              </div>

              {/* Updates */}
              {t.updates.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">Quando um registro é atualizado:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {t.updates.map((u, i) => (
                      <li key={i}>{u}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Fields */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Campos:</p>
                <div className="flex flex-wrap gap-1.5">
                  {t.fields.map((f) => (
                    <FieldChip key={f} name={f} />
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

/* ══════════════════════════ SEÇÃO 2 — MÉTRICAS ══════════════════════════ */

const metricas = [
  {
    bloco: "Aquisição",
    items: [
      {
        nome: "Novos Clientes",
        formula: "customers WHERE total_pedidos = 1",
        tabelas: ["customers"],
        campos: ["total_pedidos"],
        descricao: "Conta apenas clientes que realizaram exatamente 1 pedido.",
      },
      {
        nome: "Taxa de Conversão",
        formula: "clientes_com_pedido / (leads_pipeline.count + clientes_com_pedido) × 100",
        tabelas: ["customers", "leads_pipeline"],
        campos: ["total_pedidos (≥1)"],
        descricao: "Percentual de leads que viraram clientes com pelo menos 1 pedido. Clientes com total_pedidos = 0 são ignorados.",
      },
      {
        nome: "% Novos na Base",
        formula: "clientes_1_pedido / total_customers × 100",
        tabelas: ["customers"],
        campos: ["total_pedidos"],
        descricao: "Proporção de clientes novos (1 pedido) em relação ao total da base.",
      },
    ],
  },
  {
    bloco: "Retenção",
    items: [
      {
        nome: "Clientes Ativos (Saudáveis)",
        formula: "customers WHERE data_ultimo_pedido ≤ 15 dias atrás",
        tabelas: ["customers"],
        campos: ["data_ultimo_pedido"],
        descricao: "Clientes que fizeram pedido nos últimos 15 dias.",
      },
      {
        nome: "Em Risco",
        formula: "customers WHERE data_ultimo_pedido entre 15 e 30 dias atrás",
        tabelas: ["customers"],
        campos: ["data_ultimo_pedido"],
        descricao: "Clientes que estão entre 15 e 30 dias sem pedido.",
      },
      {
        nome: "Inativos / Churn",
        formula: "customers WHERE data_ultimo_pedido > 30 dias atrás",
        tabelas: ["customers"],
        campos: ["data_ultimo_pedido"],
        descricao: "Clientes sem pedido há mais de 30 dias.",
      },
      {
        nome: "Taxa de Churn Mensal",
        formula: "(churnados_no_mês / ativos_no_início) × 100",
        tabelas: ["customers (via RPC churn_mensal)"],
        campos: ["data_ultimo_pedido", "data_primeiro_contato"],
        descricao: "Percentual de clientes que completaram 30 dias sem pedido dentro do mês, em relação aos ativos no início.",
      },
    ],
  },
  {
    bloco: "Receita",
    items: [
      {
        nome: "Receita Total",
        formula: "SUM(customers.valor_total_comprado)",
        tabelas: ["customers"],
        campos: ["valor_total_comprado"],
        descricao: "Soma do valor total comprado por todos os clientes.",
      },
      {
        nome: "Ticket Médio",
        formula: "receita_total / total_pedidos",
        tabelas: ["customers"],
        campos: ["valor_total_comprado", "total_pedidos"],
        descricao: "Valor médio por pedido.",
      },
      {
        nome: "Receita Novos vs Recorrentes",
        formula: "Novos: WHERE total_pedidos = 1 | Recorrentes: WHERE total_pedidos > 1",
        tabelas: ["customers", "RPC metricas_aquisicao_mensal"],
        campos: ["total_pedidos", "valor_total_comprado", "data_conversao", "data_ultimo_pedido"],
        descricao: "Divide a receita entre clientes com 1 pedido (novos) e clientes com mais de 1 pedido (recorrentes).",
      },
    ],
  },
  {
    bloco: "Comportamento",
    items: [
      {
        nome: "Taxa de Recompra",
        formula: "customers(total_pedidos > 1) / total_customers × 100",
        tabelas: ["customers"],
        campos: ["total_pedidos"],
        descricao: "Percentual de clientes que fizeram mais de 1 pedido.",
      },
      {
        nome: "Frequência Média",
        formula: "total_pedidos_todos / total_customers",
        tabelas: ["customers"],
        campos: ["total_pedidos"],
        descricao: "Média de pedidos por cliente.",
      },
      {
        nome: "Tempo Médio entre Compras",
        formula: "AVG(dias_entre_primeiro_e_último / (total_pedidos - 1))",
        tabelas: ["customers"],
        campos: ["data_conversao", "data_ultimo_pedido", "total_pedidos"],
        descricao: "Apenas para clientes com recompra. Calcula intervalo médio entre pedidos.",
      },
      {
        nome: "Crescimento Líquido",
        formula: "novos_clientes_mês - churnados_mês",
        tabelas: ["RPCs metricas_aquisicao_mensal + churn_mensal"],
        campos: ["novos_clientes", "total_clientes_churnados_no_mes"],
        descricao: "Diferença entre novos clientes e clientes perdidos no último mês.",
      },
    ],
  },
  {
    bloco: "Pipeline de Perdas",
    items: [
      {
        nome: "Leads Perdidos por Etapa",
        formula: "leads_pipeline WHERE status = 'perdido' GROUP BY etapa_pipeline",
        tabelas: ["leads_pipeline"],
        campos: ["status", "etapa_pipeline"],
        descricao: "Distribuição dos leads perdidos pelas etapas: 1º Contato, Proposta, Negociação, Frete.",
      },
    ],
  },
];

function MetricasSection() {
  return (
    <div>
      <SectionTitle icon={Calculator} title="Métricas do Dashboard" />
      <Accordion type="multiple" className="space-y-2">
        {metricas.map((bloco) => (
          <AccordionItem key={bloco.bloco} value={bloco.bloco} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="text-sm font-semibold">{bloco.bloco}</span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              {bloco.items.map((m) => (
                <Card key={m.nome} className="bg-muted/30">
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-sm font-semibold text-foreground">{m.nome}</p>
                    <div className="flex items-start gap-2">
                      <ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-foreground break-all">
                        {m.formula}
                      </code>
                    </div>
                    <p className="text-xs text-muted-foreground">{m.descricao}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {m.tabelas.map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                      {m.campos.map((c) => (
                        <FieldChip key={c} name={c} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

/* ══════════════════════════ SEÇÃO 3 — REGRAS ══════════════════════════ */

function RegrasSection() {
  return (
    <div>
      <SectionTitle icon={ShieldCheck} title="Regras de Negócio" />
      <div className="grid grid-cols-1 gap-4">
        <RuleCard title="Cliente Convertido">
          <p>Um lead é marcado como <strong>convertido</strong> quando:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>O contato é salvo manualmente com etapa <strong>"cliente"</strong> no painel de conversa</li>
            <li>Um novo registro é inserido na tabela <strong>customers</strong> (trigger automático)</li>
            <li>O campo <strong>data_ultimo_pedido</strong> de um customer é atualizado (trigger automático)</li>
          </ul>
          <p>Em todos os casos, a tentativa mais recente na <strong>leads_pipeline</strong> com <code className="bg-muted px-1 rounded text-xs">convertido = false</code> é atualizada para <code className="bg-muted px-1 rounded text-xs">convertido = true</code>.</p>
        </RuleCard>

        <RuleCard title="Tentativa de Venda">
          <p>Um registro é criado na <strong>leads_pipeline</strong> quando:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Salvar manual</strong>: ao salvar contato no painel de conversa (exceto "cliente") → <code className="bg-muted px-1 rounded text-xs">salvo_manualmente = true</code></li>
            <li><strong>Popup de inatividade</strong>: quando vendedor classifica lead inativo → <code className="bg-muted px-1 rounded text-xs">salvo_manualmente = false</code></li>
          </ul>
          <p>Antes de inserir, o sistema verifica duplicidade: mesmo telefone + mesma etapa nas últimas 4 horas → não duplica.</p>
        </RuleCard>

        <RuleCard title="Popup de Inatividade">
          <p>O popup aparece quando:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Contato ficou <strong>+4 horas</strong> sem interação (última mensagem)</li>
            <li><strong>Não</strong> foi salvo manualmente recentemente</li>
            <li><strong>Não</strong> é cliente (não está na tabela customers)</li>
            <li>Popup <strong>não</strong> foi exibido hoje para esse contato</li>
          </ul>
        </RuleCard>

        <RuleCard title="Bloqueio do Popup">
          <p>O popup é <strong>bloqueado</strong> quando:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Contato foi <strong>salvo manualmente</strong> no pipeline → <code className="bg-muted px-1 rounded text-xs">salvo_manualmente = true</code></li>
            <li>Popup já foi exibido <strong>hoje</strong> → <code className="bg-muted px-1 rounded text-xs">popup_exibido = true</code> + <code className="bg-muted px-1 rounded text-xs">popup_ciclo_data = hoje</code></li>
          </ul>
        </RuleCard>

        <RuleCard title="Ciclo de Reinício do Popup">
          <p>O popup <strong>volta a funcionar</strong> no dia seguinte:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>O controle é feito pelo campo <code className="bg-muted px-1 rounded text-xs">popup_ciclo_data</code></li>
            <li>Se a data mudou (novo dia) → <code className="bg-muted px-1 rounded text-xs">popup_exibido</code> é ignorado</li>
            <li>Se o contato interagir novamente e não for salvo em 4h → popup reaparece</li>
            <li>Se foi salvo manualmente → popup permanece bloqueado até nova interação sem ação</li>
          </ul>
        </RuleCard>

        <RuleCard title="Saúde do Cliente">
          <p>Classificação baseada no campo <code className="bg-muted px-1 rounded text-xs">data_ultimo_pedido</code>:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Saudável</strong>: pedido nos últimos 15 dias</li>
            <li><strong>Em Risco</strong>: entre 15 e 30 dias sem pedido</li>
            <li><strong>Inativo / Churn</strong>: mais de 30 dias sem pedido</li>
          </ul>
        </RuleCard>
      </div>
    </div>
  );
}

/* ══════════════════════════ COMPONENTE PRINCIPAL ══════════════════════════ */

const SystemDocumentationTab = () => {
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Documentação interna do sistema. Explica como os dados são registrados, como cada métrica é calculada e quais regras de negócio estão ativas.
      </p>

      <TabelasSection />
      <MetricasSection />
      <RegrasSection />
    </div>
  );
};

export default SystemDocumentationTab;
