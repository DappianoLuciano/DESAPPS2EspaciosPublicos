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
  // Pedido por Analitica: termina una afectacion publicada en EspacioPublicoAfectado.
  publicSpaceRestored: () =>
    fromEnv("PUBLIC_SPACE_RESTORED_EVENT_FQN", "com.citypass.espacios.EspacioPublicoRestaurado"),
  reservationConfirmed: () =>
    fromEnv("RESERVATION_CONFIRMED_EVENT_FQN", "com.citypass.espacios.ReservaConfirmada"),
  // CU-01: emergencia durante un viaje en bicicleta.
  // Analitica (Parte 2): ciclo de vida de la reserva. Se suman a ReservaConfirmada, que consume Movilidad.
  reservationCreated: () =>
    fromEnv("RESERVATION_CREATED_EVENT_FQN", "com.citypass.espacios.ReservaCreada"),
  reservationUpdated: () =>
    fromEnv("RESERVATION_UPDATED_EVENT_FQN", "com.citypass.espacios.ReservaActualizada"),
  reservationAffected: () =>
    fromEnv("RESERVATION_AFFECTED_EVENT_FQN", "com.citypass.espacios.ReservaAfectada"),
  spaceReleased: () =>
    fromEnv("SPACE_RELEASED_EVENT_FQN", "com.citypass.espacios.EspacioLiberado"),
  problemRegistered: () =>
    fromEnv("PROBLEM_REGISTERED_EVENT_FQN", "com.citypass.espacios.ProblematicaRegistrada"),
  // CU-INT-01: cierra el circuito con Reclamos cuando termina la intervencion en la calle.
  interventionFinished: () =>
    fromEnv("INTERVENTION_FINISHED_EVENT_FQN", "com.citypass.espacios.IntervencionFinalizada"),
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
    eventNames.publicSpaceRestored(),
    eventNames.reservationConfirmed(),
    eventNames.reservationCreated(),
    eventNames.reservationUpdated(),
    eventNames.reservationAffected(),
    eventNames.spaceReleased(),
    eventNames.problemRegistered(),
    eventNames.interventionFinished(),
    eventNames.weatherConfirmed(),
    eventNames.weatherFinalized()
  ];
}
