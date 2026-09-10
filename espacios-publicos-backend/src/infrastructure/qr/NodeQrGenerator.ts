import QRCode from "qrcode";
import { QrGenerator } from "../../domain/services/QrGenerator";

export class NodeQrGenerator implements QrGenerator {
  async generate(data: string): Promise<string> {
    return QRCode.toDataURL(data);
  }
}
