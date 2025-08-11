export type AnalyticsParams = Record<string, unknown> | undefined;

declare global {
  interface Window {
    // Minimal gtag signature used in this project
    gtag?: (command: 'event', name: string, params?: Record<string, unknown>) => void;
  }
}

// Centraliza los envíos a Google Analytics y evita repetir condiciones
export const track = (name: string, params?: AnalyticsParams): void => {
  try {
    if (process.env.NEXT_PUBLIC_PAGO === 'soporte') return;
    if (typeof window === 'undefined') return;
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', name, params ?? {});
  } catch {
    // No-op si GA no está disponible
  }
};


