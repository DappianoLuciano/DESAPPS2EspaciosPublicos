export interface EmailSender {
  send(to: string, subject: string, html: string, attachments?: any[]): Promise<void>;
}
