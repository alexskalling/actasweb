/**
 * Calcula el precio de un acta basado en su duración
 * @param durationInSeconds - Duración del acta en segundos
 * @returns Precio en pesos colombianos
 * 
 * La fórmula es:
 * - Se convierte la duración a minutos (redondeando hacia arriba)
 * - Cada minuto vale 170 pesos colombianos
 * - Ejemplo: 50 minutos y 1 segundo = 51 minutos = 51 * 170 = 8,670 COP
 */
export function calculatePrice(durationInSeconds: number): number {
  const minutes = Math.ceil(durationInSeconds / 60);
  return minutes * 170;
}

