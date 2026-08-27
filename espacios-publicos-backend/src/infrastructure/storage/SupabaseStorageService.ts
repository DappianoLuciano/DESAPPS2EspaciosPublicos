import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { ValidationError } from "../../shared/errors/ValidationError";

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

export class SupabaseStorageService {
  async uploadEventImage(file: Express.Multer.File): Promise<string> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_EVENT_IMAGES_BUCKET || "event-images";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new ValidationError("Supabase Storage no esta configurado en el backend.");
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new ValidationError("La imagen debe ser JPG, PNG o WEBP.");
    }

    const extension = this.getExtension(file.mimetype);
    const path = `events/${randomUUID()}.${extension}`;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase.storage.from(bucket).upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

    if (error) {
      throw new ValidationError(`No se pudo subir la imagen: ${error.message}`);
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
}
