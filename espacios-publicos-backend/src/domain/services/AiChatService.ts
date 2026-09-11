export interface AiChatMessage {
  role: "user" | "model";
  content: string;
}

export interface AiChatService {
  generateResponse(systemInstruction: string, history: AiChatMessage[], userMessage: string): Promise<string>;
}
