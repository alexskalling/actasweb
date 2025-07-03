import { Html } from "@react-email/html";
import { Heading } from "@react-email/heading";
import { Text } from "@react-email/text";

interface WelcomeEmailProps {
  name: string;
  url: string;
  transcription: string;
}

export default function ActaEmail({ name, url, transcription }: WelcomeEmailProps) {
  return (
    <Html>
      <Heading>Mucho gusto!, yo {name} te envia un saludo desde actas 👋</Heading>
      <Text>¡Gracias por preferirnos!</Text>

      <Text>
        Tu acta está lista. Puedes acceder a ella con los siguientes enlaces:
      </Text>

      <Text>
        📄 <strong>Transcripción:</strong><br />
        {transcription}
      </Text>

      <Text>
        🔗 <strong>Enlace del archivo:</strong><br />
        <a href={url}>{url}</a>
      </Text>
      <Text>
         <strong>Att: El Padawan</strong><br />
      </Text>
    </Html>
  );
}
