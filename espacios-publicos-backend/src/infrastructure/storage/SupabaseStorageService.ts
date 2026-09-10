import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { ValidationError } from "../../shared/errors/ValidationError";

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

export class SupabaseStorageService {
  async uploadEventImage(file: Express.Multer.File): Promise<string> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_EVENT_IMAGES_BUCKET || "event-images";

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new ValidationError("La imagen debe ser JPG, PNG o WEBP.");
    }

    if (this.detectMimeType(file.buffer) !== file.mimetype) {
      throw new ValidationError("El contenido del archivo no coincide con un formato de imagen permitido.");
    }

    if (!supabaseUrl || !serviceRoleKey) {
      throw new ValidationError("Supabase Storage no esta configurado en el backend.");
    }

    const extension = this.getExtension(file.mimetype);
    const path = `events/${randomUUID()}.${extension}`;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase.storage.from(bucket).upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

    if (error) {
      throw new ValidationError("No se pudo subir la imagen.");
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  private getExtension(mimeType: string): string {
    if (mimeType === "image/png") {
      return "png";
    }

    if (mimeType === "image/webp") {
      return "webp";
    }

    return "jpg";
  }

  private detectMimeType(buffer: Buffer): string | undefined {
    if (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      return "image/png";
    }

    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return "image/jpeg";
    }

    if (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
      return "image/webp";
    }

    return undefined;
  }
}
