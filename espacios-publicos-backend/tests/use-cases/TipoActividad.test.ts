import { readFileSync } from "fs";
import { join } from "path";
import { mapCategoriaToTipoActividad, TIPO_ACTIVIDAD_POR_CATEGORIA } from "../../src/domain/services/tipoActividad";

describe("mapCategoriaToTipoActividad", () => {
  it.each([
    ["Cultura", "CULTURAL"], ["Música", "CULTURAL"], ["Arte", "CULTURAL"], ["Tecnología", "CULTURAL"],
    ["Ciencia", "CULTURAL"], ["Teatro", "CULTURAL"], ["Danza", "CULTURAL"], ["Literatura", "CULTURAL"],
    ["Cine", "CULTURAL"], ["Charlas", "CULTURAL"], ["Talleres", "CULTURAL"],
    ["Juegos", "RECREATIVO"], ["Gastronomía", "RECREATIVO"], ["Infancias", "RECREATIVO"]
  ])("%s -> %s", (categoria, tipo) => {
    expect(mapCategoriaToTipoActividad(categoria)).toBe(tipo);
  });

  it.each([
    ["MÚSICA", "CULTURAL"], ["musica", "CULTURAL"], ["Musica", "CULTURAL"], ["tecnologia", "CULTURAL"],
    ["GASTRONOMIA", "RECREATIVO"], ["gastronomía", "RECREATIVO"], ["  juegos  ", "RECREATIVO"]
  ])("ignora mayusculas, tildes y espacios: %s -> %s", (categoria, tipo) => {
    expect(mapCategoriaToTipoActividad(categoria)).toBe(tipo);
  });

  it("devuelve null para una categoria desconocida, vacia o null", () => {
    expect(mapCategoriaToTipoActividad("Futbol")).toBeNull();
    expect(mapCategoriaToTipoActividad("PLAZA")).toBeNull();
    expect(mapCategoriaToTipoActividad("")).toBeNull();
    expect(mapCategoriaToTipoActividad(null)).toBeNull();
  });

  it("mapea exactamente las categorias de EVENT_CATEGORIES del frontend", () => {
    const source = readFileSync(
      join(__dirname, "../../../espacios-publicos-frontend/src/lib/eventCategories.ts"), "utf8"
    );
    const block = source.match(/EVENT_CATEGORIES\s*=\s*\[([\s\S]*?)\]/)![1];
    const frontendCategories = [...block.matchAll(/'([^']+)'/g)].map(match => match[1]);
    expect(frontendCategories.length).toBeGreaterThan(0);
    expect(Object.keys(TIPO_ACTIVIDAD_POR_CATEGORIA).sort()).toEqual([...frontendCategories].sort());
  });
});
