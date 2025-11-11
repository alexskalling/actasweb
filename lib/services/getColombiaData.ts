import { departamentosColombia, municipiosPorDepartamento } from "@/lib/data/colombia";

/**
 * Obtiene la lista de todos los departamentos de Colombia
 * @returns Array de nombres de departamentos
 */
export function getDepartamentos(): string[] {
  return departamentosColombia;
}

/**
 * Obtiene la lista de municipios para un departamento específico
 * @param departamento - Nombre del departamento
 * @returns Array de nombres de municipios o array vacío si no se encuentra el departamento
 */
export function getMunicipiosPorDepartamento(departamento: string): string[] {
  return municipiosPorDepartamento[departamento] || [];
}

/**
 * Valida si un departamento existe
 * @param departamento - Nombre del departamento a validar
 * @returns true si el departamento existe, false en caso contrario
 */
export function isValidDepartamento(departamento: string): boolean {
  return departamentosColombia.includes(departamento);
}

/**
 * Valida si un municipio pertenece a un departamento
 * @param municipio - Nombre del municipio
 * @param departamento - Nombre del departamento
 * @returns true si el municipio pertenece al departamento, false en caso contrario
 */
export function isValidMunicipio(municipio: string, departamento: string): boolean {
  const municipios = getMunicipiosPorDepartamento(departamento);
  return municipios.includes(municipio);
}

