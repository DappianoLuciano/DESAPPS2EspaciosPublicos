export const STANDARD_REFUSAL_MESSAGE =
  "Soy el asistente virtual de CityPass+ y únicamente puedo responder consultas sobre los eventos culturales y espacios públicos disponibles en la plataforma.";

const MALICIOUS_PATTERNS: RegExp[] = [
  // Intentos de ignorar o cambiar instrucciones
  /(ignora|olvida|desestima|borra)\s+(las|todas\s+las|tus)?\s*(instrucciones|reglas|directivas|comandos|indicaciones)/i,
  /\b(system\s*prompt|prompt\s*injection|jailbreak|dan\s*mode|developer\s*mode)\b/i,
  /(act[uú]a\s+como|simula\s+que|pretende\s+ser|ahora\s+eres|comportate\s+como|eres\s+un)\b/i,
  /(revela|dime|muestra|imprime)\s+(el|tus)?\s*(system\s*prompt|instrucciones|directivas)/i,

  // Encadenamiento de tareas / Inyecciones del tipo "antes resolve X"
  /(pero\s+)?(antes|primero)\s+(de\s+(responder|hacerlo|seguir)\s+)?(resolv[eé]|calcula|dime|decime|escribe|hac[eé]|responde|traduc[eé])/i,
  /(adem[aá]s|tambi[eé]n)\s+(resolv[eé]|calcula|escribe|hac[eé]|program[aá])\b/i,
  /(resolv[eé]|calcula)\s+(este|el\s+siguiente)?\s*(problema|c[aá]lculo|acertijo|operaci[oó]n)/i,

  // Generación de código ajeno o exploits
  /(escribe|genera|crea|program[aá])\s+(un\s+)?(c[oó]digo|script|programa|funci[oó]n|html|javascript|python|sql|payload)/i,

  // Cálculos matemáticos y preguntas fuera de dominio
  /\b\d+\s*[\+\*\/]\s*\d+\b/,
  /cu[aá]nto\s+es\s+\d+/i,
  /\b(capital\s+de\s+[a-z]+|receta\s+de|qui[eé]n\s+gan[oó]\s+el\s+mundial)\b/i
];

export interface GuardCheckResult {
  isAllowed: boolean;
  refusalMessage?: string;
  reason?: string;
}

export function checkPromptSafety(userMessage: string): GuardCheckResult {
  const normalized = userMessage.trim();

  if (!normalized) {
    return {
      isAllowed: false,
      refusalMessage: "Por favor, ingresá una consulta sobre la agenda cultural o eventos disponibles."
    };
  }

  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isAllowed: false,
        refusalMessage: STANDARD_REFUSAL_MESSAGE,
        reason: "Patrón fuera de dominio o intento de inyección detectado."
      };
    }
  }

  return { isAllowed: true };
}

export function sanitizeInput(text: string): string {
  // Limitar longitud para evitar desbordes de contexto y neutralizar etiquetas XML de delimitación
  return text
    .slice(0, 500)
    .replace(/<eventos_disponibles>/gi, "")
    .replace(/<\/eventos_disponibles>/gi, "")
    .replace(/<instrucciones>/gi, "")
    .replace(/<\/instrucciones>/gi, "")
    .trim();
}

export function validateOutput(responseText: string): boolean {
  // Post-filtro: Si el modelo responde con bloques de código o expresiones sospechosas, neutralizar
  if (/```(javascript|python|bash|sh|c|cpp|html|sql)/i.test(responseText)) {
    return false;
  }
  return true;
}
