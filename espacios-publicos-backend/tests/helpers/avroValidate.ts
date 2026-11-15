// Validador Avro minimo para los tests de contrato (el repo no tiene una libreria Avro).
// Cubre lo que usan nuestros records: primitivos, uniones, records anidados, arrays, enums y logicalType.
// Es estricto como el gateway: un campo que el record no declara es un error.

type AvroType = string | unknown[] | { type: string; [key: string]: unknown };

export function avroErrors(schema: unknown, value: unknown, path = "$"): string[] {
  const type = schema as AvroType;
  if (Array.isArray(type)) {
    const matches = type.some(option => avroErrors(option as AvroType, value, path).length === 0);
    return matches ? [] : [`${path}: no coincide con ninguna opcion de ${JSON.stringify(type)}`];
  }

  if (typeof type === "object" && type !== null) {
    switch (type.type) {
      case "record": return recordErrors(type as unknown as RecordSchema, value, path);
      case "array": return Array.isArray(value)
        ? value.flatMap((item, index) => avroErrors(type.items as AvroType, item, `${path}[${index}]`))
        : [`${path}: se esperaba array`];
      case "enum": return (type.symbols as string[]).includes(value as string) ? [] : [`${path}: simbolo invalido ${String(value)}`];
      default: return avroErrors(type.type, value, path); // logicalType sobre un primitivo
    }
  }

  switch (type) {
    case "null": return value === null ? [] : [`${path}: se esperaba null`];
    case "boolean": return typeof value === "boolean" ? [] : [`${path}: se esperaba boolean`];
    case "string": return typeof value === "string" ? [] : [`${path}: se esperaba string`];
    case "int": return Number.isInteger(value) && Math.abs(value as number) <= 2 ** 31 - 1 ? [] : [`${path}: se esperaba int`];
    case "long": return Number.isInteger(value) ? [] : [`${path}: se esperaba long`];
    case "float":
    case "double": return typeof value === "number" && Number.isFinite(value) ? [] : [`${path}: se esperaba ${type}`];
    default: return [`${path}: tipo Avro no soportado por el validador: ${type}`];
  }
}

type RecordSchema = { fields: Array<{ name: string; type: AvroType; default?: unknown }> };

function recordErrors(
  record: RecordSchema,
  value: unknown,
  path: string
): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [`${path}: se esperaba record`];
  const data = value as Record<string, unknown>;
  const declared = new Set(record.fields.map(field => field.name));
  const extra = Object.keys(data).filter(key => !declared.has(key)).map(key => `${path}.${key}: campo no declarado`);
  const fieldErrors = record.fields.flatMap(field => {
    if (!(field.name in data)) {
      return "default" in field ? [] : [`${path}.${field.name}: falta el campo obligatorio`];
    }
    return avroErrors(field.type, data[field.name], `${path}.${field.name}`);
  });
  return [...extra, ...fieldErrors];
}
