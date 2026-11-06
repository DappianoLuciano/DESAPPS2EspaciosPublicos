import { CommunityEvent } from "../../domain/entities/CommunityEvent";
import { EmergencyLocation } from "../../domain/entities/EmergencyImpact";
import { PublicSpace } from "../../domain/entities/PublicSpace";
import { Reservation } from "../../domain/entities/Reservation";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { ReservationRepository } from "../../domain/repositories/ReservationRepository";
import { distanceInMeters, hasCoordinates } from "../../shared/geo/distance";
import { normalizeZone } from "./GetEventRoutePlanUseCase";

const DEFAULT_RADIUS_METERS = 500;

export interface NearbySpaceBookings {
  space: PublicSpace;
  distanceMeters: number | null;
  reservations: Reservation[];
  events: CommunityEvent[];
}

export function emergencyRadiusMeters(): number {
  const configured = Number(process.env.EMERGENCY_NEARBY_RADIUS_METERS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_RADIUS_METERS;
}

/** Con coordenadas usa el radio; sin ellas, el mismo barrio. */
export function nearbySpaces(
  spaces: PublicSpace[],
  location: EmergencyLocation
): Array<{ space: PublicSpace; distanceMeters: number | null }> {
  const { latitude, longitude } = location;

  if (latitude !== null && longitude !== null) {
    return spaces
      .flatMap((space) =>
        hasCoordinates(space)
          ? [{ space, distanceMeters: Math.round(distanceInMeters({ latitude, longitude }, space)) }]
          : []
      )
      .filter((item) => item.distanceMeters <= emergencyRadiusMeters())
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  const zone = normalizeZone(location.zone);

  return zone
    ? spaces
        .filter((space) => normalizeZone(space.zone) === zone)
        .map((space) => ({ space, distanceMeters: null }))
    : [];
}

export class FindNearbyBookingsUseCase {
  constructor(
    private readonly publicSpaceRepository: Pick<PublicSpaceRepository, "findAll">,
    private readonly reservationRepository: Pick<ReservationRepository, "findOverlapping">,
    private readonly communityEventRepository: Pick<CommunityEventRepository, "findOverlapping">
  ) {}

  async execute(location: EmergencyLocation, from: Date, to: Date): Promise<NearbySpaceBookings[]> {
    const nearby = nearbySpaces(await this.publicSpaceRepository.findAll(), location);

    return Promise.all(
      nearby.map(async ({ space, distanceMeters }) => ({
        space,
        distanceMeters,
        reservations: await this.reservationRepository.findOverlapping(space.id, from, to),
        events: await this.communityEventRepository.findOverlapping(space.id, from, to)
      }))
    );
  }
}
