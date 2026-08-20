import type { AppSettings, Fund } from '@/types';
import type { MovementWithExtra } from '@/hooks/useStore';
import { formatAmount, formatDateShort, monthRangeLabel, today, startOfWeek, endOfWeek, currentMonthKey } from '@/utils/format';
import jsPDF from 'jspdf';

export type ReportFormat = 'png' | 'pdf' | 'whatsapp' | 'csv';
export type ReportPeriod = 'dia' | 'semana' | 'mes' | 'custom';
export type ReportFilter = 'todos' | 'income' | 'expense';

export interface ReportOptions {
  fundId: string | 'all';
  period: ReportPeriod;
  dateStart: string;
  dateEnd: string;
  filter: ReportFilter;
  showBalance: boolean;
  showNotes: boolean;
  showCategories: boolean;
}

export function getDefaultReportOptions(): ReportOptions {
  return {
    fundId: 'all',
    period: 'mes',
    dateStart: currentMonthKey() + '-01',
    dateEnd: today(),
    filter: 'todos',
    showBalance: true,
    showNotes: true,
    showCategories: true,
  };
}

export function resolvePeriodDates(opts: ReportOptions): { start: string; end: string; label: string } {
  switch (opts.period) {
    case 'dia':
      return { start: today(), end: today(), label: 'Día actual' };
    case 'semana':
      return { start: startOfWeek(today()), end: endOfWeek(today()), label: 'Semana actual' };
    case 'mes': {
      const key = currentMonthKey();
      return { start: key + '-01', end: today(), label: 'Mes actual' };
    }
    case 'custom':
      return { start: opts.dateStart, end: opts.dateEnd, label: monthRangeLabel(opts.dateStart, opts.dateEnd) };
  }
}

export function filterMovementsForReport(
  movements: MovementWithExtra[],
  opts: ReportOptions,
  funds: Fund[],
): MovementWithExtra[] {
  const { start, end } = resolvePeriodDates(opts);
  return movements.filter((m) => {
    if (m.movementDate < start || m.movementDate > end) return false;
    if (opts.fundId !== 'all' && m.fundId !== opts.fundId && m.destinationFundId !== opts.fundId) return false;
    if (opts.filter === 'income' && m.type !== 'income') return false;
    if (opts.filter === 'expense' && m.type !== 'expense') return false;
    return true;
  });
}

export function getFundName(opts: ReportOptions, funds: Fund[]): string {
  if (opts.fundId === 'all') return 'Todos los fondos';
  return funds.find((f) => f.id === opts.fundId)?.name ?? 'Fondo';
}

// --- WhatsApp text ---
export function generateWhatsAppText(
  movements: MovementWithExtra[],
  opts: ReportOptions,
  settings: AppSettings,
  funds: Fund[],
): string {
  const { label } = resolvePeriodDates(opts);
  const fundName = getFundName(opts, funds);
  const sym = settings.currencySymbol;
  const cur = settings.currency;

  let text = `DESGLOSE DE MOVIMIENTOS\n`;
  text += `Fondo: ${fundName}\n`;
  text += `Periodo: ${label}\n\n`;

  const ingresos = movements.filter((m) => m.type === 'income');
  const retiros = movements.filter((m) => m.type === 'expense');
  const transferencias = movements.filter((m) => m.type === 'transfer');

  let totalIn = 0, totalOut = 0;

  if (ingresos.length > 0) {
    text += `Ingresos:\n`;
    for (const m of ingresos) {
      totalIn += m.amountInCents;
      text += `+ ${formatAmount(m.amountInCents, sym)} — ${formatDateShort(m.movementDate)} — ${m.note || m.categoryName}\n`;
    }
    text += `\n`;
  }

  if (retiros.length > 0) {
    text += `Retiros:\n`;
    for (const m of retiros) {
      totalOut += m.amountInCents;
      text += `- ${formatAmount(m.amountInCents, sym)} — ${formatDateShort(m.movementDate)} — ${m.note || m.categoryName}\n`;
    }
    text += `\n`;
  }

  if (transferencias.length > 0) {
    text += `Transferencias:\n`;
    for (const m of transferencias) {
      text += `↔ ${formatAmount(m.amountInCents, sym)} — ${formatDateShort(m.movementDate)} — ${m.fundName} → ${m.destinationFundName ?? ''}\n`;
    }
    text += `\n`;
  }

  text += `Total ingresado: ${formatAmount(totalIn, sym)}\n`;
  text += `Total retirado: ${formatAmount(totalOut, sym)}\n`;
  if (opts.showBalance) {
    text += `Saldo del periodo: ${formatAmount(totalIn - totalOut, sym)} ${cur}\n`;
  }
  text += `\nGenerado: ${new Date().toLocaleString('es-MX')}\n`;

  return text;
}

