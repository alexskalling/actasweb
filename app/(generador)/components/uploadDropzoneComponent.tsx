"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { track } from "../utils/analytics";

interface UploadDropzoneProps {
  accept: string;
  isIOS: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function UploadDropzoneComponent({
  accept,
  isIOS,
  onChange,
}: UploadDropzoneProps) {
  return (
    <div className="flex items-center justify-center w-full">
      <label
        htmlFor="media-upload"
        className="flex flex-col items-center justify-center w-full h-64 sm:h-72 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer transition-colors hover:border-purple-400 hover:bg-purple-50/50"
        onClick={() => {
          track("upload_button_click", {
            event_category: "engagement",
            event_label: "upload_button_clicked",
          });
        }}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-12 h-12 mb-4 text-purple-700" />
          <p className="mb-2 text-sm text-purple-700">
            <span className="font-semibold">
              Haz click para seleccionar un archivo
            </span>
          </p>
          {isIOS && (
            <div className="text-xs text-purple-600 mt-1 space-y-1">
              <p>💡 En iPhone:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Selecciona desde &quot;Archivos&quot;</li>
                <li>O usa &quot;Grabar&quot; para crear nuevo audio</li>
                <li>O selecciona desde &quot;Fotos&quot; si es video</li>
              </ul>
            </div>
          )}
        </div>
        <input
          id="media-upload"
          type="file"
          className="hidden"
          accept={
            isIOS
              ? "audio/*,video/*,.m4a,.mp3,.wav,.mp4,.mov,.aac,.ogg"
              : accept
          }
          onChange={onChange}
          aria-label="Seleccionar archivo de audio o video"
          capture={isIOS ? undefined : "environment"}
          multiple={false}
          style={{ display: "none" }}
        />
      </label>
    </div>
  );
}
