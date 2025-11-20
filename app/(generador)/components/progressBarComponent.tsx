"use client";

import * as React from "react";

interface ProgressBarProps {
  progress: number;
}

export default function ProgressBarComponent({ progress }: ProgressBarProps) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
      <div
        className="bg-purple-600 h-2.5 rounded-full"
        style={{
          width: `${Math.max(0, Math.min(100, Math.round(progress)))}%`,
        }}
      />
    </div>
  );
}
