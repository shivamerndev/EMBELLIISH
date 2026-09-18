/**
 * quotationPrintService.js
 * Utility for printing Quotation documents in an isolated, clean iframe.
 * Ensures only the quotation pages (Page 1 Cover, Page 2 BOQ Table, Page 3 Terms & Banking)
 * are printed without any modal wrappers, backdrops, buttons, or parent scrollbars.
 */

const escapeHtml = (str) => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const printQuotationElement = (element, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!element) {
      console.warn('[QuotationPrint] No element provided for printing.');
      window.print();
      return resolve(false);
    }

    try {
      const title = options.title || 'Quotation';
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-9999';
      iframe.setAttribute('title', title);

      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(iframe);
        window.print();
        return resolve(false);
      }

      // Collect all stylesheets and style tags from the current document
      const parentStyles = Array.from(
        document.querySelectorAll('link[rel="stylesheet"], style')
      )
        .map((el) => el.outerHTML)
        .join('\n');

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
  ${parentStyles}
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      background: #ffffff !important;
      color: #0f172a !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .quotation-print-container {
      background: #ffffff !important;
      color: #0f172a !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .quotation-page {
      box-shadow: none !important;
      border: none !important;
      margin: 0 auto !important;
      width: 100% !important;
      max-width: 100% !important;
      min-height: 265mm !important;
      height: auto !important;
      padding: 0 !important;
      page-break-after: always !important;
      break-after: page !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      box-sizing: border-box !important;
    }
    .quotation-page:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .table-quote {
      width: 100% !important;
      border-collapse: collapse !important;
    }
    .table-quote th, .table-quote td {
      border: 1px solid #111 !important;
      padding: 3px 6px !important;
      font-size: 10.5px !important;
      line-height: 1.25 !important;
    }
    .table-quote th {
      background-color: #f8fafc !important;
      font-weight: 700 !important;
      text-align: center !important;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .no-print {
      display: none !important;
    }
  </style>
</head>
<body class="bg-white text-slate-900 font-serif">
  ${element.innerHTML}
</body>
</html>`;

      doc.open();
      doc.write(html);
      doc.close();

      const cleanup = () => {
        try {
          if (iframe && iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        } catch (e) {
          // ignore cleanup errors
        }
      };

      iframe.contentWindow?.addEventListener('afterprint', cleanup);

      const triggerPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (printErr) {
          console.error('[QuotationPrint] Iframe print error:', printErr);
          window.print();
          resolve(false);
        } finally {
          setTimeout(cleanup, 12000);
        }
      };

      if (doc.fonts?.ready) {
        doc.fonts.ready
          .then(() => {
            setTimeout(triggerPrint, 150);
          })
          .catch(() => {
            setTimeout(triggerPrint, 350);
          });
      } else {
        setTimeout(triggerPrint, 350);
      }
    } catch (err) {
      console.error('[QuotationPrint] Failed to print via iframe:', err);
      window.print();
      reject(err);
    }
  });
};
