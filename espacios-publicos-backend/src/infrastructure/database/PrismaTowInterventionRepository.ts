import { Prisma } from "@prisma/client";
import type {
  TowIntervention as PrismaTowIntervention,
  TowInterventionStatus as PrismaTowInterventionStatus
} from "@prisma/client";
import {
  CreateTowInterventionData,
  TowIntervention,
  TowInterventionStatus
} from "../../domain/entities/TowIntervention";
import { TowInterventionRepository } from "../../domain/repositories/TowInterventionRepository";
import { prisma } from "./prismaClient";

type TowPrismaClient = Pick<typeof prisma, "towIntervention">;

export class PrismaTowInterventionRepository implements TowInterventionRepository {
  constructor(private readonly client: TowPrismaClient = prisma) {}

  async create(data: CreateTowInterventionData): Promise<TowIntervention> {
    try {
      const created = await this.client.towIntervention.create({
        data: {
          ...data,
          estacionesAfectadasIds: [...data.estacionesAfectadasIds]
        }
      });

      return toDomain(created);
    } catch (error) {
      // Dos entregas simultaneas del mismo reclamo deben producir una sola fila.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.client.towIntervention.findUnique({
          where: { reclamoId: data.reclamoId }
        });

        if (existing) return toDomain(existing);
      }

      throw error;
    }
  }

  async findAll(): Promise<TowIntervention[]> {
    const interventions = await this.client.towIntervention.findMany({
      orderBy: { updatedAt: "desc" }
    });
    return interventions.map(toDomain);
  }

  async findById(id: string): Promise<TowIntervention | null> {
    const intervention = await this.client.towIntervention.findUnique({
      where: { id }
    });
    return intervention ? toDomain(intervention) : null;
  }

  async findByReclamoId(reclamoId: string): Promise<TowIntervention | null> {
    const intervention = await this.client.towIntervention.findUnique({
      where: { reclamoId }
    });
    return intervention ? toDomain(intervention) : null;
  }

  async update(intervention: TowIntervention): Promise<TowIntervention> {
    const updated = await this.client.towIntervention.update({
      where: { id: intervention.id },
      data: {
        patente: intervention.patente,
        status: intervention.status,
        solicitadoAt: intervention.solicitadoAt,
        resueltoAt: intervention.resueltoAt
      }
    });
    return toDomain(updated);
  }
}

function toDomain(row: PrismaTowIntervention): TowIntervention {
  return {
    ...row,
    status: toDomainStatus(row.status),
    estacionesAfectadasIds: [...row.estacionesAfectadasIds],
    evaluadoAt: new Date(row.evaluadoAt),
    solicitadoAt: row.solicitadoAt ? new Date(row.solicitadoAt) : null,
    resueltoAt: row.resueltoAt ? new Date(row.resueltoAt) : null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt)
  };
}

function toDomainStatus(status: PrismaTowInterventionStatus): TowInterventionStatus {
  return status;
}
