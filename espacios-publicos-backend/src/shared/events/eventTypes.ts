// Nombres FQN de los eventos de integracion del modulo. El namespace definitivo lo fija
// el gateway, por eso cada nombre se puede sobrescribir por entorno (igual que los del clima).
function fromEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

export const eventNames = {
  communityEventPublished: () =>
    fromEnv("COMMUNITY_EVENT_PUBLISHED_EVENT_FQN", "com.citypass.espacios.EventoComunitarioPublicado"),
  // E1 del squad 3 (recoleccion despues de un evento masivo). Convive con EventoComunitarioPublicado.
  activityCreated: () =>
    fromEnv("ACTIVITY_CREATED_EVENT_FQN", "com.citypass.espacios.ActividadCreada"),
  // Pedido por Analitica. Convive con EventoCancelado, que se sigue publicando primero.
  activityModified: () =>
    fromEnv("ACTIVITY_MODIFIED_EVENT_FQN", "com.citypass.espacios.ActividadModificada"),
  communityEventCancelled: () =>
    fromEnv("COMMUNITY_EVENT_CANCELLED_EVENT_FQN", "com.citypass.espacios.EventoCancelado"),
  publicSpaceStatusChanged: () =>
    fromEnv("PUBLIC_SPACE_STATUS_CHANGED_EVENT_FQN", "com.citypass.espacios.EspacioEstadoCambiado"),
  // Pedido por Analitica: un espacio cerrado, restringido o con uso parcial (clima, baja manual, reclamo cercano).
  publicSpaceAffected: () =>
    fromEnv("PUBLIC_SPACE_AFFECTED_EVENT_FQN", "com.citypass.espacios.EspacioPublicoAfectado"),
  reservationConfirmed: () =>
    fromEnv("RESERVATION_CONFIRMED_EVENT_FQN", "com.citypass.espacios.ReservaConfirmada"),
  weatherConfirmed: () =>
    fromEnv("WEATHER_CONFIRMED_EVENT_FQN", "com.citypass.espacios.CriticidadClimaticaConfirmada"),
  weatherFinalized: () =>
    fromEnv("WEATHER_FINALIZED_EVENT_FQN", "com.citypass.espacios.CriticidadClimaticaFinalizada")
};

/**
 * Eventos que el outbox despacha al gateway. Una fila con otro nombre (por ejemplo los
 * eventos historicos "cultura.*" que nunca tuvieron contrato) no se envia.
 */
export function dispatchableEventNames(): string[] {
  return [
    eventNames.communityEventPublished(),
    eventNames.activityCreated(),
    eventNames.activityModified(),
    eventNames.communityEventCancelled(),
    eventNames.publicSpaceStatusChanged(),
    eventNames.publicSpaceAffected(),
    eventNames.reservationConfirmed(),
    eventNames.weatherConfirmed(),
    eventNames.weatherFinalized()
  ];
}
