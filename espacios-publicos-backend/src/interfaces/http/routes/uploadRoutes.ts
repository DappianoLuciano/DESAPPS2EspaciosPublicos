import { Router } from "express";
import multer from "multer";
import { SupabaseStorageService } from "../../../infrastructure/storage/SupabaseStorageService";
import { ValidationError } from "../../../shared/errors/ValidationError";
import { permissions } from "../auth/permissions";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermission } from "../middlewares/mockIdentity";
import { auditAction } from "../middlewares/securityAudit";

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
    requirePermission(permissions.UPLOAD_EVENT_IMAGE),
    auditAction(permissions.UPLOAD_EVENT_IMAGE, "community-event-image"),
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
