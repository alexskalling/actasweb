"use client";

import { useSession } from "next-auth/react";
import { useTransition } from "react";
import { sendWelcomeEmail } from "@/app/Emails/actions/sendEmails";

export default function SendEmailButton() {
  const { data: session, status } = useSession();
  const [isPending, startTransition] = useTransition();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const email = session?.user?.email;
  const name = session?.user?.name;

  const handleSend = () => {
    if (!email || !name) return;

    startTransition(() => {
      sendWelcomeEmail(email, name);
    });
  };

  if (isLoading || !isAuthenticated || !email || !name) {
    return null; 
  }

  return (
    <button
      onClick={handleSend}
      disabled={isPending}
      className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
    >
      {isPending ? "Enviando..." : "Enviar correo"}
    </button>
  );
}
