// Modal.tsx (actualizado)
"use client";


export default function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full p-6 border border-purple-200">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="text-purple-700 hover:text-purple-900 text-lg"
          >
            &times;
          </button>
        </div>
        <div className="mt-4">
          {children}
        </div>
      </div>
    </div>
  );
}
