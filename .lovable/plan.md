

# Plano: Automação n8n + Integração WhatsApp

## Importante entender primeiro

O Lovable **não pode criar workflows no n8n** -- o n8n é uma ferramenta externa que roda no seu próprio servidor. O que o Lovable pode fazer é:

1. Garantir que o **backend (Edge Functions + banco)** esteja preparado para receber e servir dados
2. Adicionar **realtime** para atualização instantânea do chat
3. Criar uma **edge function para envio de mensagens** via WhatsApp Cloud API
4. Fornecer a **documentação exata** dos workflows que você precisa criar no n8n

## O que já está pronto

- Tabelas `contatos` e `mensagens` no banco
- Edge function `whatsapp-webhook` (recebe mensagens do n8n)
- Edge function `crm-api` (endpoints GET/POST para o n8n)
- Frontend com chat, lista de contatos, pipeline e dashboard

## O que falta implementar no Lovable

### 1. Habilitar Realtime nas tabelas
Ativar `supabase_realtime` nas tabelas `contatos` e `mensagens` para que o dashboard atualize instantaneamente quando o n8n inserir dados, eliminando o polling de 5 segundos atual.

### 2. Atualizar hooks para usar Realtime
Substituir o `refetchInterval: 5000` por subscription realtime no `useMensagens` e `useContatos`.

### 3. Criar Edge Function `send-whatsapp`
Nova edge function que recebe uma mensagem do dashboard, envia para a WhatsApp Cloud API e salva no banco. Isso requer o **WHATSAPP_TOKEN** e **WHATSAPP_PHONE_ID** como secrets.

### 4. Atualizar ChatPanel para enviar via WhatsApp
Quando o vendedor responder pelo chat, chamar a edge function `send-whatsapp` em vez de apenas inserir no banco.

### 5. Documentação dos workflows n8n
Atualizar a página de Configurações com instruções passo a passo dos 5 workflows necessários no n8n:
- **Workflow 1**: Webhook recebe mensagem do WhatsApp → POST para `whatsapp-webhook`
- **Workflow 2**: Polling/webhook para buscar contatos → GET `crm-api?action=list_contatos`
- **Workflow 3**: Criar contato → POST `crm-api?action=create_contato`
- **Workflow 4**: Atualizar status → POST `crm-api?action=update_status`
- **Workflow 5**: Buscar mensagens → GET `crm-api?action=get_mensagens`

## Pré-requisito do usuário

Para o envio de mensagens funcionar, você precisa fornecer:
- **WHATSAPP_TOKEN**: Token de acesso da WhatsApp Cloud API (Meta Business)
- **WHATSAPP_PHONE_ID**: ID do número de telefone no Meta Business

## Resumo das alterações

| Componente | Ação |
|---|---|
| Migração SQL | `ALTER PUBLICATION supabase_realtime ADD TABLE contatos, mensagens` |
| `use-crm-data.ts` | Adicionar subscriptions realtime |
| `supabase/functions/send-whatsapp/` | Nova edge function para envio via WhatsApp API |
| `ChatPanel.tsx` | Chamar `send-whatsapp` ao responder |
| `SettingsPage.tsx` | Documentação completa dos workflows n8n |
| `supabase/config.toml` | Registrar `send-whatsapp` com `verify_jwt = false` |

