# 📄 Export Features Documentation

## Overview

Analysis Buddy V2 now includes comprehensive export capabilities for lease analysis data. You can export individual analyses or compare multiple proposals in **PDF**, **Excel**, or **Print** formats.

---

## ✨ Features Implemented

### 1. **PDF Export** ✅
Professional PDF reports with:
- **Property Summary**: Tenant, market, RSF, lease type, dates
- **Key Financial Metrics**: Effective rate, NPV, TI allowance, concessions
- **Rent Schedule**: Period-by-period breakdown with rates and free rent
- **Annual Cashflow**: Year-over-year cash flow analysis with totals
- **Notes**: Custom notes and comments
- **Professional Formatting**: Headers, footers, page numbers, and branding

### 2. **Excel Export** ✅
Multi-sheet Excel workbooks with:
- **Summary Sheet**: Overview of property and deal terms
- **Metrics Sheet**: Key financial metrics with formulas
- **Rent Schedule Sheet**: Editable rent schedule with calculations
- **Cashflow Sheet**: Annual cashflow breakdown with totals
- **Professional Styling**: Color-coded sheets, conditional formatting, frozen headers
- **Editable Formulas**: Clients can modify and recalculate

### 3. **Print Optimization** ✅
Clean, browser-optimized print layouts:
- **Print Styles**: CSS media queries for clean printing
- **Page Break Control**: Intelligent page breaks to avoid splitting sections
- **Hidden UI Elements**: Buttons and navigation hidden during print
- **Professional Layout**: Optimized margins, fonts, and spacing

### 4. **Comparison Export** ✅
Side-by-side proposal comparison:
- **PDF Comparison**: Landscape format with side-by-side metrics
- **Excel Comparison**: Multi-proposal workbook with comparison sheet
- **Visual Comparison**: Easy-to-read tables comparing all key metrics
- **Cashflow Comparison**: Year-by-year comparison of multiple proposals

### 5. **Chart Generation** ✅
Professional chart visualization:
- **Cashflow Charts**: Bar charts showing annual net cash flow
- **Metrics Comparison**: Visual comparison of key metrics
- **SVG Format**: Scalable, high-quality charts
- **Customizable**: Colors, dimensions, and styling options

### 6. **Export Configuration UI** ✅
User-friendly export dialog with:
- **Section Selection**: Choose which sections to include
- **Page Format**: Letter, A4, or Legal paper sizes
- **Orientation**: Portrait or landscape
- **Live Preview**: See export settings before generating
- **Success Feedback**: Confirmation messages after export

---

## 🚀 How to Use

### **Export a Single Analysis**

1. Open any proposal in the Workspace view
2. Click the **"Export"** button in the top-right corner
3. Choose which sections to include:
   - ✓ Property Summary
   - ✓ Financial Metrics
   - ✓ Rent Schedule
   - ✓ Cashflow Analysis
   - ✓ Charts & Graphs
   - ✓ Notes
4. Select page format and orientation (PDF only)
5. Click **PDF**, **Excel**, or **Print**

### **Export Format Options**

#### **PDF Export**
- Best for: Presentations, client deliverables, archival
- Format: Professionally formatted PDF with tables and charts
- Filename: `{Analysis_Name}_pdf_{Date}.pdf`

#### **Excel Export**
- Best for: Data analysis, client editing, financial modeling
- Format: Multi-sheet Excel workbook (.xlsx)
- Filename: `{Analysis_Name}_excel_{Date}.xlsx`
- Features: Editable cells, formulas preserved, color-coded sheets

#### **Print**
- Best for: Quick hard copies, internal review
- Opens browser print dialog
- Clean, optimized layout

---

## 📦 Technical Implementation

### **File Structure**

```
src/lib/export/
├── types.ts                    # TypeScript interfaces and types
├── pdf-export.ts              # PDF generation with jsPDF
├── excel-export.ts            # Excel generation with ExcelJS
├── print-styles.ts            # Print CSS optimization
├── comparison-export.ts       # Multi-proposal comparison
├── chart-generator.ts         # SVG chart generation
└── index.ts                   # Main export module

src/components/export/
└── ExportDialog.tsx           # Export configuration UI
```

### **Dependencies**

```json
{
  "jspdf": "^3.0.3",           // PDF generation
  "jspdf-autotable": "^5.0.2",  // PDF table generation
  "exceljs": "^4.4.0",          // Excel workbook creation
  "recharts": "^3.2.1"          // Chart generation (optional)
}
```

### **Key Functions**

```typescript
// Export single analysis
await exportAnalysis(
  'pdf' | 'excel' | 'print',
  analysis,
  cashflow,
  metrics,
  config,
  proposalInfo
);

// Export comparison
await exportComparison(
  'pdf' | 'excel',
  proposals,
  config
);

// Generate charts
const chartSVG = generateCashflowChartSVG(cashflow);
const comparisonSVG = generateMetricsComparisonSVG(proposals);
```

---

## 🎨 Customization

### **Branding Configuration**

You can customize exports with company branding:

