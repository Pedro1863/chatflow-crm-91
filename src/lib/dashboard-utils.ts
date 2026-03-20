/**
 * Calcula quantos meses de dados existem desde uma data de referência até o mês atual (inclusive).
 */
export function mesesDesde(dataInicio: Date): number {
  const now = new Date();
  return Math.max(1, (now.getFullYear() - dataInicio.getFullYear()) * 12 + now.getMonth() - dataInicio.getMonth() + 1);
}

/**
 * Gera lista de meses no formato YYYY-MM entre dataInicio e hoje.
 */
export function gerarListaMeses(dataInicio: Date): string[] {
  const meses: string[] = [];
  const now = new Date();
  const current = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
  while (current <= now) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    meses.push(`${y}-${m}`);
    current.setMonth(current.getMonth() + 1);
  }
  return meses;
}

/**
 * Formata YYYY-MM para rótulo legível (ex: "Jan/26").
 */
export function formatMesLabel(mes: string): string {
  const [year, month] = mes.split("-");
  const labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${labels[parseInt(month, 10) - 1]}/${year.slice(2)}`;
}
