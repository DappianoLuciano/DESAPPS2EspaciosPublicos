import { Router } from "express";
import multer from "multer";
import { SupabaseStorageService } from "../../../infrastructure/storage/SupabaseStorageService";
import { ValidationError } from "../../../shared/errors/ValidationError";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireRole } from "../middlewares/mockIdentity";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

export function createUploadRoutes(storageService: SupabaseStorageService): Router {
  const router = Router();

  router.post(
    "/event-image",
    requireRole("municipal_admin"),
    upload.single("file"),
    asyncHandler(async (request, response) => {
      if (!request.file) {
        throw new ValidationError("Debe adjuntar una imagen.");
      }

      const imageUrl = await storageService.uploadEventImage(request.file);
      response.status(201).json({ imageUrl });
    })
  );

  return router;
}
