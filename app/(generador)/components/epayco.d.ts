interface EpaycoCheckoutOptions {
  // Propiedades estándar de ePayco
  external: boolean;
  amount: number;
  tax: string;
  tax_base: number;
  name: string;
  description: string;
  currency: string;
  country: string;
  invoice: string;
  response?: string;
  confirmation?: string;
  extra1?: string;
  extra2?: string;
  onClose?: () => void;
  onResponse?: (response: any) => void;
}

interface EpaycoHandler {
  open: (options: EpaycoCheckoutOptions) => void;
}