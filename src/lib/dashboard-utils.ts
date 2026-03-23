/**
 * Calcula quantos meses se passaram desde março/2026 até o mês atual (inclusive).
 * Usado para que os gráficos sempre comecem a partir de março/2026.
 */
export function mesesDesdeMarco2026(): number {
  const start = new Date(2025, 11, 1); // December 2025
  const now = new Date();
  return Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth() + 1);
}
