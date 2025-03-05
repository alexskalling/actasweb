import Image from "next/image";
import logo from "../assets/logo-actas-ai-blanco.svg";
export default function NavComponent() {
  return (
    <nav className="w-full h-16 bg-[#5A2D8E]">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        <a
          href="https://actasdereuniones.ai/"
          rel="noopener noreferrer"
          className="flex items-center" // Added flex items-center to align image and text if needed in the future
        >
          <Image
            src={logo}
            className="text-white font-bold text-2xl p-10 rounded"
            alt="Actas de Reuniones AI Logo" // Added alt attribute for accessibility
            priority // Optional: Add priority if this is a LCP image
          />
        </a>
        <div>
          <a
            href="https://actasdereuniones.ai/"
            rel="noopener noreferrer"
            className="text-white font-bold  p-2 rounded"
          >
            {" "}
            {/* Added a tag here */}
            Inicio
          </a>
          <a
            href="https://actasdereuniones.ai/blog/"
            rel="noopener noreferrer"
            className="text-white font-bold  p-2 rounded"
          >
            {" "}
            {/* Added a tag here */}
            Blog
          </a>
          <a
            href="https://actasdereuniones.ai/contacto/"
            rel="noopener noreferrer"
            className="text-white font-bold  p-2 rounded"
          >
            {" "}
            {/* Added a tag here */}
            Contacto
          </a>
        </div>

        {/* closing a tag here */}
      </div>
    </nav>
  );
}
