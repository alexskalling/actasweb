/**
 * Calcula el precio de un acta basado en su duración
 * @param durationInSeconds - Duración del acta en segundos
 * @returns Precio en pesos colombianos
 * 
 * La fórmula es:
 * - Se convierte la duración a minutos (redondeando hacia arriba)
 * - Cada minuto vale 170 pesos colombianos
 * - Ejemplo: 50 minutos y 1 segundo = 51 minutos = 51 * 170 = 8,670 COP
 * - Si el precio calculado es menor a 5000 COP, se establece automáticamente en 5000 COP
 */
export function calculatePrice(durationInSeconds: number): number {
  const minutes = Math.ceil(durationInSeconds / 60);
  const precioCalculado = minutes * 170;
  // Si el precio es menor a 5000, se establece en 5000 como mínimo
  return precioCalculado < 5000 ? 5000 : precioCalculado;
}

