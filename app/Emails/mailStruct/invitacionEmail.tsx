import { Html } from "@react-email/html";
import { Heading } from "@react-email/heading";
import { Text } from "@react-email/text";
import { Section } from "@react-email/section";

interface InvitacionEmailProps {

  empresa: string;
  link: string; // link de invitación
}

export default function InvitacionEmail({ empresa, link }: InvitacionEmailProps) {
  return (
    <Html>
      <Section
        style={{
          backgroundColor: "#f7f7f7",
          padding: "40px 0",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            margin: "0 auto",
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 2px 8px #0001",
            padding: 32,
          }}
        >
          <Heading
            style={{
              color: "#a259e6",
              fontWeight: 700,
              fontSize: 28,
              marginBottom: 8,
            }}
          >
            ¡Alguien te quiere que seas parte de su equipo!
          </Heading>

          <Text style={{ color: "#333", fontSize: 16, marginBottom: 16 }}>
            Has sido invitado a unirte a <strong style={{ color: "#a259e6" }}>{empresa}</strong> como agente.
            Haz clic en el siguiente enlace para aceptar la invitación y configurar tu cuenta:
          </Text>

          <div style={{ marginBottom: 32 }}>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                backgroundColor: "#a259e6",
                color: "#fff",
                textDecoration: "none",
                padding: "12px 24px",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              Aceptar invitación
            </a>
          </div>

          <div
            style={{
              background: "#f3e8ff",
              color: "#222",
              borderRadius: 8,
              padding: "18px 20px",
              fontSize: 15,
              fontWeight: 500,
              textAlign: "left",
              border: "1px solid #a259e6",
            }}
          >
            <h3 style={{ color: "#a259e6", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
              📞 Soporte
            </h3>
            <Text style={{ marginBottom: 4 }}>
              Si tienes problemas al aceptar la invitación, puedes contactarnos:
            </Text>
            <Text>• <strong style={{ color: "#a259e6" }}>Leonardo:</strong> +57 301 242 2098</Text>
            <Text>• <strong style={{ color: "#a259e6" }}>Guillermo:</strong> +56 9 4587 1929</Text>
          </div>
        </div>
      </Section>
    </Html>
  );
}
