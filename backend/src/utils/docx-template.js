const PizZip        = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule   = require('docxtemplater-image-module-free');
const fs            = require('fs');
const path          = require('path');
const os            = require('os');
const { exec }      = require('child_process');
const util          = require('util');

const execAsync = util.promisify(exec);

/**
 * Reads pixel dimensions from a PNG or JPEG Buffer without any extra dependency.
 * Returns { width, height } or null if the format is unrecognised.
 */
function getImageDimensions(buf) {
  if (!buf || buf.length < 24) return null;

  // PNG: 8-byte signature, then IHDR chunk (4 len + 4 "IHDR" + 4 width + 4 height)
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // JPEG: scan for SOF0–SOF3 markers (0xFF 0xCn)
  if (buf[0] === 0xFF && buf[1] === 0xD8) {
    let i = 2;
    while (i < buf.length - 8) {
      if (buf[i] !== 0xFF) break;
      const marker = buf[i + 1];
      if (marker >= 0xC0 && marker <= 0xC3) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }

  return null;
}

/**
 * Scale dimensions to fit within maxW × maxH, preserving aspect ratio.
 * Falls back to [maxW, maxH] if image dimensions can't be detected.
 */
function fitSize(imgBuffer, maxW, maxH) {
  const dims = getImageDimensions(imgBuffer);
  if (!dims || dims.width === 0 || dims.height === 0) return [maxW, maxH];
  const scale = Math.min(maxW / dims.width, maxH / dims.height);
  return [Math.round(dims.width * scale), Math.round(dims.height * scale)];
}

/**
 * Fills a .docx template with the provided data object and converts the
 * result to a PDF using LibreOffice.
 *
 * Template syntax (docxtemplater):
 *   {variable}                    — simple text value
 *   {#movements}...{/movements}   — loop over array
 *   {%signature}                  — customer signature image
 *   {#problem_photos}{%photo}{/problem_photos} — before-photos loop
 *   {#repair_photos}{%photo}{/repair_photos}   — after-photos loop
 *
 * @param {string} templatePath  Absolute path to the .docx template file
 * @param {Object} data          Key/value pairs matching template placeholders
 * @returns {Promise<Buffer>}    PDF content as a Buffer
 */
async function renderDocxToPdf(templatePath, data) {
  // 1. Load template
  const content = fs.readFileSync(templatePath, 'binary');
  const zip     = new PizZip(content);

  // 2. Configure image module
  // NOTE: tagValue must be a file-path STRING, never a Buffer.
  // The module checks typeof tagValue === 'object' to detect pre-resolved images;
  // passing a Buffer (which is an object) would incorrectly trigger that branch.
  const imageModule = new ImageModule({
    centered:  false,
    fileType:  'docx',
    getImage: (filePath) => fs.readFileSync(filePath),
    getSize:  (imgBuffer, _tagValue, tagName) => {
      // Signature: max 180×90 px ≈ 4.75×2.4 cm  — fits in narrow table cells
      // Photos:    max 230×160 px ≈ 6.1×4.2 cm
      if (tagName === 'signature') return fitSize(imgBuffer, 180, 90);
      return fitSize(imgBuffer, 230, 160);
    },
  });

  // 3. Fill template
  const doc = new Docxtemplater(zip, {
    modules:       [imageModule],
    paragraphLoop: true,
    linebreaks:    true,
    nullGetter:    () => '',
  });

  doc.render(data);

  // 4. Write filled .docx to a unique temp file
  const tmpDir  = os.tmpdir();
  const tmpBase = `stocksimple_report_${Date.now()}_${process.pid}`;
  const tmpDocx = path.join(tmpDir, `${tmpBase}.docx`);
  const tmpPdf  = path.join(tmpDir, `${tmpBase}.pdf`);

  const buffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(tmpDocx, buffer);

  try {
    // 5. Convert to PDF with LibreOffice (headless)
    await execAsync(
      `libreoffice --headless --convert-to pdf --outdir "${tmpDir}" "${tmpDocx}"`,
      { timeout: 30_000 }
    );

    // 6. Read and return the PDF
    const pdfBuffer = fs.readFileSync(tmpPdf);
    return pdfBuffer;
  } finally {
    // 7. Cleanup temp files regardless of success/failure
    try { fs.unlinkSync(tmpDocx); } catch (_) {}
    try { fs.unlinkSync(tmpPdf);  } catch (_) {}
  }
}

/**
 * Builds the template data object from a job report query result.
 *
 * Available template variables:
 *
 *   TEXT VARIABLES
 *   {job_id}             Job ID
 *   {job_title}          Job title
 *   {job_description}    Job description
 *   {job_status}         Job status (uppercase)
 *   {job_date}           Scheduled date (dd/MM/yyyy) or empty
 *   {client_name}        Client name
 *   {client_address}     Client address
 *   {client_phone}       Client phone
 *   {client_email}       Client email
 *   {technician}         Assigned technician name
 *   {company_name}       Company name
 *   {report_date}        Today's date (dd/MM/yyyy)
 *
 *   MATERIALS LOOP
 *   {#movements}
 *     {sku}              Product SKU
 *     {product_name}     Product name
 *     {quantity}         Quantity used
 *     {unit}             Unit (pz, m, kg, …)
 *     {mov_notes}        Movement notes
 *   {/movements}
 *
 *   IMAGE VARIABLES
 *   {%signature}         Customer signature (image)
 *
 *   PHOTO LOOPS
 *   {#problem_photos}{%photo}{/problem_photos}  — before (problem) photos
 *   {#repair_photos}{%photo}{/repair_photos}    — after (repair) photos
 *
 * @param {Object}   job           Row from the jobs query (with client_* fields)
 * @param {Object}   company       Row from the companies table
 * @param {Object[]} movements     Rows from the movements query
 * @param {Object[]} photos        Rows from the job_photos table
 * @param {string|null} signaturePath  Absolute path to the signature image (or null)
 * @returns {Object}
 */
function buildTemplateData(job, company, movements, photos, signaturePath) {
  const fmt = (isoDate) => {
    if (!isoDate) return '';
    return new Date(isoDate).toLocaleDateString('it-IT');
  };

  const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
  const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.mkv', '.3gp']);
  const isVideo = (url) => url && VIDEO_EXTS.has(path.extname(url).toLowerCase());

  // Return the absolute path string if the file exists, otherwise null.
  // The image module receives this string and calls fs.readFileSync() on it.
  // We must NOT pass a Buffer here: the module uses typeof === 'object' to
  // distinguish pre-resolved values from plain path strings, and Buffer IS an object.
  const resolveImgPath = (url) => {
    if (!url || isVideo(url)) return null;
    const filePath = path.join(uploadDir, path.basename(url));
    return fs.existsSync(filePath) ? filePath : null;
  };

  const problemPhotos = (photos || [])
    .filter(p => p.type === 'problem' && !isVideo(p.url))
    .map(p => ({ photo: resolveImgPath(p.url) }))
    .filter(p => p.photo !== null);

  const repairPhotos = (photos || [])
    .filter(p => p.type === 'repair' && !isVideo(p.url))
    .map(p => ({ photo: resolveImgPath(p.url) }))
    .filter(p => p.photo !== null);

  // null → the module's `if (!tagValue)` branch silently skips the placeholder
  const sigPath = signaturePath && fs.existsSync(signaturePath) ? signaturePath : null;

  return {
    // Text fields
    job_id:          String(job.id),
    job_title:       job.title          || '',
    job_description: job.description    || '',
    job_status:      job.status         ? job.status.toUpperCase() : '',
    job_date:        fmt(job.scheduled_date),
    client_name:     job.client_name    || '',
    client_address:  job.client_address || '',
    client_phone:    job.client_phone   || '',
    client_email:    job.client_email   || '',
    technician:      job.assigned_to_name || '',
    company_name:    company.name       || '',
    report_date:     new Date().toLocaleDateString('it-IT'),
    // Materials loop
    movements: (movements || []).map(m => ({
      sku:          m.sku          || '-',
      product_name: m.product_name || '',
      quantity:     String(m.quantity),
      unit:         m.unit         || 'pz',
      mov_notes:    m.notes        || '',
    })),
    // Image fields (absolute path strings — null = placeholder silently removed)
    signature:      sigPath,
    problem_photos: problemPhotos,
    repair_photos:  repairPhotos,
  };
}

module.exports = { renderDocxToPdf, buildTemplateData };
