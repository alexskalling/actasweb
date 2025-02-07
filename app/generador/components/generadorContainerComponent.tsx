import { Card, CardContent } from "@/components/ui/card";
import FileUploaderComponent from "./fileUploaderComponent";

export default function GeneradorContainerContainer() {
  return (
    <div className="container mx-auto p-4 mt-4">
      <h2 className="text-5xl font-bold text-center mb-8">Genera tu acta</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="w-full rounded-sm">
          <div className="flex h-full">
            <div className="m-auto">
              <CardContent className="flex items-center justify-center ">
                <FileUploaderComponent />
              </CardContent>
            </div>
          </div>
        </Card>
        <Card className="w-full rounded-sm">
          <CardContent className="flex flex-col items-center justify-center">
            <img
              src="https://actasdereuniones.ai/wp-content/uploads/2025/02/actas3.webp"
              alt="Procesador"
              className="object-cover"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