```typescript
const brandingConfig: BrandingConfig = {
  companyName: 'Your Company Name',
  logo: 'base64_or_url',
  primaryColor: '#2563eb',
  secondaryColor: '#64748b',
  footer: 'Confidential - Your Company © 2025'
};
```

### **Export Configuration**

Customize what to include:

```typescript
const exportConfig: ExportConfig = {
  includeSummary: true,
  includeRentSchedule: true,
  includeCashflow: true,
  includeMetrics: true,
  includeCharts: true,
  includeNotes: true,
  format: 'letter',           // 'letter' | 'a4' | 'legal'
  orientation: 'portrait',    // 'portrait' | 'landscape'
  branding: brandingConfig
};
```

---

## 🔧 Advanced Usage

### **Quick Export Functions**

For rapid exports with default settings:

```typescript
// Quick PDF export
await quickExport.toPDF(analysis, cashflow, metrics);

// Quick Excel export
await quickExport.toExcel(analysis, cashflow, metrics);

// Quick print
quickExport.print(analysis);
```

### **Custom Chart Generation**

Generate custom charts with specific dimensions and colors:

```typescript
const chartConfig: ChartConfig = {
  width: 1000,
  height: 500,
  colors: {
    positive: '#10b981',
    negative: '#ef4444',
    primary: '#2563eb',
    secondary: '#64748b'
  }
};

const customChart = generateCustomCashflowChart(
  cashflow,
  chartConfig
);
```

---

## 📊 Export Examples

### **PDF Export Contents**

1. **Header**: Company name, report date
2. **Title**: Analysis name and proposal info
3. **Property Summary Table**:
   - Tenant, Market, RSF
   - Lease type, Status
   - Key dates (Commencement, Expiration)
4. **Financial Metrics**:
   - Effective Rate ($/SF/yr)
   - Net Present Value
   - TI Allowance, Moving Allowance
5. **Rent Schedule**:
   - Period start/end dates
   - Rent rates and frequency
   - Free rent months
6. **Annual Cashflow Table**:
   - Base rent, Operating, Parking
   - Abatement credits
   - Net cash flow with totals
7. **Notes**: Custom analysis notes
8. **Footer**: Page numbers, company info

### **Excel Export Structure**

- **Sheet 1 - Summary**: Property overview and key metrics
- **Sheet 2 - Metrics**: Detailed financial calculations
- **Sheet 3 - Rent Schedule**: Editable rent periods
- **Sheet 4 - Cashflow**: Annual breakdown with formulas

---

## 🐛 Troubleshooting

### **Common Issues**

**Issue**: Export button doesn't work
- **Solution**: Check browser console for errors, ensure all data is valid

**Issue**: PDF shows "Failed to export"
- **Solution**: Verify all required fields are filled, check cashflow data

**Issue**: Excel file won't open
- **Solution**: Ensure ExcelJS package is installed, check file permissions

**Issue**: Print preview looks wrong
- **Solution**: Use the Export dialog's Print option for optimized layouts

---

## 🎯 Best Practices

1. **Complete Data**: Fill all required fields before exporting
2. **Review Before Export**: Use the export dialog to configure settings
3. **Naming Convention**: Files are auto-named with dates for easy tracking
4. **Format Selection**: 
   - PDF for presentations and clients
   - Excel for editable analysis
   - Print for quick internal reviews
5. **Comparison Reports**: Export multiple proposals together for easy comparison

---

## 🚦 Future Enhancements

Potential additions for future versions:

- [ ] Custom templates for different client types
- [ ] Email integration for direct sharing
- [ ] Cloud storage integration (Google Drive, Dropbox)
- [ ] Scheduled exports and auto-delivery
- [ ] Interactive PDF forms
- [ ] PowerPoint export
- [ ] Custom chart types (line, pie, area)
- [ ] Watermarking for draft versions
- [ ] Digital signatures
- [ ] Export history and versioning

---

## 📝 Change Log

### Version 1.0.0 (January 2025)
- ✅ Initial PDF export implementation
- ✅ Excel export with multi-sheet support
- ✅ Print optimization with CSS media queries
- ✅ Comparison PDF for multiple proposals
- ✅ Chart generation (cashflow, metrics)
- ✅ Export configuration UI

---

## 💡 Tips & Tricks

1. **Batch Export**: Export multiple analyses by opening each proposal
2. **Custom Branding**: Update branding config for client-specific exports
3. **Chart Customization**: Modify chart colors to match company branding
4. **Excel Formulas**: Clients can edit Excel exports and recalculate
5. **Print Preview**: Use browser print preview to check layout before printing

---

## 🤝 Contributing

If you'd like to enhance export features:

1. Add new chart types in `chart-generator.ts`
2. Extend PDF formatting in `pdf-export.ts`
3. Add Excel features in `excel-export.ts`
4. Improve print styles in `print-styles.ts`
5. Test thoroughly with different data scenarios

---

## 📄 License

Part of Analysis Buddy V2 - Commercial Real Estate Lease Analysis Application

---

**Questions or Issues?**
Contact: [Your Support Email]
Documentation: [Your Docs URL]

