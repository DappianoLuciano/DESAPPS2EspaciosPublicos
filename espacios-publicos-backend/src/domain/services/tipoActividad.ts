export type TipoActividad = "CULTURAL" | "DEPORTIVO" | "RECREATIVO";

/**
 * Categorias de evento comunitario que ofrece el frontend (`EVENT_CATEGORIES` en
 * espacios-publicos-frontend/src/lib/eventCategories.ts). Un test verifica que las dos listas coincidan.
 */
export type EventCategory =
  | "Cultura" | "Música" | "Arte" | "Tecnología" | "Ciencia" | "Teatro" | "Danza"
  | "Literatura" | "Cine" | "Charlas" | "Talleres" | "Juegos" | "Gastronomía" | "Infancias";

// Record exhaustivo: sumar una categoria a EventCategory no compila hasta decidir su tipo.
// Hoy no hay categorias deportivas (ni en el frontend ni en el seed), asi que nada mapea a DEPORTIVO.
export const TIPO_ACTIVIDAD_POR_CATEGORIA: Record<EventCategory, TipoActividad> = {
  Cultura: "CULTURAL",
  Música: "CULTURAL",
  Arte: "CULTURAL",
  Tecnología: "CULTURAL",
  Ciencia: "CULTURAL",
  Teatro: "CULTURAL",
  Danza: "CULTURAL",
  Literatura: "CULTURAL",
  Cine: "CULTURAL",
  Charlas: "CULTURAL",
  Talleres: "CULTURAL",
  Juegos: "RECREATIVO",
  Gastronomía: "RECREATIVO",
  Infancias: "RECREATIVO"
};

function normalizeCategory(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

const TIPO_POR_CATEGORIA_NORMALIZADA = new Map<string, TipoActividad>(
  Object.entries(TIPO_ACTIVIDAD_POR_CATEGORIA).map(([categoria, tipo]) => [normalizeCategory(categoria), tipo])
);

/** Tipo de actividad para Analitica. Ignora mayusculas y tildes; una categoria desconocida o null da null. */
export function mapCategoriaToTipoActividad(categoria: string | null): TipoActividad | null {
  if (categoria == null) return null;
  return TIPO_POR_CATEGORIA_NORMALIZADA.get(normalizeCategory(categoria)) ?? null;
}
