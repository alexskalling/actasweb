export type AnalyticsParams = Record<string, unknown> | undefined;

declare global {
  interface Window {
    gtag?: (
      command: "event",
      name: string,
      params?: Record<string, unknown>,
    ) => void;
  }
}

export const track = (name: string, params?: AnalyticsParams): void => {
  try {
    if (process.env.NEXT_PUBLIC_PAGO === "soporte") return;
    if (typeof window === "undefined") return;
    if (typeof window.gtag !== "function") return;
    window.gtag("event", name, params ?? {});
  } catch {}
};
