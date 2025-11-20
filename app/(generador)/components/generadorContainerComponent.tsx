import { CardContent } from "@/components/ui/card";
import MediaFileUploaderComponent from "./mediaFileUploaderComponent";

export default function GeneradorContainerContainer() {
  return (
    <div className=" mx-auto p-4 mt-4 rounded-sm">
      <h2 className="text-3xl  mt-5 font-bold text-center text-purple-900 ">
        Genera tu acta
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="w-full rounded-sm">
          <div className="flex h-full">
            <MediaFileUploaderComponent
              onCheckActa={function (): void {
                throw new Error("Function not implemented.");
              }}
            />
          </div>
        </div>
        <div className="w-full ">
          <CardContent className="flex flex-col items-center justify-center">
            <img
              src="https://actasdereuniones.ai/wp-content/uploads/2025/02/actas3.webp"
              alt="Procesador"
              width={800}
              height={600}
              className="object-cover"
            />
          </CardContent>
        </div>
      </div>
    </div>
  );
}
