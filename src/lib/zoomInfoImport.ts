/**
 * ZoomInfo Import Utilities
 * Handles parsing CSV and Excel files from ZoomInfo and mapping to Prospect model
 */

import ExcelJS from "exceljs";
import type { Prospect } from "./types/prospect";
import { nanoid } from "nanoid";

export interface ColumnMapping {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  linkedIn?: string;
}

export interface ImportResult {
  success: boolean;
  prospects: Prospect[];
  errors: string[];
  warnings: string[];
}

/**
 * Common ZoomInfo column name variations
 */
const COLUMN_VARIANTS = {
  firstName: ["first name", "firstname", "given name", "name", "first"],
  lastName: ["last name", "lastname", "surname", "family name", "last"],
  email: ["email", "email address", "e-mail", "work email", "email address 1"],
  phone: ["phone", "phone number", "mobile", "work phone", "direct phone", "phone 1", "mobile phone"],
  company: ["company", "company name", "organization", "employer", "company 1"],
  title: ["title", "job title", "position", "role", "job function"],
  linkedIn: ["linkedin", "linkedin url", "linkedin profile", "linkedin profile url"],
};

/**
 * Detect column mapping from headers
 */
export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());

  // Find matches for each field
  Object.entries(COLUMN_VARIANTS).forEach(([field, variants]) => {
    const index = lowerHeaders.findIndex(header => 
      variants.some(variant => header.includes(variant))
    );
    if (index !== -1) {
      mapping[field as keyof ColumnMapping] = headers[index];
    }
  });

  return mapping;
}

/**
 * Parse CSV file
 */
export async function parseCSV(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          reject(new Error('CSV file is empty'));
          return;
        }

        // Parse header
        const headers = parseCSVLine(lines[0]);
        
        // Parse rows
        const rows: Record<string, string>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          if (values.length === 0) continue; // Skip empty rows
          
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || '';
          });
          rows.push(row);
        }
        
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read CSV file'));
    reader.readAsText(file);
  });
}

/**
 * Parse CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Parse Excel file
 */
export async function parseExcel(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        
        // Get first worksheet
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          reject(new Error('Excel file has no worksheets'));
          return;
        }

        // Get headers from first row
        const headerRow = worksheet.getRow(1);
        const headers: string[] = [];
        headerRow.eachCell((cell, colNumber) => {
          headers[colNumber - 1] = cell.value?.toString() || '';
        });

        // Parse rows
        const rows: Record<string, string>[] = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header row
          
          const rowData: Record<string, string> = {};
          headers.forEach((header, index) => {
            const cell = row.getCell(index + 1);
            rowData[header] = cell.value?.toString()?.trim() || '';
          });
          
          // Only add non-empty rows
          if (Object.values(rowData).some(val => val)) {
            rows.push(rowData);
          }
        });
        
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read Excel file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Map ZoomInfo row to Prospect
 */
export function mapZoomInfoToProspect(
  row: Record<string, string>,
  mapping: ColumnMapping
): Prospect {
  // Combine first and last name
  const firstName = mapping.firstName ? row[mapping.firstName] || '' : '';
  const lastName = mapping.lastName ? row[mapping.lastName] || '' : '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 
                   (mapping.firstName ? row[mapping.firstName] : '') ||
                   Object.values(row).find(val => val && !val.includes('@') && val.length > 2) || 
                   'Unknown';

  const email = mapping.email ? row[mapping.email] : '';
  const phone = mapping.phone ? row[mapping.phone] : '';
  const company = mapping.company ? row[mapping.company] : '';
  const title = mapping.title ? row[mapping.title] : '';
  const linkedIn = mapping.linkedIn ? row[mapping.linkedIn] : '';

  // Clean phone number (remove non-digits except +)
  const cleanedPhone = phone.replace(/[^\d+]/g, '');

  const now = new Date().toISOString();

  return {
    id: nanoid(),
    contact: {
      name: fullName,
      company: company || undefined,
      email: email || undefined,
      phone: cleanedPhone || undefined,
      title: title || undefined,
      linkedIn: linkedIn || undefined,
    },
    status: "New",
    source: "ZoomInfo",
    priority: "Medium",
    followUps: [],
    notes: '',
    activities: [
      {
        id: nanoid(),
        timestamp: now,
        type: "note",
        description: "Imported from ZoomInfo",
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Validate prospect data
 */
export function validateProspectData(prospect: Prospect): { valid: boolean; error?: string } {
  if (!prospect.contact.name || prospect.contact.name.trim() === '') {
    return { valid: false, error: 'Name is required' };
  }
  
  if (!prospect.contact.email && !prospect.contact.phone) {
    return { valid: false, error: 'Email or phone is required' };
  }
  
  if (prospect.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prospect.contact.email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
}

/**
 * Import prospects from file
 */
export async function importZoomInfoFile(
  file: File,
  mapping?: ColumnMapping
): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prospects: Prospect[] = [];

  try {
    // Parse file based on extension
    const fileName = file.name.toLowerCase();
    let rows: Record<string, string>[];
    
    if (fileName.endsWith('.csv')) {
      rows = await parseCSV(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      rows = await parseExcel(file);
    } else {
      return {
        success: false,
        prospects: [],
        errors: ['Unsupported file format. Please use CSV or Excel (.xlsx) files.'],
        warnings: [],
      };
    }

    if (rows.length === 0) {
      return {
        success: false,
        prospects: [],
        errors: ['File contains no data rows.'],
        warnings: [],
      };
    }

    // Detect column mapping if not provided
    const headers = Object.keys(rows[0]);
    const detectedMapping = mapping || detectColumnMapping(headers);

    // Check if we have at least name mapping
    if (!detectedMapping.firstName && !detectedMapping.lastName) {
      warnings.push('Could not detect name columns. Some prospects may have missing names.');
    }

    // Map rows to prospects
    rows.forEach((row, index) => {
      try {
        const prospect = mapZoomInfoToProspect(row, detectedMapping);
        const validation = validateProspectData(prospect);
        
        if (validation.valid) {
          prospects.push(prospect);
        } else {
          errors.push(`Row ${index + 2}: ${validation.error} (${prospect.contact.name || 'Unknown'})`);
        }
      } catch (error) {
        errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    return {
      success: prospects.length > 0,
      prospects,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      prospects: [],
      errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      warnings: [],
    };
  }
}

