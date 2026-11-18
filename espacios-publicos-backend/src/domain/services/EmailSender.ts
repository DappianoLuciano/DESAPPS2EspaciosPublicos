/** Adjunto de un mail. `path` acepta una URL o un data URI; `cid` lo referencia desde el HTML (<img src="cid:...">). */
export interface EmailAttachment {
  filename: string;
  path: string;
  cid?: string;
}

export interface EmailSender {
  send(to: string, subject: string, html: string, attachments?: EmailAttachment[]): Promise<void>;
}
