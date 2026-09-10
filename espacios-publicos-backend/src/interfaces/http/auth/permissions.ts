import { MockUserRole } from "./mockUsers";

export const permissions = {
  VIEW_ADMIN_PROFILE: "admin.profile.view",
  UPDATE_ADMIN_PROFILE: "admin.profile.update",
  CREATE_PUBLIC_SPACE: "public-space.create",
  UPDATE_PUBLIC_SPACE: "public-space.update",
  DELETE_PUBLIC_SPACE: "public-space.delete",
  CREATE_RESERVATION: "reservation.create",
  LIST_RESERVATIONS: "reservation.list",
  CREATE_COMMUNITY_EVENT: "community-event.create",
  REGISTER_TO_EVENT: "community-event.register",
  VIEW_EVENT_REGISTRATIONS: "community-event.registrations.view",
  VIEW_OWN_REGISTRATIONS: "community-event.registrations.view-own",
  CANCEL_OWN_REGISTRATION: "community-event.registration.cancel-own",
  UPLOAD_EVENT_IMAGE: "community-event.image.upload"
} as const;

export type Permission = (typeof permissions)[keyof typeof permissions];

const rolePermissions: Record<MockUserRole, ReadonlySet<Permission>> = {
  citizen: new Set([
    permissions.CREATE_RESERVATION,
    permissions.REGISTER_TO_EVENT,
    permissions.VIEW_OWN_REGISTRATIONS,
    permissions.CANCEL_OWN_REGISTRATION
  ]),
  municipal_admin: new Set([
    permissions.VIEW_ADMIN_PROFILE,
    permissions.UPDATE_ADMIN_PROFILE,
    permissions.CREATE_PUBLIC_SPACE,
    permissions.UPDATE_PUBLIC_SPACE,
    permissions.DELETE_PUBLIC_SPACE,
    permissions.LIST_RESERVATIONS,
    permissions.CREATE_COMMUNITY_EVENT,
    permissions.VIEW_EVENT_REGISTRATIONS,
    permissions.UPLOAD_EVENT_IMAGE
  ])
};

export function hasPermission(role: MockUserRole, permission: Permission): boolean {
  return rolePermissions[role].has(permission);
}
