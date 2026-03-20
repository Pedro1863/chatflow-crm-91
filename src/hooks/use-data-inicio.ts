import { useCustomers } from "@/hooks/use-sales-data";
import { useMemo } from "react";

/**
 * Retorna a data de início confiável das métricas,
 * baseada na data_conversao mais antiga entre clientes com pedidos.
 * Fallback: 3 meses atrás.
 */
export function useDataInicioMetricas(): Date {
  const { data: customers = [] } = useCustomers();

  return useMemo(() => {
    const datas = customers
      .filter((c) => c.data_conversao && (c.total_pedidos || 0) > 0)
      .map((c) => new Date(c.data_conversao!).getTime());

    if (datas.length === 0) {
      const fallback = new Date();
      fallback.setMonth(fallback.getMonth() - 3);
      return new Date(fallback.getFullYear(), fallback.getMonth(), 1);
    }

    const min = new Date(Math.min(...datas));
    return new Date(min.getFullYear(), min.getMonth(), 1);
  }, [customers]);
}
