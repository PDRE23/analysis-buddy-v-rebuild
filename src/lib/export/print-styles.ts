/**
 * Print-optimized styles and utilities
 */

/**
 * CSS styles for print optimization
 */
export const PRINT_STYLES = `
@media print {
  /* Hide non-essential UI elements */
  button,
  .no-print,
  nav,
  header > button,
  .print-hide {
    display: none !important;
  }
  
  /* Reset page margins */
  @page {
    margin: 0.5in;
    size: letter portrait;
  }
  
  /* Optimize layout */
  body {
    font-size: 11pt;
    line-height: 1.4;
    color: #000;
    background: white;
  }
  
  /* Prevent page breaks inside elements */
  .print-avoid-break,
  table,
  .card,
  section {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  /* Force page breaks */
  .print-page-break {
    page-break-before: always;
    break-before: page;
  }
  
  /* Table optimizations */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.5em 0;
  }
  
  table thead {
    display: table-header-group;
  }
  
  table tbody {
    display: table-row-group;
  }
  
  th, td {
    padding: 8px;
    border: 1px solid #ddd;
    text-align: left;
  }
  
  th {
    background-color: #f5f5f5 !important;
    font-weight: bold;
  }
  
  /* Headers and footers */
  h1, h2, h3 {
    page-break-after: avoid;
    break-after: avoid;
    margin-top: 0.5em;
    margin-bottom: 0.3em;
  }
  
  h1 {
    font-size: 24pt;
    border-bottom: 2px solid #333;
    padding-bottom: 0.2em;
  }
  
  h2 {
    font-size: 18pt;
    border-bottom: 1px solid #666;
    padding-bottom: 0.15em;
  }
  
  h3 {
    font-size: 14pt;
  }
  
  /* Remove shadows and rounded corners */
  * {
    box-shadow: none !important;
    border-radius: 0 !important;
  }
  
  /* Optimize colors for black and white printing */
  .badge,
  .chip,
  .tag {
    background-color: #f0f0f0 !important;
    border: 1px solid #999 !important;
    color: #000 !important;
  }
  
  /* Charts and images */
  svg, img {
    max-width: 100%;
    height: auto;
    page-break-inside: avoid;
  }
  
  /* Links */
  a {
    color: #000;
    text-decoration: underline;
  }
  
  a[href]:after {
    content: " (" attr(href) ")";
    font-size: 0.8em;
  }
  
  /* Card components */
  .card {
    border: 1px solid #ccc;
    padding: 1em;
    margin: 0.5em 0;
  }
  
  /* Grid layouts */
  .grid {
    display: block;
  }
  
  .grid > * {
    margin-bottom: 1em;
  }
  
  /* Metrics and KPIs */
  .kpi,
  .metric {
    border: 1px solid #ddd;
    padding: 0.5em;
    margin: 0.3em 0;
  }
  
  .kpi-value,
  .metric-value {
    font-size: 18pt;
    font-weight: bold;
  }
  
  /* Notes and comments */
  .notes,
  .comments {
    border-left: 3px solid #666;
    padding-left: 1em;
    margin: 1em 0;
  }
}
`;

/**
 * Create and inject print styles into document
 */
export function injectPrintStyles(): void {
  if (typeof document === 'undefined') return;
  
  const existingStyle = document.getElementById('print-styles');
  if (existingStyle) return;
  
  const style = document.createElement('style');
  style.id = 'print-styles';
  style.textContent = PRINT_STYLES;
  document.head.appendChild(style);
}

/**
 * Print configuration options
 */
export interface PrintConfig {
  title?: string;
  orientation?: 'portrait' | 'landscape';
  margins?: string;
}

/**
 * Open print dialog with custom configuration
 */
export function openPrintDialog(config?: PrintConfig): void {
  if (typeof window === 'undefined') return;
  
  // Set document title for print
  const originalTitle = document.title;
  if (config?.title) {
    document.title = config.title;
  }
  
  // Inject print styles if not already present
  injectPrintStyles();
  
  // Add print-specific class to body
  document.body.classList.add('printing');
  
  // Open print dialog
  window.print();
  
  // Restore original title and remove print class
  setTimeout(() => {
    document.title = originalTitle;
    document.body.classList.remove('printing');
  }, 100);
}

/**
 * Generate print-friendly HTML for export
 */
export function generatePrintHTML(
  content: string,
  title: string,
  styles?: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    ${PRINT_STYLES}
    ${styles || ''}
  </style>
</head>
<body>
  <div class="print-container">
    ${content}
  </div>
</body>
</html>
  `.trim();
}

