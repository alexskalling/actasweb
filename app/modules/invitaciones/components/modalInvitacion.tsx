"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { crearInvitacionService } from "../services/crearInvitacionService";

export function InvitarAgenteModal({ 
  open, 
  onOpenChange, 
  empresaId,
  onSubmit 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  onSubmit: (email: string, link: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateLink = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await crearInvitacionService({ empresaId, email });
      if (res.success && res.token) {
        // genera el link final (ajústalo a tu dominio real)
        const link = `${window.location.origin}/invitacion/${res.token}`;
        setInviteLink(link);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
    }
  };

  const handleSubmit = () => {
    if (!email || !inviteLink) return;
    onSubmit(email, inviteLink);
    setEmail("");
    setInviteLink(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
              <Button variant="secondary" onClick={handleCopy}>
                Copiar link
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!inviteLink}>
            Enviar invitación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
