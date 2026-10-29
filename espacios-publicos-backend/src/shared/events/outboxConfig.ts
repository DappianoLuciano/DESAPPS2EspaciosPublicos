const DEFAULT_OUTBOX_MAX_ATTEMPTS = 10;

/**
 * Cantidad maxima de intentos de publicacion de una fila del outbox antes de darla por fallida
 * (EVENT_OUTBOX_MAX_ATTEMPTS, por defecto 10). Un valor invalido vuelve al default.
 */
export function getOutboxMaxAttempts(): number {
  const configured = Number(process.env.EVENT_OUTBOX_MAX_ATTEMPTS);

  return Number.isInteger(configured) && configured >= 1 ? configured : DEFAULT_OUTBOX_MAX_ATTEMPTS;
}
