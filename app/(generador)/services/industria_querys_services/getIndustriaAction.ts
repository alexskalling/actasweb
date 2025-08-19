'use server'
import { db } from "@/lib/db/db";
import { industrias } from "@/lib/db/schema";
import { not, eq ,asc } from "drizzle-orm";

export async function getIndustrias() {
  try {
    const categoriaIndustria = await db
      .select({
        id: industrias.id,
        nombre: industrias.nombre,
      })
      .from(industrias)
      .where(not(eq(industrias.id, 99)))
      
      .orderBy(asc(industrias.id)); 

    console.log("Industrias obtenidas");
    return {
      status: 'success',
      data: categoriaIndustria,
    };
  } catch (error) {
    console.error("❌ Error al obtener las industrias:", error);
    return {
      status: 'error',
      message: 'Error al obtener las industrias',
      data: [],
    };
  }
}
