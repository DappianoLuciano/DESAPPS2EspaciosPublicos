import nodemailer from "nodemailer";
import { EmailSender } from "../../domain/services/EmailSender";

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

  async send(to: string, subject: string, html: string, attachments?: any[]): Promise<void> {
    await this.transporter.sendMail({
      from: '"Espacios Públicos" <no-reply@espaciospublicos.com>',
      to,
      subject,
      html,
      attachments,
    });
  }
}
