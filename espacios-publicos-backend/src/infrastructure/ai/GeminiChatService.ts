import { AiChatMessage, AiChatService } from "../../domain/services/AiChatService";

export class GeminiChatService implements AiChatService {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || "";
    this.model = model || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  }

  async generateResponse(
    systemInstruction: string,
    history: AiChatMessage[],
    userMessage: string
  ): Promise<string> {
    if (!this.apiKey) {
      // Fallback amigable cuando no se cargó la API key en el entorno local
      return (
        "El servicio de inteligencia artificial no se encuentra configurado con una API Key en el entorno actual. " +
        "Por favor, configurá la variable GEMINI_API_KEY en el archivo .env del backend."
      );
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    // Limitar el historial a los últimos 6 mensajes (3 rondas de interacción)
    const limitedHistory = history.slice(-6);

    const contents = [
      ...limitedHistory.map((item) => ({
        role: item.role === "model" ? "model" : "user",
        parts: [{ text: item.content }]
      })),
      {
        role: "user",
        parts: [{ text: userMessage }]
      }
    ];

    const body = {
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 600
      }
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`[GeminiChatService] Error en llamada a Gemini (${response.status}):`, errorData);
        throw new Error(`Error de la API de Gemini: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        return "Disculpá, no pude procesar la respuesta en este momento. Por favor intentá nuevamente.";
      }

      return candidateText.trim();
    } catch (error) {
      console.error("[GeminiChatService] Excepción al comunicarse con Gemini:", error);
      return "Hubo un inconveniente temporal de conectividad con el asistente inteligente. Por favor intentá más tarde.";
    }
  }
}
