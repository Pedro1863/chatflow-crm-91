## Objetivo
Suportar 2 números de WhatsApp (POA e Alvorada) em todo o fluxo: identificar de qual número veio a mensagem recebida e responder pelo mesmo número.

## Como o WhatsApp identifica o número
Toda mensagem que chega da Meta API traz o `phone_number_id` (ID do número que recebeu). Esse é o identificador chave — vamos usá-lo como "conta" ao longo do sistema.

## Mudanças

### 1. Banco de dados (migration)
- Já existe a tabela `whatsapp_accounts`. Vamos usá-la para cadastrar os 2 números:
  - POA: label, `phone_number_id`, `display_phone_number`
  - Alvorada: idem
- Adicionar coluna `whatsapp_account_id uuid` (FK lógica) em:
  - `mensagens` — para saber por qual número a mensagem entrou/saiu
  - `contatos` — opcional: marcar o "número de origem" do contato (último número que ele falou)
  - `logs_envio_template` e `template_sends` — para saber por qual número foi disparado o template
- Index em `mensagens(whatsapp_account_id, telefone)`.

### 2. Edge function `whatsapp-webhook` (mensagem recebida)
- Aceitar `phone_number_id` no payload (Meta envia em `entry[].changes[].value.metadata.phone_number_id`; o n8n deve repassar).
- Resolver `whatsapp_account_id` via lookup em `whatsapp_accounts.phone_number_id`.
- Salvar em `mensagens.whatsapp_account_id`.
- Atualizar `contatos.whatsapp_account_id` com o último número usado.

### 3. UI — Configurações
Nova aba/cartão "Contas WhatsApp" em `SettingsPage`:
- Listar contas (`whatsapp_accounts`).
- Adicionar/editar: label ("Loja POA", "Loja Alvorada"), `phone_number_id`, `display_phone_number`, status ativo.
- Permitir definir uma conta padrão.

### 4. UI — Chat (envio de mensagem)
- No `ChatPanel`, mostrar badge da conta WA do contato (ex: "via POA").
- Seletor de conta no rodapé do chat (default = última usada com aquele contato; permite trocar).
- `useSendMensagem` passa `whatsapp_account_id` + `phone_number_id` no payload do webhook do n8n e salva na linha de `mensagens`.

### 5. Payload do n8n (chat saída)
Adicionar no body enviado para `n8n_chat_webhook_url`:
```json
{
  "telefone": "...",
  "mensagem": "...",
  "mensagem_id": "...",
  "phone_number_id": "<id do número POA ou Alvorada>",
  "account_label": "POA"
}
```
No n8n, usar `phone_number_id` para escolher qual token/credencial Meta chamar.

### 6. Templates / automações
- `TemplateSendDialog` e automações (`retention-automation`, `send-whatsapp`) precisam aceitar/escolher `whatsapp_account_id` e enviar `phone_number_id` ao n8n.
- Default: conta marcada como padrão; ou a última usada com o cliente.

### 7. Filtros (opcional, fase 2)
- Filtro "por número" em Conversas e Dashboard.

## O que precisa do n8n (do seu lado)
- No fluxo de **recebimento**: extrair `phone_number_id` do webhook da Meta e enviar para `whatsapp-webhook`.
- No fluxo de **envio**: ler `phone_number_id` do payload e rotear para a credencial Meta correta (POA ou Alvorada).

## Perguntas antes de implementar
1. Você já tem os dois `phone_number_id` (POA e Alvorada) em mãos? Se sim, posso já cadastrá-los direto.
2. Quer um seletor manual de conta no chat ou prefere automático (sempre responder pelo mesmo número que o cliente chamou)?
3. Para templates de retenção automática: usar a conta padrão, ou a última conta que o cliente conversou?
