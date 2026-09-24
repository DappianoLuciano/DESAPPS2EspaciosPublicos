import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface TicketPdfData {
  registrationId: string;
  eventTitle: string;
  startDate: string;
  endDate: string;
  placeName: string;
  placeAddress: string;
  citizenName?: string;
}

export function getTicketUrl(registrationId: string) {
  return `${window.location.origin}/reservations/ticket/${registrationId}`;
}

// Genera la entrada en PDF en el navegador y la descarga.
export async function downloadTicketPdf(data: TicketPdfData) {
  const qrDataUri = await QRCode.toDataURL(getTicketUrl(data.registrationId), { width: 480, margin: 1 });
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const center = pageWidth / 2;

  const date = new Date(data.startDate).toLocaleDateString('es-AR', { dateStyle: 'full' });
  const time = `${new Date(data.startDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} - ${new Date(data.endDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Espacios Públicos · Entrada', center, 14, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(data.eventTitle, pageWidth - 24);
  doc.text(titleLines, center, 36, { align: 'center' });

  let y = 36 + titleLines.length * 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  for (const line of [date, time, data.placeName, data.placeAddress]) {
    doc.text(doc.splitTextToSize(line, pageWidth - 24), center, y, { align: 'center' });
    y += 6;
  }

  const qrSize = 70;
  doc.addImage(qrDataUri, 'PNG', center - qrSize / 2, y + 4, qrSize, qrSize);
  y += qrSize + 12;

  doc.setTextColor(15, 23, 42);
  if (data.citizenName) {
    doc.setFont('helvetica', 'bold');
    doc.text(data.citizenName, center, y, { align: 'center' });
    y += 6;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Código: #${data.registrationId.slice(0, 8).toUpperCase()}`, center, y, { align: 'center' });
  doc.text('Presentá este código QR al momento de asistir.', center, y + 5, { align: 'center' });

  doc.save(`entrada-${data.eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.pdf`);
}
