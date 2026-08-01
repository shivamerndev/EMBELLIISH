/**
 * PDF rendering for the documents a client actually receives: the Step-6
 * proposal, the Step-7 quotation and the milestone invoices.
 *
 * Written directly against the PDF file format rather than through a rendering
 * library, because the alternative was a headless browser in the deployment for
 * the sake of four table layouts. The output is a real, standards-conforming PDF
 * (object table, xref, Helvetica base-14 fonts) that opens in any reader.
 *
 * Deliberately limited: WinAnsi text, rules and filled rectangles. No images and
 * no embedded fonts — a curtain proposal with photographs should be built from
 * the design renders in the media module, not stitched together here.
 */

const PAGE = { width: 595.28, height: 841.89 }; // A4 portrait, in points
const MARGIN = 42;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;

const FONT = {
  regular: 'F1', // Helvetica
  bold: 'F2', // Helvetica-Bold
  italic: 'F3', // Helvetica-Oblique
};

/* ------------------------------------------------------------------ escaping */

/** Latin-1 with the three PDF string metacharacters escaped. */
const pdfString = (value = '') =>
  String(value)
    .replace(/[\\()]/g, (char) => `\\${char}`)
    // Anything outside WinAnsi would corrupt the stream; ₹ has no Helvetica glyph.
    .replace(/₹/g, 'Rs. ')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');

/**
 * Helvetica advance widths, in 1/1000 em. The base-14 metrics are fixed by the
 * PDF spec, so text can be measured for wrapping and right-alignment without
 * loading a font file.
 */
const HELVETICA_WIDTHS = {
  ' ': 278, '!': 278, '"': 355, '#': 556, $: 556, '%': 889, '&': 667, "'": 191,
  '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
  0: 556, 1: 556, 2: 556, 3: 556, 4: 556, 5: 556, 6: 556, 7: 556, 8: 556, 9: 556,
  ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556, '@': 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500,
  K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611,
  U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  '[': 278, '\\': 278, ']': 278, '^': 469, _: 556, '`': 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222,
  k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278,
  u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  '{': 334, '|': 260, '}': 334, '~': 584,
};

const BOLD_EXTRA = 1.07; // Helvetica-Bold runs a little wider than the regular face

const textWidth = (text, size, bold = false) => {
  const raw = String(text || '')
    .split('')
    .reduce((sum, char) => sum + (HELVETICA_WIDTHS[char] ?? 556), 0);
  return (raw / 1000) * size * (bold ? BOLD_EXTRA : 1);
};

/** Greedy word wrap to a pixel width, splitting over-long words as a last resort. */
const wrapText = (text, size, maxWidth, bold = false) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];

  const lines = [];
  let line = '';

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, size, bold) <= maxWidth) {
      line = candidate;
      return;
    }
    if (line) lines.push(line);

    if (textWidth(word, size, bold) <= maxWidth) {
      line = word;
      return;
    }
    // A single word wider than the column — break it on character boundaries.
    let chunk = '';
    word.split('').forEach((char) => {
      if (textWidth(chunk + char, size, bold) > maxWidth) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk += char;
      }
    });
    line = chunk;
  });

  if (line) lines.push(line);
  return lines;
};

const truncate = (text, size, maxWidth, bold = false) => {
  if (textWidth(text, size, bold) <= maxWidth) return String(text || '');
  let out = '';
  for (const char of String(text || '')) {
    if (textWidth(`${out}${char}...`, size, bold) > maxWidth) break;
    out += char;
  }
  return `${out}...`;
};

/* ------------------------------------------------------------- content stream */

/**
 * Accumulates drawing operators for one document, breaking pages as the cursor
 * runs off the bottom. Coordinates are given top-down (`y` grows downward, which
 * is how anyone laying out a document thinks) and flipped on the way out.
 */
class PdfCanvas {
  constructor({ onNewPage } = {}) {
    this.pages = [];
    this.ops = [];
    this.y = MARGIN;
    this.onNewPage = onNewPage;
    this.pageNumber = 1;
  }

  /** Bottom margin is generous enough to keep the footer clear of content. */
  get maxY() {
    return PAGE.height - MARGIN - 24;
  }

  ensure(height) {
    if (this.y + height <= this.maxY) return;
    this.newPage();
  }

  newPage() {
    this.pages.push(this.ops.join('\n'));
    this.ops = [];
    this.pageNumber += 1;
    this.y = MARGIN;
    if (this.onNewPage) this.onNewPage(this);
  }

