import { SupabaseStorageService } from "../../src/infrastructure/storage/SupabaseStorageService";

describe("SupabaseStorageService", () => {
  it("rechaza un archivo cuyo MIME no coincide con su contenido", async () => {
    const service = new SupabaseStorageService();
    const file = {
      mimetype: "image/png",
      buffer: Buffer.from("esto no es una imagen")
    } as Express.Multer.File;

    await expect(service.uploadEventImage(file)).rejects.toThrow(
      "El contenido del archivo no coincide con un formato de imagen permitido."
    );
  });
});
