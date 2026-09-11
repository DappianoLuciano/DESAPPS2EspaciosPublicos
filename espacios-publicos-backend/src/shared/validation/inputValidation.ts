import { ValidationError } from "../errors/ValidationError";

export function requireText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${field} es obligatorio.`);
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw new ValidationError(`${field} supera el maximo de ${maxLength} caracteres.`);
  }

  return normalized;
}

export function optionalText(
  value: unknown,
  field: string,
  maxLength: number
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireText(value, field, maxLength);
}

export function nullableText(
  value: unknown,
  field: string,
  maxLength: number
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  return requireText(value, field, maxLength);
}

export function requireEmail(value: unknown, field = "El correo electronico"): string {
  const email = requireText(value, field, 254).toLowerCase();

  if (!isEmailFormatValid(email)) {
    throw new ValidationError(`${field} no es valido.`);
  }

  return email;
}

function isEmailFormatValid(email: string): boolean {
  const separator = email.indexOf("@");

  if (separator <= 0 || separator !== email.lastIndexOf("@")) {
    return false;
  }

  const domain = email.slice(separator + 1);
  const dot = domain.indexOf(".");
  const containsWhitespace = Array.from(email).some((character) => character.trim() === "");

  return !containsWhitespace && dot > 0 && dot < domain.length - 1;
}

export function requirePositiveInteger(
  value: unknown,
  field: string,
  maximum = 1_000_000
): number {
  if (!Number.isInteger(value) || (value as number) <= 0 || (value as number) > maximum) {
    throw new ValidationError(`${field} debe ser un entero entre 1 y ${maximum}.`);
  }

  return value as number;
}

export function optionalHttpsUrl(
  value: unknown,
  field = "La URL de imagen"
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const text = requireText(value, field, 2048);

  try {
    const url = new URL(text);
    if (url.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new ValidationError(`${field} debe ser una URL HTTPS valida.`);
  }

  return text;
}

export function normalizeStringList(
  value: unknown,
  field: string,
  maxItems: number,
  maxItemLength: number
): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.length > maxItems) {
    throw new ValidationError(`${field} admite hasta ${maxItems} elementos.`);
  }

  const normalized = value.map((item) => requireText(item, field, maxItemLength));

  return normalized.filter((item, index) => {
    return normalized.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index;
  });
}
