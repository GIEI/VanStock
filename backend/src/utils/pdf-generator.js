const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates an Intervention Report PDF for a specific job.
 * 
 * @param {Object} data - Data for the report
 * @param {Object} data.job - Job object
 * @param {Object} data.company - Company object
 * @param {Array} data.movements - List of materials used
 * @param {Array} data.photos - List of job photos (processed)
 * @param {string} data.signaturePath - Absolute path to signature image
 * @param {Stream} outStream - Writable stream to write PDF to
 */
function generateInterventionReport(data, outStream) {
  const { job, company, movements, photos, signaturePath } = data;
  const doc = new PDFDocument({ margin: 50 });

  doc.pipe(outStream);

  // --- Header ---
  const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
  
  if (company.logo_url) {
    const logoFile = path.basename(company.logo_url);
    const logoPath = path.join(uploadDir, logoFile);
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 50 });
    }
  }

  doc
    .fillColor('#444444')
    .fontSize(20)
    .text(company.name, 110, 50)
    .fontSize(10)
    .text('Rapporto d\'Intervento Tecnico', 110, 75)
    .text(`Data: ${new Date().toLocaleDateString('it-IT')}`, 110, 90, { align: 'right' })
    .moveDown();

  doc.lineWidth(1).moveTo(50, 115).lineTo(550, 115).stroke();

  // --- Client & Job Info ---
  doc.moveDown(2);
  
  const col1Left = 50;
  const col2Left = 300;

  doc.fontSize(12).fillColor('#000000').text('CLIENTE', col1Left, doc.y, { underline: true });
  doc.fontSize(12).text('DETTAGLI LAVORO', col2Left, doc.y - 14, { underline: true });

  doc.moveDown();
  const topY = doc.y;

  // Client Column
  doc.fontSize(10)
    .text(job.client_name || 'N/D', col1Left, topY)
    .text(job.client_address || '', col1Left)
    .text(job.client_phone || '', col1Left)
    .text(job.client_email || '', col1Left);

  // Job Column
  doc.fontSize(10)
    .text(`ID Lavoro: #${job.id}`, col2Left, topY)
    .text(`Titolo: ${job.title}`, col2Left)
    .text(`Stato: ${job.status.toUpperCase()}`, col2Left)
    .text(`Assegnato a: ${job.assigned_to_name || 'N/D'}`, col2Left);

  doc.moveDown(2);

  // --- Description ---
  if (job.description) {
    doc.fontSize(12).text('Descrizione Intervento', { underline: true }).moveDown(0.5);
    doc.fontSize(10).text(job.description).moveDown(2);
  }

  // --- Materials (Movements) ---
  if (movements && movements.length > 0) {
    doc.fontSize(12).text('Materiali e Ricambi Utilizzati', { underline: true }).moveDown(0.5);
    
    // Table Header
    const tableTop = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Codice/SKU', 50, tableTop);
    doc.text('Prodotto', 150, tableTop);
    doc.text('Quantità', 450, tableTop, { align: 'right' });
    
    doc.moveDown();
    doc.font('Helvetica');
    
    movements.forEach(m => {
      const y = doc.y;
      doc.text(m.sku || '-', 50, y);
      doc.text(m.product_name, 150, y, { width: 280 });
      doc.text(`${m.quantity} ${m.unit || 'pz'}`, 450, y, { align: 'right' });
      doc.moveDown(0.5);
    });
    doc.moveDown(2);
  }

  // --- Photos ---
  const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.mkv', '.3gp']);
  const isVideo = (url) => VIDEO_EXTS.has(path.extname(url || '').toLowerCase());

  // Filter out videos before rendering
  const problemPhotos = photos.filter(p => p.type === 'problem' && !isVideo(p.url));
  const repairPhotos  = photos.filter(p => p.type === 'repair'  && !isVideo(p.url));

  if (problemPhotos.length > 0 || repairPhotos.length > 0) {
    doc.addPage();
    doc.fontSize(12).text('Documentazione Fotografica', { underline: true }).moveDown();

    const IMG_W   = 230;
    const IMG_H   = 150;
    const COL2_X  = 320;   // x of second column
    const ROW_GAP = 20;

    const renderPhotos = (title, list) => {
      if (list.length === 0) return;
      doc.fontSize(11).text(title).moveDown(0.5);

      let colIdx   = 0;
      let rowY     = doc.y;   // y of current row
      let bottomY  = rowY;    // tracks the lowest point reached

      list.forEach(p => {
        const photoPath = path.join(uploadDir, path.basename(p.url));
        if (!fs.existsSync(photoPath)) return;

        // Start a new row when both columns are filled
        if (colIdx >= 2) {
          colIdx = 0;
          rowY   = bottomY + ROW_GAP;
        }

        // Page break if needed
        if (rowY + IMG_H > doc.page.height - 80) {
          doc.addPage();
          rowY    = 50;
          bottomY = 50;
          colIdx  = 0;
        }

        const xPos = colIdx === 0 ? 50 : COL2_X;
        try {
          doc.image(photoPath, xPos, rowY, { fit: [IMG_W, IMG_H] });
        } catch (e) {
          doc.fontSize(9).text('[Anteprima non disponibile]', xPos, rowY, { width: IMG_W });
        }

        bottomY = Math.max(bottomY, rowY + IMG_H);
        colIdx++;
      });

      // Advance the cursor past all rendered photos so the next section starts below
      doc.y = bottomY + ROW_GAP;
      doc.moveDown(2);
    };

    renderPhotos('Foto Prima (Problematiche):', problemPhotos);
    renderPhotos('Foto Dopo (Riparazione):', repairPhotos);
  }

  // --- Signature Footer ---
  // Reserve 160pt for the footer; add a new page if not enough room
  const SIG_AREA_H = 160;
  if (doc.y > doc.page.height - SIG_AREA_H - 30) doc.addPage();

  const footerY = doc.page.height - SIG_AREA_H;
  doc.lineWidth(1).moveTo(50, footerY - 10).lineTo(550, footerY - 10).stroke();

  doc.fontSize(10).text('Firma del Tecnico', 50, footerY);
  doc.text(job.assigned_to_name || '', 50, footerY + 15);

  doc.text('Firma del Cliente per Accettazione', 300, footerY);
  if (signaturePath && fs.existsSync(signaturePath)) {
    try {
      // fit: keeps aspect ratio but never exceeds 200×100 pt
      doc.image(signaturePath, 300, footerY + 18, { fit: [230, 100] });
    } catch (e) {
      doc.text('__________________________', 300, footerY + 40);
    }
  } else {
    doc.text('__________________________', 300, footerY + 40);
  }

  doc.fontSize(8).fillColor('#888888').text(
    `Generato da StockSimple il ${new Date().toLocaleString('it-IT')}`,
    0, 
    doc.page.height - 30, 
    { align: 'center', width: doc.page.width }
  );

  doc.end();
}

module.exports = {
  generateInterventionReport
};
