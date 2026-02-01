import { api } from ".";
import { ApiResponse } from "../types/type";

// CSV row structure based on the backend interface
export interface CSVRow {
  product_name: string;
  bahan_name: string;
  warna_name: string;
  warna_hex_code?: string;
  warna_code?: string;
  product_code?: string;
  product_description?: string;
}

// Request interface
export interface HierarchicalBulkUploadRequest {
  csv_data: CSVRow[];
}

// Error interface
export interface HierarchicalBulkUploadError {
  row_index: number;
  entity_type: 'product' | 'bahan' | 'warna' | 'unknown';
  entity_name: string;
  error: string;
}

// Result interface
export interface HierarchicalBulkUploadResult {
  total_rows: number;
  
  // Product statistics
  products: {
    total_attempted: number;
    total_created: number;
    total_skipped: number;
  };
  
  // Bahan statistics
  bahans: {
    total_attempted: number;
    total_created: number;
    total_skipped: number;
  };
  
  // Warna statistics
  warnas: {
    total_attempted: number;
    total_created: number;
    total_skipped: number;
  };
  
  // Error tracking
  errors: HierarchicalBulkUploadError[];
}

// API function for hierarchical bulk upload
export const hierarchicalBulkUpload = async (
  request: HierarchicalBulkUploadRequest
): Promise<ApiResponse<HierarchicalBulkUploadResult>> => {
  const { data } = await api.post("/hierarchical-bulk-upload", request);
  return data;
};

// Helper function to parse a CSV line respecting quoted values
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
};

// Utility function to parse CSV content into CSVRow array
export const parseHierarchicalCSV = (csvContent: string): CSVRow[] => {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) return [];

  // Remove BOM if present
  const firstLine = lines[0].replace(/^\uFEFF/, '');
  lines[0] = firstLine;

  // Check if first line is header (contains expected column names)
  const isHeader = firstLine.toLowerCase().includes('produk') || 
                   firstLine.toLowerCase().includes('product') ||
                   firstLine.toLowerCase().includes('bahan') ||
                   firstLine.toLowerCase().includes('warna');

  const dataLines = isHeader ? lines.slice(1) : lines;
  const csvRows: CSVRow[] = [];

  dataLines.forEach((line, index) => {
    if (line.trim() === '') return; // Skip empty lines

    // Parse CSV line properly respecting quoted values
    const columns = parseCSVLine(line);
    
    if (columns.length >= 3) { // Minimum required: product, bahan, warna
      const productNames = columns[0] || '';
      const bahanName = columns[1] || '';
      const warnaName = columns[2] || '';
      const warnaHexCode = columns[3] || undefined;
      const warnaCode = columns[4] || undefined;
      const productCode = columns[5] || undefined;
      const productDescription = columns[6] || undefined;

      // Handle multiple products separated by commas within the product_name field
      if (productNames && bahanName && warnaName) {
        // Split product names by comma and trim each
        const individualProducts = productNames.split(',').map(name => name.trim()).filter(name => name.length > 0);
        
        // Create a separate CSV row for each product
        individualProducts.forEach(productName => {
          const csvRow: CSVRow = {
            product_name: productName,
            bahan_name: bahanName,
            warna_name: warnaName,
            warna_hex_code: warnaHexCode,
            warna_code: warnaCode,
            product_code: productCode,
            product_description: productDescription,
          };
          csvRows.push(csvRow);
        });
      }
    }
  });

  return csvRows;
};