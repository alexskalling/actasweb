
"use client";

type GTMEvent = {
  event: string;
  [key: string]: any;
};


export const trackGTMEvent = (data: GTMEvent): void => {
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
  } else {
    console.warn("GTM dataLayer is not available. Event not tracked:", data);
  }
};