import { NextFunction, Request, Response } from "express";
import { MockUserRole } from "../auth/mockUsers";
import { logger } from "../../../shared/logging/logger";

type SecurityAuditOutcome = "succeeded" | "failed" | "denied";

interface SecurityAuditEntry {
  action: string;
  outcome: SecurityAuditOutcome;
  statusCode: number;
  actorId?: string;
  actorRole?: MockUserRole;
  resourceType?: string;
  resourceId?: string;
}

export function logSecurityAudit(request: Request, entry: SecurityAuditEntry): void {
  logger.info(
    {
      requestId: request.requestId,
      actorId: entry.actorId || request.user?.id || null,
      actorRole: entry.actorRole || request.user?.role || null,
      action: entry.action,
      outcome: entry.outcome,
      statusCode: entry.statusCode,
      resourceType: entry.resourceType || null,
      resourceId: entry.resourceId || null
    },
    "[SecurityAudit]"
  );
}

export function auditAction(action: string, resourceType: string) {
  return (request: Request, response: Response, next: NextFunction): void => {
    response.once("finish", () => {
      logSecurityAudit(request, {
        action,
        outcome: response.statusCode < 400 ? "succeeded" : "failed",
        statusCode: response.statusCode,
        resourceType,
        resourceId: request.params.id || request.params.registrationId
      });
    });

    next();
  };
}
