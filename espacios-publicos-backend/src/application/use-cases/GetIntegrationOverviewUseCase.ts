import { computeIntegrationMetrics, IntegrationMetrics, metricsSince } from "../integrations/integrationMetrics";
import { CityIncidentSource } from "../../domain/entities/CityIncidentRecord";
import { CityIncidentRepository } from "../../domain/repositories/CityIncidentRepository";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { DestinationRecommendationRepository } from "../../domain/repositories/DestinationRecommendationRepository";
import {
  InboundEventEntry,
  InboundTypeSummary,
  IntegrationStatusRepository,
  OutboxNameSummary,
  OutboxProblemEntry
} from "../../domain/repositories/IntegrationStatusRepository";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { dispatchableEventNames } from "../../shared/events/eventTypes";

const INCIDENT_SOURCES: CityIncidentSource[] = ["RECLAMOS", "EMERGENCIAS"];
const RECENT_INBOUND_LIMIT = 20;
const OUTBOX_PROBLEMS_LIMIT = 20;

export interface IntegrationEventRow {
  id: string;
  title: string;
  status: string;
  startDate: Date;
  endDate: Date;
  space: { id: string; name: string | null; zone: string | null };
  /** null: Movilidad todavia no calculo la estacion para este evento. */
  recommendation: {
    estado: string;
    estacion: string | null;
    lugaresLibres: number | null;
    distanciaMetros: number | null;
    mensaje: string;
    descartadasPorIncidentes: number;
    calculadaEn: Date;
  } | null;
}

export interface IntegrationIncidentRow {
  source: CityIncidentSource;
  externalId: string;
  category: string | null;
  zone: string | null;
  latitude: number | null;
  longitude: number | null;
  reportedAt: Date;
}

export interface IntegrationOverview {
  generatedAt: Date;
  events: IntegrationEventRow[];
  incidents: IntegrationIncidentRow[];
  inbound: { byType: InboundTypeSummary[]; recent: InboundEventEntry[] };
  outbox: { byName: OutboxNameSummary[]; problems: OutboxProblemEntry[] };
  metrics: IntegrationMetrics;
}

/** Panel de integraciones del admin: estado de CU-INT-01 y de la mensajeria con los otros modulos. */
export class GetIntegrationOverviewUseCase {
  constructor(
    private readonly communityEventRepository: Pick<CommunityEventRepository, "findAll">,
    private readonly publicSpaceRepository: Pick<PublicSpaceRepository, "findAll">,
    private readonly recommendationRepository: Pick<DestinationRecommendationRepository, "findByEventId">,
    private readonly cityIncidentRepository: Pick<CityIncidentRepository, "findActiveBySource">,
    private readonly statusRepository: IntegrationStatusRepository
  ) {}

  async execute(now = new Date()): Promise<IntegrationOverview> {
    const [allEvents, spaces] = await Promise.all([
      this.communityEventRepository.findAll(),
      this.publicSpaceRepository.findAll()
    ]);
    const spacesById = new Map(spaces.map((space) => [space.id, space]));

    // Los que todavia pueden recibir gente: Movilidad recomienda estacion solo para esos.
    const upcoming = allEvents
      .filter((event) => event.status !== "CANCELLED" && event.endDate > now)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    const events = await Promise.all(upcoming.map(async (event): Promise<IntegrationEventRow> => {
      const space = spacesById.get(event.publicSpaceId);
      const recommendation = await this.recommendationRepository.findByEventId(event.id);
      return {
        id: event.id,
        title: event.title,
        status: event.status,
        startDate: event.startDate,
        endDate: event.endDate,
        space: { id: event.publicSpaceId, name: space?.name ?? null, zone: space?.zone ?? null },
        recommendation: recommendation && {
          estado: recommendation.estado,
          estacion: recommendation.estacion,
          lugaresLibres: recommendation.lugaresLibres,
          distanciaMetros: recommendation.distanciaMetros,
          mensaje: recommendation.mensaje,
          descartadasPorIncidentes: recommendation.descartadasPorIncidentes,
          calculadaEn: recommendation.calculadaEn
        }
      };
    }));

    const incidents = (await Promise.all(
      INCIDENT_SOURCES.map((source) => this.cityIncidentRepository.findActiveBySource(source))
    ))
      .flat()
      .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime())
      .map(({ source, externalId, category, zone, latitude, longitude, reportedAt }) => ({
        source, externalId, category, zone, latitude, longitude, reportedAt
      }));

    const names = dispatchableEventNames();
    const since = metricsSince(now);
    const [byType, recent, byName, problems, deliveries, arrivals] = await Promise.all([
      this.statusRepository.inboundByType(),
      this.statusRepository.recentInbound(RECENT_INBOUND_LIMIT),
      this.statusRepository.outboxByName(names),
      this.statusRepository.outboxProblems(names, OUTBOX_PROBLEMS_LIMIT),
      this.statusRepository.outboxSince(names, since),
      this.statusRepository.inboundSince(since)
    ]);

    const metrics = computeIntegrationMetrics({
      now,
      deliveries,
      arrivals,
      recommendations: events.map((event) => event.recommendation?.calculadaEn ?? null)
    });

    return { generatedAt: now, events, incidents, inbound: { byType, recent }, outbox: { byName, problems }, metrics };
  }
}
