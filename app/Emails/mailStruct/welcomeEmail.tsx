
import { Html } from "@react-email/html";
import { Heading } from "@react-email/heading";
import { Text } from "@react-email/text";

export default function WelcomeEmail({ name }: { name: string }) {
  return (
    <Html>
      <Heading>Hola, {name} 👋</Heading>
      <Text>¡Gracias por registrarte en nuestra app!</Text>
    </Html>
  );
}