  finish() {
    this.pages.push(this.ops.join('\n'));
    return this.pages;
  }

  /** PDF origin is bottom-left; this converts a top-down y. */
  #flip(y) {
    return PAGE.height - y;
  }

  text(value, { x = MARGIN, size = 10, bold = false, italic = false, colour = [0.1, 0.1, 0.12], y } = {}) {
    const font = bold ? FONT.bold : italic ? FONT.italic : FONT.regular;
    const top = y ?? this.y;
    this.ops.push(
      `BT /${font} ${size} Tf ${colour.join(' ')} rg 1 0 0 1 ${x.toFixed(2)} ${(this.#flip(top) - size).toFixed(2)} Tm (${pdfString(value)}) Tj ET`
    );
    return this;
  }

  textRight(value, { right = PAGE.width - MARGIN, size = 10, bold = false, colour = [0.1, 0.1, 0.12], y } = {}) {
    return this.text(value, { x: right - textWidth(value, size, bold), size, bold, colour, y });
  }

  /** Wrapped paragraph. Advances the cursor by the height it consumed. */
  paragraph(value, { x = MARGIN, width = CONTENT_WIDTH, size = 10, bold = false, italic = false, leading, colour } = {}) {
    const step = leading ?? size * 1.45;
    wrapText(value, size, width, bold).forEach((line) => {
      this.ensure(step);
      this.text(line, { x, size, bold, italic, colour });
      this.y += step;
    });
    return this;
  }

  rect(x, y, width, height, colour = [0.93, 0.94, 0.96]) {
    this.ops.push(
      `${colour.join(' ')} rg ${x.toFixed(2)} ${(this.#flip(y) - height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`
    );
    return this;
  }

  line(x1, y1, x2, y2, { colour = [0.82, 0.84, 0.88], width = 0.6 } = {}) {
    this.ops.push(
      `${colour.join(' ')} RG ${width} w ${x1.toFixed(2)} ${this.#flip(y1).toFixed(2)} m ${x2.toFixed(2)} ${this.#flip(y2).toFixed(2)} l S`
    );
    return this;
  }

  gap(height = 10) {
    this.y += height;
    return this;
  }
}

/* -------------------------------------------------------------- table drawing */

/**
 * Draws a table, repeating the header whenever the rows spill onto a new page.
 *
 * @param {Array} columns  [{ label, width, align, bold }]
 * @param {Array} rows     arrays of cell values, or `{ cells, bold, fill }`
 */
const drawTable = (canvas, columns, rows, { size = 9, headerFill = [0.93, 0.94, 0.96], rowHeight = 18 } = {}) => {
  const drawHeader = () => {
    canvas.ensure(rowHeight);
    canvas.rect(MARGIN, canvas.y, CONTENT_WIDTH, rowHeight, headerFill);
    let x = MARGIN + 6;
    columns.forEach((column) => {
      const label = truncate(column.label, size, column.width - 12, true);
      if (column.align === 'right') {
        canvas.textRight(label, { right: x + column.width - 12, size, bold: true, y: canvas.y + 5 });
      } else {
        canvas.text(label, { x, size, bold: true, y: canvas.y + 5 });
      }
      x += column.width;
    });
    canvas.y += rowHeight;
  };

  drawHeader();
  let headerPage = canvas.pages.length;

  rows.forEach((row) => {
    const cells = Array.isArray(row) ? row : row.cells;
    const bold = !Array.isArray(row) && row.bold;

    canvas.ensure(rowHeight);
    // A page break under our feet leaves the column labels behind, so repeat them.
    if (canvas.pages.length > headerPage) {
      drawHeader();
      headerPage = canvas.pages.length;
    }

    if (!Array.isArray(row) && row.fill) {
      canvas.rect(MARGIN, canvas.y, CONTENT_WIDTH, rowHeight, row.fill);
    }

    let x = MARGIN + 6;
    columns.forEach((column, index) => {
      const value = cells[index] ?? '';
      const text = truncate(String(value), size, column.width - 12, bold);
      if (column.align === 'right') {
        canvas.textRight(text, { right: x + column.width - 12, size, bold, y: canvas.y + 5 });
      } else {
        canvas.text(text, { x, size, bold, y: canvas.y + 5 });
      }
      x += column.width;
    });

    canvas.line(MARGIN, canvas.y + rowHeight, PAGE.width - MARGIN, canvas.y + rowHeight);
    canvas.y += rowHeight;
  });

  return canvas;
};

