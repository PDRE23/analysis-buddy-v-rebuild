/**
 * Chart generation for exports using HTML Canvas
 * Can be used to generate chart images for PDF/Excel exports
 */

import type { CashflowLine } from './pdf-export';

/**
 * Generate a simple cashflow bar chart as SVG
 * This can be embedded in PDFs or converted to images
 */
export function generateCashflowChartSVG(
  cashflow: CashflowLine[],
  width: number = 800,
  height: number = 400
): string {
  const padding = { top: 40, right: 40, bottom: 60, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find max value for scaling
  const maxValue = Math.max(...cashflow.map((line) => Math.abs(line.net_cash_flow)));
  const minValue = Math.min(...cashflow.map((line) => line.net_cash_flow), 0);

  // Calculate bar dimensions
  const barWidth = chartWidth / cashflow.length - 10;
  const scale = chartHeight / (maxValue - minValue);
  const zeroY = padding.top + (maxValue * scale);

  // Generate bars
  const bars = cashflow
    .map((line, index) => {
      const barHeight = Math.abs(line.net_cash_flow * scale);
      const x = padding.left + index * (chartWidth / cashflow.length) + 5;
      const y = line.net_cash_flow >= 0 ? zeroY - barHeight : zeroY;
      const fill = line.net_cash_flow >= 0 ? '#2563eb' : '#ef4444';

      return `
        <rect 
          x="${x}" 
          y="${y}" 
          width="${barWidth}" 
          height="${barHeight}" 
          fill="${fill}" 
          rx="2"
        />
        <text 
          x="${x + barWidth / 2}" 
          y="${height - padding.bottom + 20}" 
          text-anchor="middle" 
          font-size="12" 
          fill="#666"
        >
          YR ${line.year}
        </text>
        <text 
          x="${x + barWidth / 2}" 
          y="${y - 5}" 
          text-anchor="middle" 
          font-size="10" 
          fill="#333"
        >
          ${formatMoney(line.net_cash_flow)}
        </text>
      `;
    })
    .join('');

  // Generate Y-axis labels
  const yAxisLabels = [];
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const value = minValue + ((maxValue - minValue) * i) / steps;
    const y = padding.top + chartHeight - (value - minValue) * scale;
    yAxisLabels.push(`
      <text 
        x="${padding.left - 10}" 
        y="${y + 4}" 
        text-anchor="end" 
        font-size="12" 
        fill="#666"
      >
        ${formatMoney(value)}
      </text>
      <line 
        x1="${padding.left}" 
        y1="${y}" 
        x2="${width - padding.right}" 
        y2="${y}" 
        stroke="#e5e7eb" 
        stroke-width="1"
      />
    `);
  }

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#ffffff"/>
      
      <!-- Title -->
      <text 
        x="${width / 2}" 
        y="25" 
        text-anchor="middle" 
        font-size="18" 
        font-weight="bold" 
        fill="#111"
      >
        Annual Net Cash Flow
      </text>
      
      <!-- Y-axis -->
      <line 
        x1="${padding.left}" 
        y1="${padding.top}" 
        x2="${padding.left}" 
        y2="${height - padding.bottom}" 
        stroke="#333" 
        stroke-width="2"
      />
      
      <!-- X-axis -->
      <line 
        x1="${padding.left}" 
        y1="${height - padding.bottom}" 
        x2="${width - padding.right}" 
        y2="${height - padding.bottom}" 
        stroke="#333" 
        stroke-width="2"
      />
      
      <!-- Zero line (if applicable) -->
      ${
        minValue < 0
          ? `
      <line 
        x1="${padding.left}" 
        y1="${zeroY}" 
        x2="${width - padding.right}" 
        y2="${zeroY}" 
        stroke="#000" 
        stroke-width="1" 
        stroke-dasharray="5,5"
      />
      `
          : ''
      }
      
      <!-- Y-axis labels and grid -->
      ${yAxisLabels.join('')}
      
      <!-- Bars -->
      ${bars}
      
      <!-- X-axis label -->
      <text 
        x="${width / 2}" 
        y="${height - 10}" 
        text-anchor="middle" 
        font-size="14" 
        fill="#666"
      >
        Year
      </text>
      
      <!-- Y-axis label -->
      <text 
        x="20" 
        y="${height / 2}" 
        text-anchor="middle" 
        font-size="14" 
        fill="#666" 
        transform="rotate(-90, 20, ${height / 2})"
      >
        Net Cash Flow ($)
      </text>
    </svg>
  `;
}

/**
 * Generate metrics comparison chart as SVG
 */
export function generateMetricsComparisonSVG(
  proposals: Array<{
    label: string;
    effectiveRate: number;
    npv: number;
  }>,
  width: number = 800,
  height: number = 400
): string {
  const padding = { top: 60, right: 40, bottom: 80, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Normalize NPV and effective rate to 0-100 scale for visualization
  const maxNPV = Math.max(...proposals.map((p) => Math.abs(p.npv)));
  const maxRate = Math.max(...proposals.map((p) => p.effectiveRate));

  const barGroupWidth = chartWidth / proposals.length;
  const barWidth = (barGroupWidth - 20) / 2;

  const bars = proposals
    .map((proposal, index) => {
      const x = padding.left + index * barGroupWidth;

      // NPV bar (normalized)
      const npvHeight = (Math.abs(proposal.npv) / maxNPV) * chartHeight;
      const npvX = x + 5;
      const npvY = padding.top + chartHeight - npvHeight;

      // Rate bar (normalized)
      const rateHeight = (proposal.effectiveRate / maxRate) * chartHeight;
      const rateX = x + barWidth + 10;
      const rateY = padding.top + chartHeight - rateHeight;

      return `
        <!-- NPV Bar -->
        <rect 
          x="${npvX}" 
          y="${npvY}" 
          width="${barWidth}" 
          height="${npvHeight}" 
          fill="#2563eb" 
          rx="2"
        />
        <text 
          x="${npvX + barWidth / 2}" 
          y="${npvY - 5}" 
          text-anchor="middle" 
          font-size="9" 
          fill="#333"
        >
          ${formatMoney(proposal.npv)}
        </text>
        
        <!-- Rate Bar -->
        <rect 
          x="${rateX}" 
          y="${rateY}" 
          width="${barWidth}" 
          height="${rateHeight}" 
          fill="#10b981" 
          rx="2"
        />
        <text 
          x="${rateX + barWidth / 2}" 
          y="${rateY - 5}" 
          text-anchor="middle" 
          font-size="9" 
          fill="#333"
        >
          $${proposal.effectiveRate.toFixed(2)}
        </text>
        
        <!-- Label -->
        <text 
          x="${x + barGroupWidth / 2}" 
          y="${height - padding.bottom + 20}" 
          text-anchor="middle" 
          font-size="12" 
          fill="#666"
        >
          ${proposal.label}
        </text>
      `;
    })
    .join('');

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#ffffff"/>
      
      <!-- Title -->
      <text 
        x="${width / 2}" 
        y="25" 
        text-anchor="middle" 
        font-size="18" 
        font-weight="bold" 
        fill="#111"
      >
        Metrics Comparison
      </text>
      
      <!-- Legend -->
      <rect x="${width / 2 - 100}" y="35" width="15" height="15" fill="#2563eb" rx="2"/>
      <text x="${width / 2 - 78}" y="47" font-size="12" fill="#666">NPV</text>
      
      <rect x="${width / 2}" y="35" width="15" height="15" fill="#10b981" rx="2"/>
      <text x="${width / 2 + 22}" y="47" font-size="12" fill="#666">Effective Rate ($/SF/yr)</text>
      
      <!-- Y-axis -->
      <line 
        x1="${padding.left}" 
        y1="${padding.top}" 
        x2="${padding.left}" 
        y2="${height - padding.bottom}" 
        stroke="#333" 
        stroke-width="2"
      />
      
      <!-- X-axis -->
      <line 
        x1="${padding.left}" 
        y1="${height - padding.bottom}" 
        x2="${width - padding.right}" 
        y2="${height - padding.bottom}" 
        stroke="#333" 
        stroke-width="2"
      />
      
      <!-- Bars -->
      ${bars}
      
      <!-- Y-axis label -->
      <text 
        x="20" 
        y="${height / 2}" 
        text-anchor="middle" 
        font-size="14" 
        fill="#666" 
        transform="rotate(-90, 20, ${height / 2})"
      >
        Normalized Scale (0-100)
      </text>
    </svg>
  `;
}

/**
 * Convert SVG to data URL for embedding in PDF
 */
export function svgToDataURL(svg: string): string {
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Format currency helper
 */
function formatMoney(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  } else {
    return `$${value.toFixed(0)}`;
  }
}

/**
 * Chart configuration options
 */
export interface ChartConfig {
  width?: number;
  height?: number;
  title?: string;
  colors?: {
    positive?: string;
    negative?: string;
    primary?: string;
    secondary?: string;
  };
}

/**
 * Generate cashflow chart with custom configuration
 */
export function generateCustomCashflowChart(
  cashflow: CashflowLine[],
  config: ChartConfig = {}
): string {
  const width = config.width || 800;
  const height = config.height || 400;
  
  // Use custom colors if provided
  const svg = generateCashflowChartSVG(cashflow, width, height);
  
  if (config.colors) {
    return svg
      .replace(/#2563eb/g, config.colors.positive || '#2563eb')
      .replace(/#ef4444/g, config.colors.negative || '#ef4444');
  }
  
  return svg;
}

