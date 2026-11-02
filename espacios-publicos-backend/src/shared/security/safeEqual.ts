import { createHash, timingSafeEqual } from "crypto";

/**
 * Compara dos secretos en tiempo constante. Se comparan los SHA-256 para que
 * timingSafeEqual reciba siempre buffers del mismo largo. Un secreto esperado
 * vacio nunca coincide: "sin configurar" equivale a rechazar todo.
 */
export function safeEqual(received: unknown, expected: string | undefined): boolean {
  if (!expected || typeof received !== "string") {
    return false;
  }

  const digest = (value: string) => createHash("sha256").update(value).digest();

  return timingSafeEqual(digest(received), digest(expected));
}
