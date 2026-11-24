
- Template chat messages (vendedor = automação) get their Meta ID from logs_envio_template via a BEFORE INSERT trigger on mensagens, because n8n links the ID before the chat row exists.
