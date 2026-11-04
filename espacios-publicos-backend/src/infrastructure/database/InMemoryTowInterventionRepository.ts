import { randomUUID } from "node:crypto";
import {
  CreateTowInterventionData,
  TowIntervention
} from "../../domain/entities/TowIntervention";
import { TowInterventionRepository } from "../../domain/repositories/TowInterventionRepository";

export class InMemoryTowInterventionRepository implements TowInterventionRepository {
  private readonly interventions = new Map<string, TowIntervention>();

  async create(data: CreateTowInterventionData): Promise<TowIntervention> {
    const now = new Date();
    const intervention: TowIntervention = {
      id: randomUUID(),
      ...data,
      estacionesAfectadasIds: [...data.estacionesAfectadasIds],
      patente: null,
      status: "PENDING",
      solicitadoAt: null,
      resueltoAt: null,
      createdAt: now,
      updatedAt: now
    };

    this.interventions.set(intervention.id, cloneIntervention(intervention));
    return cloneIntervention(intervention);
  }

  async findAll(): Promise<TowIntervention[]> {
    return Array.from(this.interventions.values())
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map(cloneIntervention);
  }

  async findById(id: string): Promise<TowIntervention | null> {
    const intervention = this.interventions.get(id);
    return intervention ? cloneIntervention(intervention) : null;
  }

  async findByReclamoId(reclamoId: string): Promise<TowIntervention | null> {
    const intervention = Array.from(this.interventions.values()).find(
      (item) => item.reclamoId === reclamoId
    );

    return intervention ? cloneIntervention(intervention) : null;
  }

  async update(intervention: TowIntervention): Promise<TowIntervention> {
    if (!this.interventions.has(intervention.id)) {
      throw new Error(`No existe la intervencion ${intervention.id}.`);
    }

    const updatedIntervention: TowIntervention = {
      ...intervention,
      estacionesAfectadasIds: [...intervention.estacionesAfectadasIds],
      updatedAt: new Date()
    };

    this.interventions.set(
      updatedIntervention.id,
      cloneIntervention(updatedIntervention)
    );

    return cloneIntervention(updatedIntervention);
  }
}

function cloneIntervention(intervention: TowIntervention): TowIntervention {
  return {
    ...intervention,
    estacionesAfectadasIds: [...intervention.estacionesAfectadasIds],
    evaluadoAt: new Date(intervention.evaluadoAt),
    solicitadoAt: intervention.solicitadoAt
      ? new Date(intervention.solicitadoAt)
      : null,
    resueltoAt: intervention.resueltoAt
      ? new Date(intervention.resueltoAt)
      : null,
    createdAt: new Date(intervention.createdAt),
    updatedAt: new Date(intervention.updatedAt)
  };
}