// --- CSV ---
export function generateCSV(movements: MovementWithExtra[], settings: AppSettings): string {
  const headers = ['Tipo', 'Cantidad', 'Fondo', 'Fondo destino', 'Fecha', 'Hora', 'Categoria', 'Nota', 'Saldo resultante'];
  const rows = movements.map((m) => {
    const tipo = m.type === 'income' ? 'Ingreso' : m.type === 'expense' ? 'Retiro' : 'Transferencia';
    return [
      tipo,
      (m.amountInCents / 100).toFixed(2),
      `"${m.fundName}"`,
      m.destinationFundName ? `"${m.destinationFundName}"` : '',
      m.movementDate,
      m.movementTime,
      m.categoryName,
      `"${m.note.replace(/"/g, '""')}"`,
      (m.balanceAfterCents / 100).toFixed(2),
    ];
  });
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// --- PNG (canvas) ---
export async function generatePNG(
  movements: MovementWithExtra[],
  opts: ReportOptions,
  settings: AppSettings,
  funds: Fund[],
): Promise<string> {
  const { label } = resolvePeriodDates(opts);
  const fundName = getFundName(opts, funds);
  const sym = settings.currencySymbol;
  const cur = settings.currency;

  const width = 800;
  const padding = 40;
  const lineHeight = 32;
  const cardWidth = width - padding * 2;

  // Calculate height
  const headerHeight = 200;
  const summaryHeight = 120;
  const rowHeight = 40;
  const footerHeight = 80;
  const contentHeight = movements.length * rowHeight;
  const height = headerHeight + summaryHeight + contentHeight + footerHeight + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  // Card
  ctx.fillStyle = '#1e293b';
  const cardX = padding;
  const cardY = padding;
  const cardH = height - padding * 2;
  roundRect(ctx, cardX, cardY, cardWidth, cardH, 24);
  ctx.fill();

  let y = cardY + 40;

  // App name
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(settings.appName, cardX + 30, y);

  y += 35;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px sans-serif';
  ctx.fillText('Desglose de movimientos', cardX + 30, y);

  y += 28;
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`Fondo: ${fundName}`, cardX + 30, y);

  y += 26;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Periodo: ${label}`, cardX + 30, y);

  // Separator
  y += 20;
  ctx.strokeStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(cardX + 30, y);
  ctx.lineTo(cardX + cardWidth - 30, y);
  ctx.stroke();

  // Summary
  y += 30;
  let totalIn = 0, totalOut = 0;
  for (const m of movements) {
    if (m.type === 'income') totalIn += m.amountInCents;
    else if (m.type === 'expense') totalOut += m.amountInCents;
  }

  ctx.fillStyle = '#10b981';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Ingresos: ${formatAmount(totalIn, sym)}`, cardX + 30, y);
  ctx.fillStyle = '#ef4444';
  ctx.fillText(`Retiros: ${formatAmount(totalOut, sym)}`, cardX + 300, y);

  y += 24;
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 18px sans-serif';
  if (opts.showBalance) {
    ctx.fillText(`Saldo: ${formatAmount(totalIn - totalOut, sym)} ${cur}`, cardX + 30, y);
  }

  // Separator
  y += 20;
  ctx.strokeStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(cardX + 30, y);
  ctx.lineTo(cardX + cardWidth - 30, y);
  ctx.stroke();

  // Movements
  y += 30;
  ctx.font = '13px sans-serif';
  for (const m of movements) {
    if (y > cardY + cardH - 60) break;

    const isIncome = m.type === 'income';
    const isTransfer = m.type === 'transfer';
    const color = isIncome ? '#10b981' : isTransfer ? '#3b82f6' : '#ef4444';
    const sign = isIncome ? '+' : isTransfer ? '↔' : '-';

    // Type dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cardX + 40, y - 5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Amount
    ctx.fillStyle = color;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`${sign} ${formatAmount(m.amountInCents, sym)}`, cardX + 55, y);

    // Date
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText(formatDateShort(m.movementDate), cardX + 250, y);

    // Category
    if (opts.showCategories && m.categoryName) {
      ctx.fillText(m.categoryName, cardX + 380, y);
    }

    // Note
    if (opts.showNotes && m.note) {
      const note = m.note.length > 30 ? m.note.slice(0, 30) + '...' : m.note;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(note, cardX + 520, y);
    }

    y += rowHeight;
  }

  // Footer
  y = cardY + cardH - 50;
  ctx.fillStyle = '#475569';
  ctx.font = '11px sans-serif';
  ctx.fillText(`Generado: ${new Date().toLocaleString('es-MX')}`, cardX + 30, y);

  return canvas.toDataURL('image/png');
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// --- PDF ---
export function generatePDF(
  movements: MovementWithExtra[],
  opts: ReportOptions,
  settings: AppSettings,
  funds: Fund[],
): Blob {
  const { label } = resolvePeriodDates(opts);
  const fundName = getFundName(opts, funds);
  const sym = settings.currencySymbol;
  const cur = settings.currency;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 30, 'F');
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.appName, margin + 5, y + 12);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Desglose de movimientos', margin + 5, y + 20);
    y += 38;
  };

  const checkPage = () => {
    if (y > pageHeight - 30) {
      doc.addPage();
      y = margin;
    }
  };

  addHeader();

  // Info
  doc.setTextColor(226, 232, 240);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Fondo: ${fundName}`, margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(`Periodo: ${label}`, margin, y);
  y += 10;

  // Summary
  let totalIn = 0, totalOut = 0;
  for (const m of movements) {
    if (m.type === 'income') totalIn += m.amountInCents;
    else if (m.type === 'expense') totalOut += m.amountInCents;
  }

  doc.setFillColor(16, 185, 129);
  doc.rect(margin, y, contentWidth / 3 - 2, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('Ingresos', margin + 3, y + 6);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(formatAmount(totalIn, sym), margin + 3, y + 12);

  doc.setFillColor(239, 68, 68);
  doc.rect(margin + contentWidth / 3, y, contentWidth / 3 - 2, 15, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Retiros', margin + contentWidth / 3 + 3, y + 6);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(formatAmount(totalOut, sym), margin + contentWidth / 3 + 3, y + 12);

  if (opts.showBalance) {
    doc.setFillColor(59, 130, 246);
    doc.rect(margin + (contentWidth / 3) * 2, y, contentWidth / 3, 15, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Saldo', margin + (contentWidth / 3) * 2 + 3, y + 6);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatAmount(totalIn - totalOut, sym)} ${cur}`, margin + (contentWidth / 3) * 2 + 3, y + 12);
  }

  y += 25;

  // Table header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha', margin + 2, y + 5.5);
  doc.text('Tipo', margin + 30, y + 5.5);
  doc.text('Cantidad', margin + 55, y + 5.5);
  if (opts.showCategories) doc.text('Categoria', margin + 80, y + 5.5);
  if (opts.showNotes) doc.text('Nota', margin + 110, y + 5.5);
  doc.text('Fondo', margin + 150, y + 5.5);
  y += 10;

  // Movements
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  for (const m of movements) {
    checkPage();

    const isIncome = m.type === 'income';
    const isTransfer = m.type === 'transfer';

    doc.setTextColor(isIncome ? 16 : isTransfer ? 59 : 239, isIncome ? 185 : isTransfer ? 130 : 68, isIncome ? 129 : isTransfer ? 246 : 68);
    doc.text(formatDateShort(m.movementDate), margin + 2, y);
    doc.text(isIncome ? 'Ingreso' : isTransfer ? 'Transf.' : 'Retiro', margin + 30, y);
    const sign = isIncome ? '+' : isTransfer ? '↔' : '-';
    doc.text(`${sign} ${formatAmount(m.amountInCents, sym)}`, margin + 55, y);
    if (opts.showCategories) doc.text(m.categoryName?.slice(0, 20) ?? '', margin + 80, y);
    if (opts.showNotes) doc.text(m.note?.slice(0, 35) ?? '', margin + 110, y);
    doc.setTextColor(148, 163, 184);
    doc.text(m.fundName?.slice(0, 20) ?? '', margin + 150, y);

    y += 6;
  }

  // Footer
  y += 10;
  checkPage();
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, margin, y);

  return doc.output('blob');
}

// --- Download helpers ---
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadDataURL(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export async function shareOrDownload(data: { title: string; text?: string; blob?: Blob; dataUrl?: string; filename: string }) {
  // Try Web Share API
  if (navigator.share && navigator.canShare) {
    try {
      if (data.blob) {
        const file = new File([data.blob], data.filename, { type: data.blob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: data.title, text: data.text, files: [file] });
          return;
        }
      }
      if (data.text) {
        await navigator.share({ title: data.title, text: data.text });
        return;
      }
    } catch {
      // Fall through to download
    }
  }

  // Fallback: download
  if (data.blob) downloadBlob(data.blob, data.filename);
  else if (data.dataUrl) downloadDataURL(data.dataUrl, data.filename);
  else if (data.text) {
    const blob = new Blob([data.text], { type: 'text/plain' });
    downloadBlob(blob, data.filename);
  }
}
