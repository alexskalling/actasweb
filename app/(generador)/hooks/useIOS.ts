"use client";

import * as React from "react";

export function useIsIOSDevice(): boolean {
  const [isIOS, setIsIOS] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const userAgent = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(userAgent));
  }, []);

  return isIOS;
}