/* ------------------------------------------------------------ document assembly */

/** Wraps the page streams in the object table, xref and trailer of a real PDF. */
const buildPdf = (pageStreams, { title = 'Document', author = 'Embellish' } = {}) => {
  const objects = [];
  const push = (body) => {
    objects.push(body);
    return objects.length; // 1-based object number
  };

  const fontRegular = push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBold = push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const fontItalic = push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>');

  const resources = `<< /Font << /${FONT.regular} ${fontRegular} 0 R /${FONT.bold} ${fontBold} 0 R /${FONT.italic} ${fontItalic} 0 R >> >>`;

  // Pages node is allocated first so page objects can point at it by number.
  const pagesObjectNumber = objects.length + 1;
  push('PLACEHOLDER_PAGES');

  const pageNumbers = [];
  pageStreams.forEach((stream) => {
    const contentNumber = push(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    pageNumbers.push(
      push(
        `<< /Type /Page /Parent ${pagesObjectNumber} 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources ${resources} /Contents ${contentNumber} 0 R >>`
      )
    );
  });

  objects[pagesObjectNumber - 1] =
    `<< /Type /Pages /Count ${pageNumbers.length} /Kids [${pageNumbers.map((n) => `${n} 0 R`).join(' ')}] >>`;

  const infoNumber = push(
    `<< /Title (${pdfString(title)}) /Author (${pdfString(author)}) /Producer (Embellish ERP) >>`
  );
  const catalogNumber = push(`<< /Type /Catalog /Pages ${pagesObjectNumber} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogNumber} 0 R /Info ${infoNumber} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
};

/* ---------------------------------------------------------------- formatting */

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const addressLine = (address = {}) =>
  [address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(', ');

/* ------------------------------------------------------------------ documents */

/** Letterhead, repeated on every page. */
const header = (canvas, company, documentTitle, code) => {
  canvas.rect(0, 0, PAGE.width, 76, [0.07, 0.09, 0.13]);
  canvas.text(company.name || 'Embellish', { x: MARGIN, y: 22, size: 18, bold: true, colour: [1, 1, 1] });
  canvas.text('Luxury Curtains  |  Blinds  |  Wallpapers  |  Interior Furnishing', {
    x: MARGIN,
    y: 46,
    size: 8,
    colour: [0.72, 0.76, 0.84],
  });
  canvas.textRight(documentTitle.toUpperCase(), { y: 22, size: 13, bold: true, colour: [1, 1, 1] });
  if (code) canvas.textRight(code, { y: 44, size: 9, colour: [0.72, 0.76, 0.84] });
  canvas.y = 100;
};

const footer = (canvas, company) => {
  const y = PAGE.height - MARGIN + 6;
  canvas.line(MARGIN, y - 12, PAGE.width - MARGIN, y - 12);
  const bits = [company.phone, company.email, company.website, company.gstin && `GSTIN ${company.gstin}`]
    .filter(Boolean)
    .join('   |   ');
  canvas.text(bits || 'Embellish', { x: MARGIN, y, size: 7.5, colour: [0.45, 0.48, 0.55] });
};

/** Two-column "from / to" block. */
const partyBlock = (canvas, company, client, project, meta = []) => {
  const columnWidth = CONTENT_WIDTH / 2 - 10;
  const top = canvas.y;

  canvas.text('FROM', { size: 8, bold: true, colour: [0.45, 0.48, 0.55] });
  canvas.y += 14;
  canvas.paragraph(company.legalName || company.name || 'Embellish', { size: 10, bold: true, width: columnWidth });
  const companyAddress = addressLine(company.address);
  if (companyAddress) canvas.paragraph(companyAddress, { size: 8.5, width: columnWidth, colour: [0.35, 0.38, 0.45] });
  if (company.gstin) canvas.paragraph(`GSTIN: ${company.gstin}`, { size: 8.5, width: columnWidth, colour: [0.35, 0.38, 0.45] });

  const leftBottom = canvas.y;

  canvas.y = top;
  const rightX = MARGIN + CONTENT_WIDTH / 2 + 10;
  canvas.text('FOR', { x: rightX, size: 8, bold: true, colour: [0.45, 0.48, 0.55] });
  canvas.y += 14;
  canvas.paragraph(client?.name || 'Client', { x: rightX, size: 10, bold: true, width: columnWidth });
  const siteAddress = addressLine(project?.siteAddress) || addressLine(client?.address);
  if (siteAddress) canvas.paragraph(siteAddress, { x: rightX, size: 8.5, width: columnWidth, colour: [0.35, 0.38, 0.45] });
  if (client?.phone) canvas.paragraph(client.phone, { x: rightX, size: 8.5, width: columnWidth, colour: [0.35, 0.38, 0.45] });

  canvas.y = Math.max(leftBottom, canvas.y) + 8;

  meta.filter(Boolean).forEach(([label, value]) => {
    canvas.ensure(14);
    canvas.text(`${label}:`, { size: 8.5, bold: true, colour: [0.45, 0.48, 0.55] });
    canvas.text(String(value), { x: MARGIN + 96, size: 8.5 });
    canvas.y += 13;
  });

  canvas.gap(10);
};

const totalsBlock = (canvas, rows) => {
  const boxWidth = 230;
  const x = PAGE.width - MARGIN - boxWidth;

  rows.forEach(([label, value, emphasis]) => {
    canvas.ensure(emphasis ? 24 : 17);
    if (emphasis) canvas.rect(x, canvas.y, boxWidth, 22, [0.07, 0.09, 0.13]);
    canvas.text(label, {
      x: x + 10,
      size: emphasis ? 10 : 9,
      bold: emphasis,
      colour: emphasis ? [1, 1, 1] : [0.35, 0.38, 0.45],
      y: canvas.y + (emphasis ? 6 : 3),
    });
    canvas.textRight(value, {
      right: x + boxWidth - 10,
      size: emphasis ? 10 : 9,
      bold: true,
      colour: emphasis ? [1, 1, 1] : [0.1, 0.1, 0.12],
      y: canvas.y + (emphasis ? 6 : 3),
    });
    canvas.y += emphasis ? 24 : 17;
  });
};

/**
 * Step 7 — the quotation the client signs against.
 *
 * @param {object} payload { quotation, project, client, company }
 */
const renderQuotation = ({ quotation, project, client, company = {} }) => {
  const canvas = new PdfCanvas({
    onNewPage: (c) => header(c, company, 'Quotation', quotation.code),
  });

  header(canvas, company, 'Quotation', quotation.code);

  partyBlock(canvas, company, client, project, [
    ['Project', `${project?.name || ''} (${project?.code || ''})`],
    ['Date', shortDate(quotation.createdAt)],
    quotation.validUntil && ['Valid until', shortDate(quotation.validUntil)],
    ['Revision', String(quotation.revision ?? 1)],
  ]);

  drawTable(
    canvas,
    [
      { label: '#', width: 26 },
      { label: 'Particular', width: 205 },
      { label: 'Qty', width: 62, align: 'right' },
      { label: 'Unit', width: 44 },
      { label: 'Rate', width: 84, align: 'right' },
      { label: 'Amount', width: 90, align: 'right' },
    ],
    (quotation.lines || []).map((line, index) => [
      String(index + 1),
      line.particular,
      Number(line.quantity || 0).toFixed(2),
      line.unit || '',
      money(line.rate),
      money(line.amount),
    ])
  );

  canvas.gap(12);

  totalsBlock(canvas, [
    ['Subtotal', money(quotation.subtotal)],
    quotation.discountAmount > 0 && [`Discount (${quotation.discountPercent}%)`, `- ${money(quotation.discountAmount)}`],
    ['Taxable value', money(quotation.taxableAmount)],
    [`GST @ ${quotation.gstPercent}%`, money(quotation.gstAmount)],
    ['Grand total', money(quotation.grandTotal), true],
  ].filter(Boolean));

  canvas.gap(18);

  const terms = quotation.paymentTerms || {};
  canvas.text('PAYMENT SCHEDULE', { size: 8.5, bold: true, colour: [0.45, 0.48, 0.55] });
  canvas.y += 16;
  drawTable(
    canvas,
    [
      { label: 'Milestone', width: 200 },
      { label: 'Share', width: 100, align: 'right' },
      { label: 'Amount', width: 211, align: 'right' },
    ],
    [
      ['Token — on order confirmation', `${terms.tokenPercent ?? 10}%`, money((quotation.grandTotal * (terms.tokenPercent ?? 10)) / 100)],
      ['Advance — before production', `${terms.advancePercent ?? 60}%`, money((quotation.grandTotal * (terms.advancePercent ?? 60)) / 100)],
      ['Balance — before installation', `${terms.balancePercent ?? 30}%`, money((quotation.grandTotal * (terms.balancePercent ?? 30)) / 100)],
    ]
  );

  const termsText = quotation.termsAndConditions || company.termsAndConditions;
  if (termsText) {
    canvas.gap(16);
    canvas.text('TERMS & CONDITIONS', { size: 8.5, bold: true, colour: [0.45, 0.48, 0.55] });
    canvas.y += 14;
    canvas.paragraph(termsText, { size: 8.5, colour: [0.35, 0.38, 0.45] });
  }

  if (quotation.notes) {
    canvas.gap(10);
    canvas.paragraph(quotation.notes, { size: 8.5, italic: true, colour: [0.35, 0.38, 0.45] });
  }

  const pages = canvas.finish();
  // The footer is drawn per page after layout, so it sits at a fixed height.
  const stamped = pages.map((stream) => {
    const c = new PdfCanvas();
    c.ops = [stream];
    footer(c, company);
    return c.ops.join('\n');
  });

  return buildPdf(stamped, { title: `Quotation ${quotation.code}`, author: company.name });
};

/**
 * Step 6 — the proposal: what the client is getting, room by room, before the
 * priced quotation lands. Design selections and the estimate, not a line-item bill.
 */
const renderProposal = ({ project, client, company = {}, designs = [], rooms = [], boq, estimate }) => {
  const canvas = new PdfCanvas({
    onNewPage: (c) => header(c, company, 'Proposal', project?.code),
  });

  header(canvas, company, 'Proposal', project?.code);

  partyBlock(canvas, company, client, project, [
    ['Project', project?.name || ''],
    ['Date', shortDate(new Date())],
    project?.projectType && ['Property', project.projectType],
  ]);

  canvas.paragraph(
    'Thank you for the opportunity. The scheme below sets out the treatment proposed for each area, the fabrics and hardware selected, and the estimated investment. Quantities are drawn from the measured survey of your site.',
    { size: 9.5, colour: [0.35, 0.38, 0.45] }
  );
  canvas.gap(14);

  if (designs.length) {
    canvas.text('THE SCHEME', { size: 8.5, bold: true, colour: [0.45, 0.48, 0.55] });
    canvas.y += 16;

    designs.forEach((design) => {
      canvas.ensure(56);
      canvas.rect(MARGIN, canvas.y, CONTENT_WIDTH, 1, [0.88, 0.9, 0.93]);
      canvas.y += 8;
      canvas.text(design.roomName || design.title || 'Area', { size: 10.5, bold: true });
      canvas.y += 15;

      const detail = [
        design.fabricName && `Fabric: ${design.fabricName}`,
        design.colourScheme && `Colour: ${design.colourScheme}`,
        design.trackType && `Track: ${design.trackType}`,
        design.motorised ? 'Motorised operation' : null,
        design.tieback && `Tieback: ${design.tieback}`,
      ]
        .filter(Boolean)
        .join('   •   ');

      if (detail) canvas.paragraph(detail, { size: 9, colour: [0.35, 0.38, 0.45] });
      if (design.description) canvas.paragraph(design.description, { size: 8.5, colour: [0.45, 0.48, 0.55] });
      canvas.gap(8);
    });

    canvas.gap(8);
  }

  if (boq?.roomTotals?.length) {
    canvas.ensure(80);
    canvas.text('SCOPE BY AREA', { size: 8.5, bold: true, colour: [0.45, 0.48, 0.55] });
    canvas.y += 16;

    drawTable(
      canvas,
      [
        { label: 'Area', width: 190 },
        { label: 'Running ft', width: 82, align: 'right' },
        { label: 'Fabric (m)', width: 82, align: 'right' },
        { label: 'Blinds (sqft)', width: 82, align: 'right' },
        { label: 'Motors', width: 75, align: 'right' },
      ],
      [
        ...boq.roomTotals.map((room) => [
          room.roomName || 'Area',
          Number(room.totals?.rnft || 0).toFixed(2),
          Number(room.totals?.fabricMeters || 0).toFixed(2),
          Number(room.totals?.romanSqft || 0).toFixed(2),
          String(room.totals?.motorQty || 0),
        ]),
        {
          cells: [
            'Total',
            Number(boq.totals?.rnft || 0).toFixed(2),
            Number(boq.totals?.fabricMeters || 0).toFixed(2),
            Number(boq.totals?.romanSqft || 0).toFixed(2),
            String(boq.totals?.motorQty || 0),
          ],
          bold: true,
          fill: [0.95, 0.96, 0.97],
        },
      ]
    );
    canvas.gap(16);
  }

  if (estimate > 0) {
    totalsBlock(canvas, [['Estimated investment (incl. GST)', money(estimate), true]]);
    canvas.gap(8);
    canvas.paragraph(
      'This is an indicative estimate based on the measured survey. A detailed quotation follows once fabric and hardware selections are confirmed.',
      { size: 8, italic: true, colour: [0.45, 0.48, 0.55] }
    );
  }

  const pages = canvas.finish();
  const stamped = pages.map((stream) => {
    const c = new PdfCanvas();
    c.ops = [stream];
    footer(c, company);
    return c.ops.join('\n');
  });

  return buildPdf(stamped, { title: `Proposal ${project?.code || ''}`, author: company.name });
};

/** Steps 9, 10 and 18 — the milestone demand accounts chase. */
const renderInvoice = ({ invoice, project, client, company = {} }) => {
  const label = invoice.type === 'PROFORMA' ? 'Proforma Invoice' : 'Tax Invoice';
  const canvas = new PdfCanvas({ onNewPage: (c) => header(c, company, label, invoice.code) });

  header(canvas, company, label, invoice.code);

  partyBlock(canvas, company, client, project, [
    ['Project', `${project?.name || ''} (${project?.code || ''})`],
    ['Milestone', invoice.milestone || '—'],
    ['Issued', shortDate(invoice.createdAt)],
    invoice.dueDate && ['Due', shortDate(invoice.dueDate)],
  ]);

  drawTable(
    canvas,
    [
      { label: '#', width: 26 },
      { label: 'Particular', width: 265 },
      { label: 'Qty', width: 60, align: 'right' },
      { label: 'Rate', width: 80, align: 'right' },
      { label: 'Amount', width: 80, align: 'right' },
    ],
    (invoice.lines || []).map((line, index) => [
      String(index + 1),
      line.particular,
      Number(line.quantity || 0).toFixed(2),
      money(line.rate),
      money(line.amount),
    ])
  );

  canvas.gap(12);
  totalsBlock(canvas, [
    ['Subtotal', money(invoice.subtotal)],
    invoice.gstAmount > 0 && [`GST @ ${invoice.gstPercent}%`, money(invoice.gstAmount)],
    ['Total payable', money(invoice.total), true],
    invoice.amountPaid > 0 && ['Received', money(invoice.amountPaid)],
    invoice.amountPaid > 0 && ['Balance', money((invoice.total || 0) - (invoice.amountPaid || 0))],
  ].filter(Boolean));

  if (company.bankName) {
    canvas.gap(18);
    canvas.text('BANK DETAILS', { size: 8.5, bold: true, colour: [0.45, 0.48, 0.55] });
    canvas.y += 14;
    canvas.paragraph(
      [company.bankName, company.bankAccount && `A/c ${company.bankAccount}`, company.bankIfsc && `IFSC ${company.bankIfsc}`]
        .filter(Boolean)
        .join('   •   '),
      { size: 9, colour: [0.35, 0.38, 0.45] }
    );
  }

  const pages = canvas.finish();
  const stamped = pages.map((stream) => {
    const c = new PdfCanvas();
    c.ops = [stream];
    footer(c, company);
    return c.ops.join('\n');
  });

  return buildPdf(stamped, { title: `${label} ${invoice.code}`, author: company.name });
};

const RENDERERS = {
  quotation: renderQuotation,
  proposal: renderProposal,
  invoice: renderInvoice,
};

const pdfService = {
  /**
   * @param {'quotation'|'proposal'|'invoice'} documentType
   * @param {object} payload
   * @returns {Buffer} a complete PDF file
   */
  async render(documentType, payload = {}) {
    const renderer = RENDERERS[documentType];
    if (!renderer) {
      throw new Error(
        `Unknown document type "${documentType}". Known types: ${Object.keys(RENDERERS).join(', ')}.`
      );
    }
    return renderer(payload);
  },
};

export default pdfService;
export { renderQuotation, renderProposal, renderInvoice, buildPdf, PdfCanvas, drawTable, textWidth, wrapText };
