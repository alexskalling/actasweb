import Link from "next/link";

export default function NavComponent() {
  return (
    <nav className="w-full h-16 bg-[#5F369A]">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        <a
          href="https://actasdereuniones.ai/"
          rel="noopener noreferrer"
          className="text-white font-bold text-2xl p-2 rounded"
        >
          ActasDeReuniones.AI
        </a>
        <a
          href="https://actasdereuniones.ai/"
          rel="noopener noreferrer"
          className="text-white  p-2 rounded"
        >
          {" "}
          {/* Added a tag here */}
          Inicio
        </a>
        {/* closing a tag here */}
      </div>
    </nav>
  );
}
