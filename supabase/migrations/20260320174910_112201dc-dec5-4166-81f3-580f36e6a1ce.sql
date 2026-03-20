-- Reset order data for all customers to allow clean re-import
UPDATE public.customers
SET total_pedidos = 0,
    valor_total_comprado = 0,
    data_ultimo_pedido = NULL,
    data_conversao = NULL
WHERE total_pedidos > 0;

-- Reset converted leads back to not converted (from previous import attempt)
UPDATE public.leads_pipeline
SET convertido = false
WHERE convertido = true;