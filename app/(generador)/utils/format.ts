export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Asegura formato HH:mm:ss a partir de segundos o string
export const ensureDurationFormat = (duration: string | number): string => {
  if (typeof duration === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(duration)) {
    return duration;
  }
  const seconds = typeof duration === 'number' ? duration : Number.parseInt(duration, 10);
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};


