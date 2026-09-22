import nodemailer from "nodemailer";
import { EmailSender } from "../../domain/services/EmailSender";
import { logger } from "../../shared/logging/logger";

export class NodemailerEmailSender implements EmailSender {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || "user",
        pass: process.env.SMTP_PASS || "pass",
      },
    });
  }

  // No relanza: un mail de notificacion es un efecto secundario, no la
  // operacion principal (la reserva/inscripcion ya quedo guardada antes de
  // llegar aca). Mismo criterio que GeminiChatService con su servicio externo.
  async send(to: string, subject: string, html: string, attachments?: any[]): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: '"Espacios Públicos" <no-reply@espaciospublicos.com>',
        to,
        subject,
        html,
        attachments,
      });
    } catch (error) {
      logger.error({ err: error, to, subject }, "[NodemailerEmailSender] No se pudo enviar el mail");
    }
  }
}
