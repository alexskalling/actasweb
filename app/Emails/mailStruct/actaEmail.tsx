import { Html } from "@react-email/html";
import { Heading } from "@react-email/heading";
import { Text } from "@react-email/text";
import { Section } from "@react-email/section";

interface ActaEmailProps {
  name: string;
  url: string;
  transcription: string;
  file: string;
}

export default function ActaEmail({ name, url, transcription, file }: ActaEmailProps) {
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
            ¡Tu acta está lista, {name}!
          </Heading>
          <Text style={{ color: "#333", fontSize: 16, marginBottom: 16 }}>
            Gracias por preferir actasdereuniones.ai. Tu acta <strong style={{ color: "#a259e6" }}>{file}</strong> está lista.<br />
            Aquí tienes los enlaces para descargar tus archivos:
          </Text>

          <div style={{ marginBottom: 24 }}>
            <Text style={{ color: "#222", fontWeight: 600, marginBottom: 4 }}>
              📄 Transcripción:
            </Text>
            <a
              href={transcription}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#a259e6",
                textDecoration: "underline",
                fontWeight: 500,
                wordBreak: "break-all",
              }}
            >
              Descargar transcripción
            </a>
          </div>

          <div style={{ marginBottom: 32 }}>
            <Text style={{ color: "#222", fontWeight: 600, marginBottom: 4 }}>
              🔗 Enlace del Borrador de acta:
            </Text>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#a259e6",
                textDecoration: "underline",
                fontWeight: 500,
                wordBreak: "break-all",
              }}
            >
              Descargar Borrador de acta
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
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: "#333" }}>
                Nuestro horario de atención es de lunes a viernes de 8:00 AM a 6:00 PM
              </span>
              <br />
              <span style={{ color: "#333" }}>
                En caso de que necesites soporte, puedes contactarte por WhatsApp con:
              </span>
            </div>
            <div>
              <span style={{ color: "#222" }}>
                • <strong style={{ color: "#a259e6" }}>Leonardo:</strong> +57 301 242 2098
              </span>
              <br />
              <span style={{ color: "#222" }}>
                • <strong style={{ color: "#a259e6" }}>Guillermo:</strong> +56 9 4587 1929
              </span>
            </div>
          </div>
        </div>
      </Section>
    </Html>
  );
}
