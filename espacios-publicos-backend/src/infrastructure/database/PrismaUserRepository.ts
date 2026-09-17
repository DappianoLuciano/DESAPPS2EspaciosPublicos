import { UserRole as PrismaUserRole, User as PrismaUser } from "@prisma/client";
import { CreateUserData, User, UserRole } from "../../domain/entities/User";
import { UserRepository } from "../../domain/repositories/UserRepository";
import { prisma } from "./prismaClient";

export class PrismaUserRepository implements UserRepository {
  async findByGoogleId(googleId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { googleId } });
    return user ? toDomainUser(user) : null;
  }

  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? toDomainUser(user) : null;
  }

  async create(data: CreateUserData): Promise<User> {
    const user = await prisma.user.create({
      data: {
        googleId: data.googleId,
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl ?? null
      }
    });

    return toDomainUser(user);
  }
}

function toDomainUser(user: PrismaUser): User {
  return {
    id: user.id,
    googleId: user.googleId,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: toDomainRole(user.role),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function toDomainRole(role: PrismaUserRole): UserRole {
  return role === "MUNICIPAL_ADMIN" ? "municipal_admin" : "citizen";
}
