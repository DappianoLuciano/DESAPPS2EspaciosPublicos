import { AiChatMessage } from "../../domain/services/AiChatService";

export interface AskChatbotInput {
  message: string;
  history?: AiChatMessage[];
}
