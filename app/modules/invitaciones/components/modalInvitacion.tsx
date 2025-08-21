"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { crearInvitacionService } from "../services/crearInvitacionService";
import { sendInvitacionEmailService } from "@/app/Emails/services/sendInvitacionEmailService";

export function InvitarAgenteModal({
  open,
  onOpenChange,
  empresaId,
  empresaNombre,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  empresaNombre: string;
}) {
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleGenerateLink = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await crearInvitacionService({ empresaId, email });
      if (res.success && res.token) {
        const link = `${window.location.origin}/invitacion/${res.token}`;
        setInviteLink(link);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!email || !inviteLink) return;

    startTransition(async () => {
      await sendInvitacionEmailService({
        email,
        empresa: empresaNombre,
        link: inviteLink,
      });

      setEmail("");
      setInviteLink(null);
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
        <DialogHeader>
          <DialogTitle>Invitar agente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            type="email"
            placeholder="Correo del agente"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {!inviteLink ? (
            <Button onClick={handleGenerateLink} disabled={loading || !email}>
              {loading ? "Generando..." : "Generar link"}
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm break-all border rounded p-2 bg-gray-50">
                {inviteLink}
              </p>
              <Button variant="secondary" onClick={() => navigator.clipboard.writeText(inviteLink!)}>
                Copiar link
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!inviteLink || isPending}>
            {isPending ? "Enviando..." : "Enviar invitación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
