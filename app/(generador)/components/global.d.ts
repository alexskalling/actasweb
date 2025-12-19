/// <reference path="epayco.d.ts" />

declare global {
  interface Window {
    ePayco?: {
      checkout?: {
        configure: (options: { key:string; test: boolean }) => EpaycoHandler;
      };
    };
  }
}

export {};