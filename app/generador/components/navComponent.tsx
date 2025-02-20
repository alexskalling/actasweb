export default function NavComponent() {
  return (
    <nav className="w-full h-16 bg-[#5A2D8E]">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        <a
          href="https://actasdereuniones.ai/"
          rel="noopener noreferrer"
          className="text-white font-bold text-2xl p-2 rounded"
        >
          ActasDeReuniones.AI
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
