import { Injectable } from '@nestjs/common';
import { Company, Supplier } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { PurchaseOrderWithRelations } from './purchase-orders.repository';

function formatMoney(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Génère le PDF du bon de commande côté backend (jamais côté React) — utilisé à la fois pour la
 * pièce jointe envoyée au fournisseur et pour le téléchargement manuel depuis l'écran Achats.
 * En-tête : logo de l'entreprise (si renseigné, voir Company.logoUrl) à gauche, nom et
 * coordonnées à droite — texte seul si aucun logo n'a été déposé.
 */
@Injectable()
export class PurchaseOrderPdfService {
  generate(po: PurchaseOrderWithRelations, company: Company, supplier: Supplier | null): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // En-tête organisation
      const headerTop = doc.y;
      let textX = 40;
      const logoMatch = company.logoUrl ? /^data:image\/(png|jpe?g|webp);base64,(.+)$/.exec(company.logoUrl) : null;
      if (logoMatch) {
        try {
          doc.image(Buffer.from(logoMatch[2], 'base64'), 40, headerTop, { fit: [50, 50] });
          textX = 100;
        } catch {
          // Logo corrompu/illisible : on ignore silencieusement, l'en-tête retombe sur le texte seul.
        }
      }
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#000').text(company.name, textX, headerTop);
      const coords = [company.address, company.phone, company.email, company.taxId ? `NIF/RCCM : ${company.taxId}` : null]
        .filter(Boolean)
        .join(' · ');
      if (coords) {
        doc.fontSize(9).font('Helvetica').fillColor('#555').text(coords, textX);
      }
      doc.fillColor('#000');
      doc.x = 40;
      doc.y = Math.max(doc.y, headerTop + 50) + 8;
      doc.moveDown(1);

      // Titre + numéro/date
      doc.fontSize(14).font('Helvetica-Bold').text(`Bon de commande ${po.ref}`);
      const dateLabel = new Date(po.issuedAt ?? po.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.fontSize(9).font('Helvetica').text(`Date : ${dateLabel}`);
      doc.moveDown(1);

      // Fournisseur
      doc.fontSize(11).font('Helvetica-Bold').text('Fournisseur');
      doc.fontSize(9).font('Helvetica');
      if (supplier) {
        doc.text(supplier.name);
        if (supplier.contactName) doc.text(supplier.contactName);
        if (supplier.address) doc.text(supplier.address);
        if (supplier.phone) doc.text(`Tél. : ${supplier.phone}`);
        doc.text(`E-mail : ${supplier.email ?? '—'}`);
      } else {
        doc.text(po.supplierName || '—');
      }
      doc.moveDown(1);

      // Tableau des lignes
      doc.fontSize(11).font('Helvetica-Bold').text('Articles commandés');
      doc.moveDown(0.3);
      const col = { ref: 40, name: 110, qty: 330, unit: 385, total: 460 };
      let y = doc.y;
      doc.fontSize(8.5).font('Helvetica-Bold');
      doc.text('Réf.', col.ref, y, { width: 65 });
      doc.text('Désignation', col.name, y, { width: 210 });
      doc.text('Qté', col.qty, y, { width: 45, align: 'right' });
      doc.text('P.U.', col.unit, y, { width: 70, align: 'right' });
      doc.text('Montant', col.total, y, { width: 95, align: 'right' });
      doc.moveDown(0.6);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#999').stroke();
      doc.moveDown(0.3);

      doc.font('Helvetica').fontSize(8.5);
      for (const line of po.lines) {
        y = doc.y;
        const lineTotal = line.quantity * line.unitPrice;
        doc.text(line.product.sku, col.ref, y, { width: 65 });
        doc.text(line.product.name, col.name, y, { width: 210 });
        doc.text(String(line.quantity), col.qty, y, { width: 45, align: 'right' });
        doc.text(formatMoney(line.unitPrice), col.unit, y, { width: 70, align: 'right' });
        doc.text(formatMoney(lineTotal), col.total, y, { width: 95, align: 'right' });
        doc.moveDown(0.7);
      }
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#999').stroke();
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').fontSize(11).text(`Total : ${formatMoney(po.totalAmount)} ${company.baseCurrency}`, { align: 'right' });
      doc.moveDown(1);

      if (po.purchaseConditions) {
        doc.fontSize(10).font('Helvetica-Bold').text("Conditions d'achat");
        doc.fontSize(9).font('Helvetica').text(po.purchaseConditions);
        doc.moveDown(0.8);
      }
      if (po.observations) {
        doc.fontSize(10).font('Helvetica-Bold').text('Observations');
        doc.fontSize(9).font('Helvetica').text(po.observations);
        doc.moveDown(0.8);
      }

      doc.fontSize(10).font('Helvetica-Bold').text('Informations de validation');
      doc.fontSize(9).font('Helvetica');
      if (po.validatedBy && po.validatedAt) {
        doc.text(`Validé par ${po.validatedBy.firstName} ${po.validatedBy.lastName} le ${new Date(po.validatedAt).toLocaleString('fr-FR')}`);
      } else {
        doc.text('Non validé.');
      }

      doc.end();
    });
  }
}
