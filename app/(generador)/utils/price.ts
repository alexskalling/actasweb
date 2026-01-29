

export function calculatePrice(durationInSeconds: number): number {
  const minutes = Math.ceil(durationInSeconds / 60);
  const precioCalculado = minutes * 250;

  return precioCalculado < 5000 ? 5000 : precioCalculado;
}

