import nodemailer from "nodemailer";
import { EmailSender } from "../../domain/services/EmailSender";
import { logger } from "../../shared/logging/logger";

export class NodemailerEmailSender implements EmailSender {
  private transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor() {
    const port = Number(process.env.SMTP_PORT) || 587;

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn(
        "[NodemailerEmailSender] Faltan SMTP_HOST/SMTP_USER/SMTP_PASS: los mails de confirmacion no se van a enviar"
      );
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port,
      secure: port === 465, // 465 usa TLS directo; 587 usa STARTTLS
      auth: {
        user: process.env.SMTP_USER || "user",
        pass: process.env.SMTP_PASS || "pass",
      },
    });

    // Gmail y la mayoria de los proveedores rechazan o reescriben un remitente
    // que no coincide con la cuenta autenticada, por eso el default es SMTP_USER.
    this.from = process.env.SMTP_FROM || `"Espacios Públicos" <${process.env.SMTP_USER || "no-reply@espaciospublicos.com"}>`;
  }

  // No relanza: un mail de notificacion es un efecto secundario, no la
  // operacion principal (la reserva/inscripcion ya quedo guardada antes de
  // llegar aca). Mismo criterio que GeminiChatService con su servicio externo.
  async send(to: string, subject: string, html: string, attachments?: any[]): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
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
