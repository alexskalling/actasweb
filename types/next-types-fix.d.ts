// Fix for Next.js 16 ResolvingMetadata export issue
declare module "next/types.js" {
  export type { ResolvingMetadata, ResolvingViewport } from "next";
}

