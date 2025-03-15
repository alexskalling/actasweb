"use client";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import { saveTransactionAction } from "../services/saveTransactionAction";
//@ts-expect-error revisar despues
const generateIntegrityHash = async (concatenatedString) => {
  const encoder = new TextEncoder();
  const encodedText = encoder.encode(concatenatedString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encodedText);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};
const createCheckoutInstance = (
  //@ts-expect-error revisar despues
  amount,
  //@ts-expect-error revisar despues
  reference,
  //@ts-expect-error revisar despues
  integrityHash,
  //@ts-expect-error revisar despues
  file,
  //@ts-expect-error revisar despues
  duration,
  //@ts-expect-error revisar despues
  folder,
  //@ts-expect-error revisar despues
  fileid
) => {
  return new window.WidgetCheckout({
    currency: "COP",
    amountInCents: amount,
    reference: reference,
    publicKey: process.env.NEXT_PUBLIC_KEY_WOMPI,
    signature: { integrity: integrityHash },
    redirectUrl:
      process.env.NEXT_PUBLIC_AMBIENTE_URL +
      "/?folder=" +
      folder +
      "&file=" +
      file +
      "&fileid=" +
      fileid +
      "&duration=" +
      duration,
  });
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return [hours, minutes, secs]
    .map((v) => (v < 10 ? "0" + v : v))
    .filter((v, i) => v !== "00" || i > 0)
    .join(":");
};

const tipo = process.env.NEXT_PUBLIC_PAGO;
//@ts-expect-error revisar despues
const WompiComponent = (props) => {
  const [checkout, setCheckout] = useState(null);
  const [costo, setCosto] = useState(props.costo * 100);

  useEffect(() => {
    setCosto(props.costo * 100);
  }, [props.costo]);

  useEffect(() => {
    const tiket =
      tipo +
      props.file +
      "-" +
      Math.floor(Math.random() * 90000 + 10000).toString();
    const script = document.createElement("script");
    script.src = "https://checkout.wompi.co/widget.js";
    script.async = true;

    const onLoadScript = async () => {
      console.log("Script de Wompi cargado correctamente.");
      const cadenaConcatenada = `${tiket}${costo}COP${process.env.NEXT_PUBLIC_INTEGRITY_WOMPI}`;
      console.log("cadenaConcatenada: ", cadenaConcatenada);

      const hashHex = await generateIntegrityHash(cadenaConcatenada);
      console.log("hashHex: ", hashHex);

      // Configurar el checkout de Wompi
      const checkoutInstance = createCheckoutInstance(
        costo,
        tiket,
        hashHex,
        props.file,
        props.duration,
        props.folder,
        props.fileid
      );
      console.log("checkoutInstance: ", checkoutInstance);
      setCheckout(checkoutInstance);
    };

    script.onload = onLoadScript;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [costo]);
  const handleOpenWidget = () => {
    if (!checkout) {
      console.error("No se ha cargado el script de Wompi.");
      return;
    }
    //@ts-expect-error revisar despues
    checkout.open(async (result) => {
      console.log("Resultado de la transacción: ", result);
      const { transaction } = result;

      if (transaction.status == "APPROVED") {
        console.log("Transacción aprobada" + transaction.id);
        const save = await saveTransactionAction({
          transaccion: transaction.id,
          referencia: transaction.reference,
          acta: props.file,
          valor: (transaction.amountInCents / 100).toString(),
          duracion: formatDuration(props.duration),
        });
        console.log("save: ", JSON.stringify(save));
        props.handlePayment();
      }

      console.log("Transaction ID: ", transaction.id);
      console.log("Transaction object: ", transaction);
    });
  };

  return (
    <Button
      className="w-full rounded-sm bg-green-700"
      onClick={() => [handleOpenWidget()]}
    >
      Pagar
    </Button>
  );
};

export default WompiComponent;
